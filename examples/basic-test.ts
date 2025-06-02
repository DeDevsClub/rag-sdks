// examples/basic-test.ts
import {
  RAGPipeline,
  VectorStore,
  LLM,
  Document,
  EmbeddingModel as PipelineEmbeddingModel, // Alias to avoid confusion if this file had its own EmbeddingModel
} from '../src'; // Import from src for ts-node, or from 'rag-sdk' if published/linked

// 1. Define a Mock Embedding Model (as we don't have a real one configured yet)
class MockEmbeddingModel implements PipelineEmbeddingModel {
  name = 'mock-sdk-embedder';
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    console.log(`MockEmbeddingModel: Generating embeddings for ${texts.length} texts.`);
    // Return simple, predictable embeddings for testing
    return texts.map(text => text.split('').map(char => char.charCodeAt(0) % 100).slice(0, 10)); // Arbitrary 10-dim embedding
  }
}

async function main() {
  console.log('--- Running Basic RAG SDK Test ---');

  // 2. Initialize components with mock/basic configurations
  const embeddingModel = new MockEmbeddingModel();

  const vectorStore = new VectorStore(
    { provider: 'in-memory' }, // Using the in-memory store for this basic test
    // No API key needed for mock embedding model used by VectorStore's default
  );

  // We need to ensure the VectorStore uses our mock model for adding docs if they aren't pre-embedded
  // Or, pre-embed them with our mock model before adding.
  // For simplicity, let's assume VectorStore's internal addDocuments will use its configured model if docs lack embeddings.
  // If VectorStore was more complex, we might pass the model to it or its addDocuments method.

  const llm = new LLM({
    provider: 'openai', // This will use the dummy LLM implementation
    modelName: 'mock-gpt-3.5-turbo',
    apiKey: 'dummy-key-not-used-by-mock',
  });

  // 3. Create the RAG Pipeline instance
  const pipeline = new RAGPipeline({
    vectorStore,
    retrieverEmbeddingModel: embeddingModel, // Use our mock model for query embedding
    llm,
    retrieverTopK: 2,
  });

  // 4. Prepare and add some sample documents
  const sampleDocuments: Document[] = [
    {
      id: 'doc1',
      content: 'The RAG SDK helps build applications that retrieve information and generate answers.',
      metadata: { category: 'sdk-features' },
    },
    {
      id: 'doc2',
      content: 'Key components include data loaders, vector stores, retrievers, and LLM integrations.',
      metadata: { category: 'sdk-architecture' },
    },
    {
      id: 'doc3',
      content: 'This example demonstrates a basic query using the RAG pipeline with mock components.',
      metadata: { category: 'sdk-example' },
    },
  ];

  // Embed documents using our mock model before adding, to ensure consistency
  for (const doc of sampleDocuments) {
    const [embedding] = await embeddingModel.generateEmbeddings([doc.content]);
    doc.embedding = embedding;
  }

  await pipeline.addDocuments(sampleDocuments);
  console.log('\nSample documents added to the vector store.');

  // 5. Make a query
  const query = 'What are the key components of the RAG SDK?';
  console.log(`\nMaking query: "${query}"`);

  const response = await pipeline.query(query);

  console.log('\n--- Query Result ---');
  console.log('Response Text:', response.text);
  if (response.metadata) {
    console.log('Response Metadata:', response.metadata);
  }

  // Test streaming (if implemented and desired)
  // console.log('\n--- Streaming Query Result ---');
  // process.stdout.write('Streamed Response: ');
  // for await (const chunk of pipeline.queryStream(query)) {
  //   process.stdout.write(chunk);
  // }
  // process.stdout.write('\n');

  console.log('\n--- Basic RAG SDK Test Complete ---');
}

main().catch(error => {
  console.error('Error during basic test:', error);
  process.exit(1);
});
