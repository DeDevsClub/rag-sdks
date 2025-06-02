import { DataAPIClient, Db } from '@datastax/astra-db-ts';
import OpenAI from 'openai';
import { config } from './configLoader.js';
import { OpenAIEmbeddingAdapter } from '../config/openai-adapter';
import { VectorStore } from '../config/vector-store';

const MAX_CONTEXT_DOCUMENTS = 5;

export interface ChatRequestBody {
  query: string;
  collectionName?: string;
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface ProcessedDocument extends Document {
  embedding?: number[];
}

export async function processChatLogic(body: ChatRequestBody) {
  const { query, collectionName: collectionNameInput, chatHistory = [] } = body;

  if (!query || typeof query !== 'string') {
    throw new Error('Query is required and must be a string.');
  }

  const collectionName = collectionNameInput || config.astraDbCollection;

  console.log(`Processing chat for collection '${collectionName}' with query: "${query}"`);

  const embeddingAdapter = new OpenAIEmbeddingAdapter(
    config.openaiApiKey!,
    config.openaiEmbeddingModelName!
    // name: 'OpenAIEmbeddings', // Remove if not part of your SDK's adapter constructor
  );

  const llm = new OpenAI({
    apiKey: config.openaiApiKey,
    // other options like temperature, max_tokens can be added if your OpenAILLM class supports them
  });

  // 1. Generate embedding for the user's query
  console.log('Generating embedding for query...');
  const queryEmbedding = (await embeddingAdapter.generateEmbeddings([query]))[0];
  if (!queryEmbedding) {
    throw new Error('Failed to generate embedding for the query.');
  }
  console.log('Query embedding generated.');

  // 2. Perform similarity search in AstraDB
  const astraClient = new DataAPIClient(config.astraDbApplicationToken);
  const db: Db = astraClient.db(config.astraDbApiEndpoint, { keyspace: config.astraDbKeyspace });
  
  // AstraDBStore is now imported statically from the main SDK
  const vectorStore = new VectorStore({
    provider: 'datastax_astra',
    token: config.astraDbApplicationToken,
    endpoint: config.astraDbApiEndpoint,
    collectionName: collectionName,
    keyspace: config.astraDbKeyspace,
    embeddingDimension: embeddingAdapter.dimensions,
  }, embeddingAdapter);

  console.log(`Performing similarity search in collection '${collectionName}'...`);
  // The similaritySearch method in your SDK's AstraDBStore needs to handle this.
  // It should take the query embedding and return relevant documents.
  const similarDocuments = await vectorStore.similaritySearch(queryEmbedding, MAX_CONTEXT_DOCUMENTS);
  console.log(`Found ${similarDocuments.length} similar documents.`);

  // 3. Construct the prompt for the LLM
  let context = similarDocuments.map(doc => `${doc?.metadata?.url}\n\n${doc?.content}`).join('\n\n---\n\n');
  if (similarDocuments.length === 0) {
    context = 'No relevant documents found in the knowledge base.';
  }

  const systemPrompt = `You are a helpful AI assistant. Answer the user's question based on the following context. If the context doesn't provide enough information, say so. Do not make up information not found in the context.\n\nContext:\n${context}`;
  
  const messagesForLLM: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];
  chatHistory.forEach((msg: { role: 'user' | 'assistant'; content: string }) => messagesForLLM.push(msg));
  messagesForLLM.push({ role: 'user', content: query });

  // 4. Get response from LLM (streaming or full)
  console.log('Generating response from LLM...');
  // Assuming your LLM class has a generateStream or generate method compatible with OpenAI's SDK structure
  // For simplicity, this example shows a non-streaming response. Streaming would require different handling.
  const llmResponse = await llm.chat.completions.create({
    model: config.openaiModelName,
    messages: messagesForLLM,
    max_tokens: 1000,
    temperature: 0.7,
    stream: true,
  });
  console.log('LLM response received.');

  return {
    status: 'success',
    response: llmResponse, // This would be the text content from the LLM
    sourceDocuments: similarDocuments.map(doc => ({
      content: doc.content,
      url: doc.metadata?.url,
      chunkIndex: doc.metadata?.chunk_index,
    })),
  };
}
