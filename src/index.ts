// RAG SDK Entry Point

console.log("RAG SDK Initializing...");

export const version = "0.0.1";

export function helloSDK(): string {
  return "Hello from RAG SDK! Version: " + version;
}

// Export core components, classes, and interfaces
export * from './data-loader';
export * from './vector-store';
export * from './retriever';
export * from './llm';
export * from './pipeline';

// You might want to export specific key interfaces/classes directly for easier access
// For example:
// export { RAGPipeline, RAGPipelineConfig } from './pipeline';
// export { DataLoader, Document, DataSourceConfig } from './data-loader';
// export { VectorStore, VectorStoreConfig, EmbeddingModel } from './vector-store';
// export { Retriever, RetrieverConfig } from './retriever';
// export { LLM, LLMConfig, LLMResponse } from './llm';
