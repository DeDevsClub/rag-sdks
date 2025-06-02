import 'dotenv/config'; // Load environment variables
import {
  RAGPipeline,
  VectorStore,
  LLM,
  Document,
  EmbeddingModel as SDKEmbeddingModel, // Alias for clarity
  LLMResponse, // Assuming LLMResponse type is exported from src
} from '../src';
import OpenAI from 'openai';
import { DataAPIClient } from '@datastax/astra-db-ts'; // Corrected import based on seed.ts and lint error 4a2b584a-e6a1-4ecd-8d98-8dec1f69e454

// Assuming the common pattern used in other project files like seed.ts is intended:

// --- Environment Variable Validation ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_MODEL_NAME = process.env.OPENAI_MODEL_NAME || 'gpt-3.5-turbo'; // Default if not set
const ASTRA_DB_API_ENDPOINT = process.env.ASTRA_DB_API_ENDPOINT!;
const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_COLLECTION = process.env.ASTRA_DB_COLLECTION!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE || process.env.ASTRA_DB_NAMESPACE!; // Prefer KEYSPACE, fallback to NAMESPACE for compatibility

if (!OPENAI_API_KEY) {
  console.error('Missing required environment variable: OPENAI_API_KEY');
  process.exit(1);
}
if (!ASTRA_DB_API_ENDPOINT || !ASTRA_DB_APPLICATION_TOKEN || !ASTRA_DB_COLLECTION || !ASTRA_DB_KEYSPACE) {
  console.error('Missing one or more required AstraDB environment variables:');
  if (!ASTRA_DB_API_ENDPOINT) console.error(' - ASTRA_DB_API_ENDPOINT');
  if (!ASTRA_DB_APPLICATION_TOKEN) console.error(' - ASTRA_DB_APPLICATION_TOKEN');
  if (!ASTRA_DB_COLLECTION) console.error(' - ASTRA_DB_COLLECTION');
  if (!ASTRA_DB_KEYSPACE) console.error(' - ASTRA_DB_KEYSPACE (or ASTRA_DB_NAMESPACE)');
  process.exit(1);
}

// --- OpenAI Embedding Adapter ---
class OpenAIEmbeddingAdapter implements SDKEmbeddingModel {
  public name: string; // Added to satisfy EmbeddingModel interface
  private openai: OpenAI;
  private model: string;
  public readonly dimensions: number;

  constructor(apiKey: string, modelName: string = 'text-embedding-ada-002') {
    this.openai = new OpenAI({ apiKey });
    this.name = modelName; // Initialize the name property
    this.model = modelName; // Initialize this.model for generateEmbeddings
    // Known dimensions for common OpenAI models
    if (modelName === 'text-embedding-ada-002' || modelName === 'text-embedding-3-small') {
      this.dimensions = 1536;
    } else if (modelName === 'text-embedding-3-large') {
      this.dimensions = 3072;
    } else {
      console.warn(`Unknown dimensions for embedding model ${modelName}. Defaulting to 1536.`);
      this.dimensions = 1536; 
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: texts.map(text => text.replace(/\n/g, ' ')),
    });
    return response.data.map(item => item.embedding);
  }
}

// Extend LLMResponse type for this test if sourceDocuments isn't formally in src/types yet
interface TestLLMResponse extends LLMResponse {
  sourceDocuments?: Document[];
}

