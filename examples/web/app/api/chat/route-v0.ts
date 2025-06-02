import { embed, streamText, CoreMessage } from "ai"; // Using CoreMessage for structured chat messages
import { openai } from "@ai-sdk/openai"; // This will be available after pnpm add @ai-sdk/openai
import { DataAPIClient, Collection } from "@datastax/astra-db-ts";
import "dotenv/config";

// Retrieve environment variables and ensure they are defined
const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY, // Though @ai-sdk/openai uses it from env, good to have it checked
} = process.env;

if (
  !ASTRA_DB_NAMESPACE ||
  !ASTRA_DB_COLLECTION ||
  !ASTRA_DB_API_ENDPOINT ||
  !ASTRA_DB_APPLICATION_TOKEN ||
  !OPENAI_API_KEY // Ensure OpenAI key is also checked for clarity
) {
  throw new Error(
    "Missing one or more required environment variables: ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN, OPENAI_API_KEY"
  );
}

// Initialize Astra DB client
// Non-null assertions are used because we've checked for their existence above.
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(ASTRA_DB_API_ENDPOINT!);
let astraCollection: Collection; // Renamed to avoid conflict if 'collection' is used elsewhere

// Define model names (optional, but good for clarity)
const EMBEDDING_MODEL_ID = "text-embedding-3-small";
const COMPLETION_MODEL_ID = "gpt-3.5-turbo";

export async function POST(request: Request) {
  try {
    // 1. Get Astra DB collection
    astraCollection = await db.collection(ASTRA_DB_COLLECTION!);
    console.log(`Connected to collection: ${ASTRA_DB_COLLECTION!}`);

    // 2. Extract messages from the request body
    // The Vercel AI SDK expects a specific format for messages,
    // typically an array of objects with 'role' and 'content'.
    const { messages }: { messages: CoreMessage[] } = await request.json(); // Expecting CoreMessage structure

    const lastMessage = messages[messages.length - 1];
    let userMessageContent: string | undefined;

    if (lastMessage?.role === 'user') {
      if (typeof lastMessage.content === 'string') {
        userMessageContent = lastMessage.content;
      } else {
        // Handle cases where user message might be structured (e.g., multimodal)
        // For this example, we'll assume simple text or join parts if it's an array.
        // This part might need refinement based on actual input structure for multimodal.
        userMessageContent = Array.isArray(lastMessage.content) 
          ? lastMessage.content.filter(part => part.type === 'text').map(part => (part as { type: 'text'; text: string }).text).join('') 
          : undefined;
      }
    }

    if (typeof userMessageContent !== 'string' || userMessageContent.trim() === '') {
      return new Response(JSON.stringify({ error: "No valid user message content provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Generate embedding for the user's message
    const { embedding } = await embed({
      model: openai.embedding(EMBEDDING_MODEL_ID),
      value: userMessageContent,
    });

    if (!embedding) {
      return new Response(JSON.stringify({ error: "Failed to generate query embedding" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Retrieve context from Astra DB
    const retrievedDocs = await astraCollection.find(
      {},
      {
        sort: { $vector: embedding },
        limit: 5,
        projection: { text: 1 },
      }
    ).toArray();
    
    const context = retrievedDocs.map((doc: any) => doc.text).join("\n\n---\n\n");

    // 5. Construct the system prompt
    const systemPrompt = `You are a helpful AI assistant. Use the following context to answer the user's question.
If the context doesn't contain the answer, say you don't know. Do not make up information.
Context:
${context}`;

    // 6. Call streamText
    const result = await streamText({
      model: openai.chat(COMPLETION_MODEL_ID),
      system: systemPrompt,
      messages: messages, // Pass the full message history
    });

    // 7. Stream response
    return result; // Return the StreamTextResult object directly

  } catch (error) {
    console.error("Error in POST /api/chat:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Ensure a Response object is returned for errors too
    return new Response(JSON.stringify({ error: "Internal server error", details: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Optional: Add a GET handler for testing or health checks
export async function GET() {
  return new Response(JSON.stringify({ message: "Chat API is running with Vercel AI SDK" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}