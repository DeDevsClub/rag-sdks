# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup for a TypeScript Node.js RAG SDK.
  - `package.json`: Project metadata, scripts (build, start, dev), and initial dependencies (`typescript`, `ts-node`, `@types/node`).
  - `tsconfig.json`: TypeScript compiler configuration for ES2020 target, CommonJS modules, and output to `dist` directory.
- Core SDK component structure in `src/` directory:
  - `index.ts`: Main SDK entry point, exporting all core components.
  - `data-loader.ts`: Placeholder `DataLoader` class and `Document`, `DataSourceConfig` interfaces.
  - `vector-store.ts`: Placeholder `VectorStore` class and `VectorStoreConfig`, `EmbeddingModel` interfaces.
  - `retriever.ts`: Placeholder `Retriever` class and `RetrieverConfig` interface.
  - `llm.ts`: Placeholder `LLM` class and `LLMConfig`, `LLMResponse` interfaces.
  - `pipeline.ts`: Placeholder `RAGPipeline` class and `RAGPipelineConfig` interface for orchestrating the RAG flow.
- `ARCHITECTURE.MD`: Document outlining the basic architecture and core components of the RAG SDK.
- `INSTRUCTIONS.MD`: Detailed instructions for project setup, building the SDK, and running example tests.
- `examples/` directory for usage examples.
  - `examples/basic-test.ts`: A basic script demonstrating the initialization and usage of the `RAGPipeline` with mock components.
- `.gitignore` file with common Node.js and OS-specific ignores.
- This `CHANGELOG.md` file.
- Preference for `pnpm` as the package manager recorded and used.
- Next.js web example application (`examples/web`) demonstrating a RAG chat interface:
  - Integrates Vercel AI SDK for chat streaming (`useChat` hook).
  - Features an API route (`/api/chat/route.ts`) using OpenAI SDK for embeddings, Astra DB for vector search, and Vercel AI SDK (`@ai-sdk/openai`) for LLM streaming.
  - Includes frontend components (`prompt.tsx`, `page.tsx`) and styling (`globals.css`) for the chat UI.
  - `package.json` in `examples/web` updated with `ai`, `@ai-sdk/openai`, `@ai-sdk/react`, and `openai` dependencies.
  - Basic `.gitignore` and an empty `tsconfig.json` added to `examples/web`.
- `scripts/update.ts`: A script to fetch content from specified URLs, generate embeddings, and store them in Astra DB, supplementing `seed.ts`.
- `update` script in the root `package.json` for running `scripts/update.ts`.
- Root project dependencies: `@langchain/community`, `langchain`, `puppeteer` to support web scraping and text splitting in scripts.

### Changed
- Updated `src/index.ts` to export all core SDK components and interfaces.
- Switched to using `pnpm` for package management (`pnpm install`, `pnpm run build`).
- `ARCHITECTURE.md`: Updated conceptual code examples to TypeScript and aligned content with the current technology stack (Vercel AI SDK, specific OpenAI models, Astra DB client).
- `examples/web/app/api/chat/route.ts`: Refactored significantly to use the official OpenAI Node.js SDK for embeddings and the Vercel AI SDK (`streamText`) for chat completions, including environment variable validation and detailed system prompt construction.
- `examples/web/globals.css`: Enhanced chat UI styling, implemented a scrollable message area with custom scrollbars.
- `examples/web/components/prompt.tsx`: Revised prompt suggestions for the chat interface.
- `examples/web/app/page.tsx`: Improved UI for handling empty message states and displaying loading indicators during message streaming.

### Fixed
- Resolved linting errors in `package.json` related to JSON syntax.
- Resolved TypeScript linting errors in `src/index.ts` regarding ambiguous exports of `EmbeddingModel` by adjusting `src/pipeline.ts`.
- Corrected commenting style in `src/retriever.ts` example block to prevent linting issues.
- Addressed file creation issues for `src` directory by using `mkdir` command explicitly.
- Resolved TypeScript type errors related to streaming response handling in `examples/web/app/api/chat/route.ts` by using `stream.toDataStreamResponse()`.
- Corrected syntax errors in `examples/web/app/api/chat/route.ts` caused by duplicated lines.
- Ensured correct import of `OpenAI` client from the `openai` package (v5.x) in `examples/web/app/api/chat/route.ts`.

### Removed
- (No explicit removals of features in this initial setup)

## [0.0.1] - 2025-06-01
- Placeholder for the first official release. To be updated when version 0.0.1 is tagged.
