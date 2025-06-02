import { DataAPIClient, Db } from '@datastax/astra-db-ts';
import OpenAI from 'openai';
import { config } from './configLoader.js';
import { Document as SDKDocument, OpenAIEmbeddingAdapter, LLM, OpenAILLM } from '../config/vector-store'; // Adjust path

const MAX_CONTEXT_DOCUMENTS = 5;

export interface ChatRequestBody {
  query: string;
  collectionName?: string;
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function processChatLogic(body: ChatRequestBody) {
  const { query, collectionName: collectionNameInput, chatHistory = [] } = body;

  if (!query || typeof query !== 'string') {
    throw new Error('Query is required and must be a string.');
  }

  const collectionName = collectionNameInput || config.astraDbCollection;

  console.log(`Processing chat for collection '${collectionName}' with query: "${query}"`);

  const openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
  const embeddingAdapter = new OpenAIEmbeddingAdapter({
    apiKey: config.openaiApiKey,
    modelName: config.openaiEmbeddingModelName,
    name: 'OpenAIEmbeddings',
  });

  const llm = new OpenAILLM({
    apiKey: config.openaiApiKey,
    modelName: config.openaiModelName,
    // Other LLM options can be added here if your OpenAILLM class supports them
  });

  // 1. Generate embedding for the user's query
  console.log('Generating embedding for query...');
  const queryEmbedding = (await embeddingAdapter.generateEmbeddings([query]))[0];
  if (!queryEmbedding) {
    throw new Error('Failed to generate embedding for the query.');
  }
  console.log('Query embedding generated.');

  // 2. Perform similarity search in AstraDB
  const astraClient = new DataAPIClient(config.astraDbApplicationToken, { dbHttpEndpoint: config.astraDbApiEndpoint });
  const db: Db = astraClient.db(config.astraDbKeyspace);
  
  // Assuming AstraDBStore is correctly imported and set up from your SDK
  const { AstraDBStore } = await import('../../../../src/vector-store.js'); // Dynamic import for ESM
  const vectorStore = new AstraDBStore(db, {
    keyspace: config.astraDbKeyspace,
    embeddingModel: embeddingAdapter, // For metadata or potential future use by the store
  });

  console.log(`Performing similarity search in collection '${collectionName}'...`);
  // The similaritySearch method in your SDK's AstraDBStore needs to handle this.
  // It should take the query embedding and return relevant documents.
  const similarDocuments = await vectorStore.similaritySearch(queryEmbedding, MAX_CONTEXT_DOCUMENTS, collectionName);
  console.log(`Found ${similarDocuments.length} similar documents.`);

  // 3. Construct the prompt for the LLM
  let context = similarDocuments.map(doc => doc.pageContent).join('\n\n---\n\n');
  if (similarDocuments.length === 0) {
    context = 'No relevant documents found in the knowledge base.';
  }

  const systemPrompt = `You are a helpful AI assistant. Answer the user's question based on the following context. If the context doesn't provide enough information, say so. Do not make up information not found in the context.\n\nContext:\n${context}`;
  
  const messagesForLLM: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];
  chatHistory.forEach(msg => messagesForLLM.push(msg));
  messagesForLLM.push({ role: 'user', content: query });

  // 4. Get response from LLM (streaming or full)
  console.log('Generating response from LLM...');
  // Assuming your LLM class has a generateStream or generate method compatible with OpenAI's SDK structure
  // For simplicity, this example shows a non-streaming response. Streaming would require different handling.
  const llmResponse = await llm.generate(messagesForLLM);
  console.log('LLM response received.');

  return {
    status: 'success',
    response: llmResponse, // This would be the text content from the LLM
    sourceDocuments: similarDocuments.map(doc => ({ pageContent: doc.pageContent, metadata: doc.metadata })),
  };
}
