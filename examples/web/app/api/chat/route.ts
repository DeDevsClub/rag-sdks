// Vercel AI SDK utilities for streaming responses and core message types
import { CoreMessage, streamText } from "ai";
// DataStax Astra DB client for vector database operations
import { DataAPIClient } from "@datastax/astra-db-ts";
// Loads environment variables from .env file
import "dotenv/config";
// Official OpenAI Node.js SDK, used here for generating embeddings
import OpenAI from "openai";
// Type definitions for OpenAI chat completion messages (used for system prompt construction)
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
// Vercel AI SDK's OpenAI provider for seamless integration with streamText
import { openai } from "@ai-sdk/openai";

// --- Environment Variable Setup ---
// Retrieve environment variables and ensure they are defined.
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
  // If any are missing, throw an error to prevent startup with invalid configuration
  // This ensures the application fails fast if not configured properly.
  throw new Error(
    "Missing one or more required environment variables: ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN, OPENAI_API_KEY"
  );
}

// --- Client Initialization ---
// Initialize OpenAI client, primarily for generating embeddings for the user's query.
const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY!,
});

// Initialize Astra DB client using the application token for authentication.
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
// Connect to the specific Astra database instance using the provided API endpoint.
// This 'db' object will be used to interact with collections.
const db = client.db(ASTRA_DB_API_ENDPOINT!);

// --- API Route Handler (POST) ---
// This default export handles POST requests to the /api/chat endpoint.
// It's designed to process incoming chat messages, retrieve context, and stream responses.
export default async function POST(request: Request) {
  try {
    // Parse the JSON request body to extract the 'messages' array.
    // These messages are expected to conform to the Vercel AI SDK's CoreMessage type.
    const { messages }: { messages: CoreMessage[] } = await request.json();
    // Extract the most recent message from the conversation history.
    // This message's content will be used to generate embeddings for context retrieval.
    const latestMessageCore = messages[messages.length - 1];

    // Basic validation: Ensure the latest message exists, its content is a string, and it's not empty.
    if (
      !latestMessageCore ||
      typeof latestMessageCore.content !== "string" ||
      latestMessageCore.content.trim() === ""
    ) {
      // [if] validation fails,
      return new Response(
        // [then]return a 400 Bad Request response with an error message.
        JSON.stringify({ error: "Invalid or empty latest message content" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    // Safely cast the latest message content to a string for further processing.
    const latestMessageContent = latestMessageCore.content as string;

    // --- Context Retrieval from Astra DB (RAG) ---
    // Initialize 'docContext' which will store the retrieved context from the vector database.
    let docContext = "";
    try {
      // Inner try-catch for the database interaction part.
      // [1] Generate an embedding for the user's latest message content.
      // This embedding will be used to find similar documents in the Astra DB vector collection.
      const embedding = await openaiClient.embeddings.create({
        model: "text-embedding-3-small",
        input: latestMessageContent,
        // encoding_format: "float", // Default, so optional
      });
      // console.log(embedding.data[0].embedding); // For debugging

      // [2] Access the specified Astra DB collection using the collection name and keyspace (namespace).
      const collection = await db.collection(ASTRA_DB_COLLECTION!, {
        keyspace: ASTRA_DB_NAMESPACE!,
      });
      // [3] Perform a vector search (similarity search) in the collection.
      // The search is ordered by the cosine similarity of the document vectors to the query embedding.
      const cursor = collection.find(
        {}, // Use empty object for no filter
        {
          sort: { $vector: embedding.data[0].embedding }, // Sort results by vector similarity to the query embedding.
          limit: 10, // Retrieve the top 10 most relevant documents.
          projection: { text: 1 }, // Only fetch the 'text' field from these documents to save bandwidth/processing.
        }
      );
      // [4] Convert the search results (cursor) into an array of document objects.
      const documents = await cursor.toArray();
      // [5] Extract the 'text' field from each retrieved document.
      const docsMap = documents?.map((doc) => doc.text);

      // [6] Concatenate the text content of all retrieved documents into a single string.
      // A separator is used to distinguish between different document contexts.
      docContext = docsMap.join("\n\n---\n\n");
      // console.log({ docContext });
    } catch (error) {
      // Catch any errors that occur during the context retrieval process.
      console.error("Error retrieving context from Astra DB:", error); // Log the error for debugging.
      docContext = ""; // Ensure docContext remains empty if context retrieval fails, so the AI knows no context is available.
    }

    // --- System Prompt Construction ---
    // Prepare the system prompt for the language model.
    // This prompt includes instructions, the retrieved 'docContext', and the user's latest question.
    // Structuring the prompt this way helps the AI to ground its answer in the provided context.
    const systemMessageForOpenAI: ChatCompletionMessageParam = {
      role: "system",
      content: `You are an AI assistant. Use the provided context to answer the user's questions.
If the context doesn't contain the answer, state that the information is not available in the provided documents.
----------------
START CONTEXT
${docContext}
END CONTEXT
----------------
QUESTION: ${latestMessageContent}
----------------
`, // End of the system prompt string.
    };

    // --- AI Stream Generation using Vercel AI SDK ---
    // Use the Vercel AI SDK's `streamText` utility to get a streaming response from the language model.
    const stream = streamText({
      model: openai("gpt-4o"),
      system: systemMessageForOpenAI.content as string, // Provide the detailed system prompt constructed above.
      maxTokens: 512, // Limit the maximum number of tokens in the generated response.
      temperature: 0.3, // Set the sampling temperature (lower means more deterministic, higher means more creative).
      maxRetries: 5, // Configure the number of retries in case of transient API errors.
      messages: messages, // Pass the entire conversation history (CoreMessage array) to the model.
    });
    // Return the AI's response as a streaming Next.js Response.
    // The `stream.response` property directly provides a compatible Response object for Next.js App Router.
    return stream.response;
  } catch (error) {
    console.error("Error in POST /api/chat:", error); // Log the unexpected error.
    // Return a generic 500 Internal Server Error response to the client.
    // Return a generic 500 Internal Server Error response
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
