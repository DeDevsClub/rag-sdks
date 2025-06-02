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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASTRA_DB_API_ENDPOINT = process.env.ASTRA_DB_API_ENDPOINT;
const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN;
const ASTRA_DB_COLLECTION = process.env.ASTRA_DB_COLLECTION;
const ASTRA_DB_NAMESPACE = process.env.ASTRA_DB_NAMESPACE;

if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable.');
}
if (
  !ASTRA_DB_API_ENDPOINT ||
  !ASTRA_DB_APPLICATION_TOKEN ||
  !ASTRA_DB_COLLECTION ||
  !ASTRA_DB_NAMESPACE
) {
  throw new Error(
    'Missing Astra DB environment variables: ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_COLLECTION, or ASTRA_DB_NAMESPACE are required.',
  );
}

// --- OpenAI Embedding Adapter ---
class OpenAIEmbeddingAdapter implements SDKEmbeddingModel {
  name = 'openai-embedding-adapter';
  private openai: OpenAI;
  private model: string;
  public readonly dimensions: number;

  constructor(apiKey: string, model = 'text-embedding-3-small') {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
    if (model === 'text-embedding-3-small') {
      this.dimensions = 1536;
    } else if (model === 'text-embedding-3-large') {
      this.dimensions = 3072;
    } else {
      this.dimensions = 1536; // Fallback
      console.warn(`Warning: Unknown embedding model '${model}'. Defaulting to 1536 dimensions. Ensure this is correct.`);
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
  // It uses an in-memory store and its own placeholder OpenAIEmbeddingModel internally,
  // regardless of the 'datastax_astra' provider setting or detailed config below.
  // The following config aligns with the current VectorStoreConfig interface to clear lint errors,
  // but true AstraDB integration via this VectorStore class requires enhancing `src/vector-store.ts`.
  const vectorStore = new VectorStore(
    {
      provider: 'datastax_astra', // This provider choice is not acted upon by the current VectorStore
      // apiKey: OPENAI_API_KEY!, // Pass API key if VectorStoreConfig and internal model use it
    },
    OPENAI_API_KEY! // Pass the API key string for the VectorStore's internal placeholder embedding model
  );
  // The `embeddingModel` (OpenAIEmbeddingAdapter) will be used by the RAGPipeline's Retriever for query embeddings.

  const llm = new LLM({
    provider: 'openai',
    modelName: 'gpt-4o',
    apiKey: OPENAI_API_KEY!,
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