async function main() {
  console.log('--- Running Integration RAG SDK Test ---');

  const embeddingModel = new OpenAIEmbeddingAdapter(OPENAI_API_KEY!); 

  // NOTE: The VectorStore in `../src` is currently a placeholder.
  // The VectorStore is initialized for 'datastax_astra'.
  // The actual AstraDB client setup (token, endpoint, collection, keyspace) happens inside the VectorStore class
  // based on the provider and its internal handling of environment variables or a more complex config object in a real scenario.
  // For this test, we rely on the VectorStore's current implementation which might use placeholders or simplified setup.
  // The RAGPipeline will provide the `retrieverEmbeddingModel` which is the actual model used for generating embeddings for retrieval.
  const vectorStore = new VectorStore(
    { // Config for VectorStore
      provider: 'datastax_astra',
      // The actual VectorStore implementation in src/vector-store.ts will handle
      // its own configuration for AstraDB (e.g. from env vars or a more detailed config object passed here).
      // For the test script, we are focusing on the RAGPipeline's behavior with components.
      // If we were to pass a full config here, it would look like:
      token: ASTRA_DB_APPLICATION_TOKEN!,
      endpoint: ASTRA_DB_API_ENDPOINT!,
      collectionName: ASTRA_DB_COLLECTION!,
      keyspace: ASTRA_DB_KEYSPACE!, 
      embeddingDimension: embeddingModel.dimensions
    },
    // The second argument to VectorStore constructor (embeddingModel) is optional and used if VectorStore
    // needs to create its own embeddings. In RAGPipeline, we provide a dedicated retrieverEmbeddingModel.
  );

  console.log(`Using AstraDB Collection: ${ASTRA_DB_COLLECTION} in Keyspace: ${ASTRA_DB_KEYSPACE}`);
  // The `embeddingModel` (OpenAIEmbeddingAdapter) will be used by the RAGPipeline's Retriever for query embeddings.

  const llm = new LLM({
    provider: 'openai',
    modelName: OPENAI_MODEL_NAME,
    apiKey: OPENAI_API_KEY!,
    temperature: 0.7, // Optional: example temperature
  });

  const pipeline = new RAGPipeline({
    vectorStore,
    retrieverEmbeddingModel: embeddingModel,
    llm,
    retrieverTopK: 3,
  });

  const sampleDocuments: Document[] = [
    {
      id: 'test_doc_sdk_intro',
      content: 'The RAG SDK is designed to simplify building retrieval-augmented generation applications.',
      metadata: { category: 'sdk-introduction', source: 'test-script' },
    },
    {
      id: 'test_doc_sdk_features',
      content: 'Core features include flexible data loading, multiple vector store integrations, and configurable LLM usage.',
      metadata: { category: 'sdk-features', source: 'test-script' },
    },
    {
      id: 'test_doc_sdk_testing',
      content: 'This integration test uses OpenAI for embeddings and LLM, and Astra DB for vector storage.',
      metadata: { category: 'sdk-testing', source: 'test-script' },
    },
  ];

  console.log('\nEmbedding documents using OpenAIEmbeddingAdapter...');
  const documentsToAdd: Document[] = [];
  for (const doc of sampleDocuments) {
    if (doc.content) {
      const [embedding] = await embeddingModel.generateEmbeddings([doc.content]);
      documentsToAdd.push({ ...doc, embedding });
    }
  }
  if (documentsToAdd.length > 0) {
    // Documents are added with their real embeddings (from OpenAIEmbeddingAdapter)
    // However, the VectorStore from src currently uses a placeholder in-memory store.
    await pipeline.addDocuments(documentsToAdd);
    console.log(`${documentsToAdd.length} sample documents added to the RAGPipeline (which uses the placeholder VectorStore).`);
  }

  const query = 'What are the core features of the RAG SDK?';
  console.log(`\nMaking query: "${query}"`);

  try {
    const response = await pipeline.query(query) as TestLLMResponse; // Cast to include sourceDocuments

    console.log('\n--- Query Result ---');
    console.log('Response Text:', response.text);
    if (response.metadata) {
      console.log('Response Metadata:', JSON.stringify(response.metadata, null, 2));
    }
    // Access source documents, addressing lint 14d10894-f192-41eb-bf83-419f7eb7635e and related
    if (response.sourceDocuments && Array.isArray(response.sourceDocuments)) {
      console.log('Retrieved Source Documents:');
      response.sourceDocuments.forEach((doc: Document, index: number) => {
        console.log(`  [${index + 1}] ID: ${doc.id}, Content: ${doc.content.substring(0, 100)}...`);
        console.log(`      Metadata: ${JSON.stringify(doc.metadata, null, 2)}`);
      });
    }
  } catch (error) {
    console.error('Error during pipeline query:', error);
  }

  const unrelatedQuery = 'Tell me about the history of space travel.';
  console.log(`\nMaking unrelated query: "${unrelatedQuery}"`);
  try {
    const response = await pipeline.query(unrelatedQuery) as TestLLMResponse;
    console.log('\n--- Unrelated Query Result ---');
    console.log('Response Text:', response.text);
    if (response.sourceDocuments && Array.isArray(response.sourceDocuments)) {
        if (response.sourceDocuments.length === 0) {
            console.log('No relevant source documents found, as expected.');
        } else {
            console.warn('Unexpected source documents found for unrelated query:', response.sourceDocuments);
        }
    } else if (response.metadata) {
      // Fallback if sourceDocuments isn't on response but metadata might give clues
      console.log('Response Metadata for unrelated query:', JSON.stringify(response.metadata, null, 2));
    }
  } catch (error) {
    console.error('Error during unrelated pipeline query:', error);
  }

  console.log('\n--- Integration RAG SDK Test Complete ---');
}

main().catch(error => {
  console.error('Error during integration test execution:', error);
  process.exit(1);
});
