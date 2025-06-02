// src/retriever.ts
import { VectorStore, EmbeddingModel } from './vector-store'; // Assuming interfaces are here
import { Document } from './data-loader';

/**
 * @interface RetrieverConfig
 * Configuration for the retriever.
 */
export interface RetrieverConfig {
  vectorStore: VectorStore;
  embeddingModel: EmbeddingModel; // Model to embed the query
  topK?: number; // Number of results to retrieve
  // Add other config like re-ranking options, etc.
}

/**
 * @class Retriever
 * Handles the process of taking a query, embedding it, and retrieving relevant documents.
 */
export class Retriever {
  private vectorStore: VectorStore;
  private embeddingModel: EmbeddingModel;
  private topK: number;

  constructor(config: RetrieverConfig) {
    this.vectorStore = config.vectorStore;
    this.embeddingModel = config.embeddingModel;
    this.topK = config.topK || 5; // Default to 5 results
    console.log(`Retriever initialized. Will fetch top ${this.topK} results.`);
  }

  /**
   * Retrieves relevant documents for a given query string.
   * @param query string The user's query.
   * @returns Promise<Document[]>
   */
  async retrieve(query: string): Promise<Document[]> {
    console.log(`Retrieving documents for query: "${query}"`);

    // 1. Embed the query
    const [queryEmbedding] = await this.embeddingModel.generateEmbeddings([query]);
    if (!queryEmbedding) {
      console.error('Failed to generate query embedding.');
      return [];
    }
    console.log('Query embedded successfully.');

    // 2. Perform similarity search in the vector store
    const relevantDocuments = await this.vectorStore.similaritySearch(queryEmbedding, this.topK);
    console.log(`Retrieved ${relevantDocuments.length} documents.`);

    // 3. Optionally, re-rank or process documents further
    // For now, just return them

    return relevantDocuments;
  }

  /**
   * Formats retrieved documents into a context string for the LLM.
   * @param documents Document[]
   * @returns string
   */
  formatContext(documents: Document[]): string {
    return documents.map(doc => doc.content).join('\n\n---\n\n');
  }
}

// Example Usage (for testing)
// async function testRetriever() {
//   // Mock EmbeddingModel and VectorStore for testing
//   class MockEmbeddingModel implements EmbeddingModel {
//     name = 'mock-model';
//     async generateEmbeddings(texts: string[]): Promise<number[][]> {
//       return texts.map(text => Array(10).fill(Math.random()));
//     }
//   }
//
//   class MockVectorStore extends VectorStore {
//     constructor() {
//       super({ provider: 'in-memory' });
//     }
//     async similaritySearch(queryEmbedding: number[], topK: number): Promise<Document[]> {
//       return [
//         { id: 'res1', content: 'Mocked result 1 based on query.', metadata: { score: 0.9 } },
//         { id: 'res2', content: 'Mocked result 2, also relevant.', metadata: { score: 0.8 } },
//       ].slice(0, topK);
//     }
//     async addDocuments(documents: Document[]): Promise<void> { /* no-op for mock */ }
//   }
//
//   const embeddingModel = new MockEmbeddingModel();
//   const vectorStore = new MockVectorStore();
//   // Add some dummy docs to the mock store if its addDocuments was functional
//   // await vectorStore.addDocuments([{id: 'test', content: 'test content'}]);
//
//   const retriever = new Retriever({
//     vectorStore,
//     embeddingModel,
//     topK: 2,
//   });
//
//   const query = 'What is RAG?';
//   const results = await retriever.retrieve(query);
//   console.log(`Results for "${query}":`, results);
//   console.log('Formatted Context:', retriever.formatContext(results));
// }
//
// testRetriever();
