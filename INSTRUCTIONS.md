# INSTRUCTIONS

This document provides instructions on how to set up, build, test, and use the RAG SDK, including seeding data into a vector store.

## Prerequisites

- Node.js (version 20.x or later recommended)
- pnpm (version 9.x or later recommended, can be installed with `npm install -g pnpm`)
- Access to an OpenAI account (for API key)
- Access to a DataStax Astra DB instance (for vector storage)

## Setup

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <repository-url>
    cd rag-sdks
    ```

2.  **Install dependencies:**
    Use pnpm to install the project dependencies as defined in `package.json`.
    ```bash
    pnpm install
    ```
    This will also install `puppeteer`, which will attempt to download a compatible version of Chrome. If this fails due to permissions or network issues, you might need to resolve it manually (see Troubleshooting section).

3.  **Set up Environment Variables:**
    The SDK requires API keys and connection details for services like OpenAI and Astra DB. These are managed using a `.env` file.
    *   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    *   Edit the `.env` file and fill in your actual credentials. It contains the following variables:
        *   `ASTRA_DB_NAMESPACE`: Your Astra DB keyspace name (e.g., `default_keyspace`). **Ensure this keyspace exists in your Astra DB instance.**
        *   `ASTRA_DB_COLLECTION`: The name for the collection within your Astra DB keyspace where data will be stored (e.g., `docs`).
        *   `ASTRA_DB_API_ENDPOINT`: The API endpoint for your Astra DB.
        *   `ASTRA_DB_APPLICATION_TOKEN`: Your Astra DB application token.
        *   `OPENAI_API_KEY`: Your API key for OpenAI services.
    *   The `.env` file is included in `.gitignore` and should not be committed to the repository.

## Building the SDK

To compile the TypeScript source code into JavaScript (output to the `dist` directory), run:

```bash
pnpm run build
```
This command executes `tsc` using the configuration in `tsconfig.json`.

## Seeding and Updating the Vector Database

The project includes a script to populate your Astra DB vector store with sample data. The script (`scripts/seed.ts`) will:
1.  Scrape content from predefined web URLs (currently `https://docs.morpho.org/overview`).
2.  Split the scraped text into manageable chunks.
3.  Generate vector embeddings for these chunks using OpenAI's `text-embedding-3-small` model.
4.  Store these embeddings along with their text content in your Astra DB collection.

**To run the seed script:**

Ensure your `.env` file is correctly configured with your Astra DB and OpenAI credentials. Then run:
```bash
pnpm run seed
```
This command executes `ts-node scripts/seed.ts`.

To add more data from different URLs after the initial seed, or to update with new content, you can use the `update.ts` script:
```bash
pnpm run update
```
This script (`scripts/update.ts`) functions similarly to `seed.ts` but is intended for ongoing additions. You'll need to edit `scripts/update.ts` to specify the new URLs you want to process.

**Note:** The first time you run the seed script, it will attempt to create the specified collection in your Astra DB keyspace if it doesn't already exist.

## Running the Next.js Web Example (`examples/web`)

The project includes a functional Next.js web application in `examples/web` that demonstrates a Retrieval-Augmented Generation (RAG) chat interface. This example uses the Vercel AI SDK for streaming chat responses and connects to your Astra DB and OpenAI setup.

**To run the web example:**

1.  **Navigate to the web example directory:**
    ```bash
    cd examples/web
    ```

2.  **Install dependencies for the web example:**
    This example has its own `package.json`.
    ```bash
    pnpm install
    ```

3.  **Set up Environment Variables for the web example:**
    The web example also requires environment variables for Astra DB and OpenAI.
    *   Copy the example environment file within the `examples/web` directory:
        ```bash
        cp .env.example .env
        ```
    *   Edit `examples/web/.env` and fill in your credentials. These are the same credentials used by the root project's scripts (`ASTRA_DB_NAMESPACE`, `ASTRA_DB_COLLECTION`, `ASTRA_DB_API_ENDPOINT`, `ASTRA_DB_APPLICATION_TOKEN`, `OPENAI_API_KEY`).

4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    This will typically start the application on `http://localhost:3000`.

5.  **Open the application in your browser** and interact with the chat interface. It will use the data seeded into your Astra DB.

## Running the Basic Test Example (Mocked)

A basic test script is provided in `examples/basic-test.ts`. This script demonstrates how to initialize and use the RAG pipeline with mock components (it does not use the seeded data or live APIs).

To run the example:

1.  **Ensure you have built the SDK at least once** (as the example might eventually import from `dist` or rely on types being generated, though currently it imports from `src` for direct `ts-node` execution).

2.  **Execute the test script using `ts-node`:**
    ```bash
    pnpm exec ts-node examples/basic-test.ts
    ```
    Alternatively, if you add a script to `package.json` like `"test:basic": "ts-node examples/basic-test.ts"`, you can run `pnpm run test:basic`.

### Expected Output (Basic Test)

The `basic-test.ts` script will:
- Initialize mock versions of the `EmbeddingModel`, `VectorStore`, and `LLM`.
- Create a `RAGPipeline` instance.
- Add a few sample documents to the in-memory vector store.
- Make a query: "What are the key components of the RAG SDK?"
- Print the response from the mock LLM, which should be based on the retrieved mock context.

You should see console logs indicating these steps and the final mock-generated answer.

## Further Development

-   The core SDK components (`DataLoader`, `VectorStore`, `Retriever`, `LLM`, `RAGPipeline`) are located in the `src` directory.
-   Refer to `ARCHITECTURE.MD` for an overview of the intended SDK architecture and components.
-   To integrate real services and use the seeded data:
    1.  Explore the `examples/web` application to see a more complete RAG implementation using live API clients (`openai`, `@datastax/astra-db-ts`, Vercel AI SDK).
    2.  Implement or enhance the core SDK components in `src` based on patterns observed in the web example or your specific needs.
    3.  Modify `examples/basic-test.ts` if you need a simpler, non-web testbed for core SDK functionalities, or create new examples.
    4.  Ensure API keys and configurations are managed via `.env` files for both the root scripts and the `examples/web` application.

## Troubleshooting

-   **Astra DB Keyspace Error during seeding:** If the seed script reports "Unknown keyspace", ensure the `ASTRA_DB_NAMESPACE` specified in your `.env` file exists in your DataStax Astra DB account. The script creates collections, not keyspaces.
-   **Puppeteer/Chrome "Could not find Chrome" error during seeding:**
    *   This can happen if Puppeteer couldn't download Chrome during `pnpm install` (e.g., due to permissions on `~/.cache/puppeteer` or network issues).
    *   Try ensuring you have write permissions to `~/.cache/puppeteer` (`sudo chown -R $(whoami) ~/.cache/puppeteer`) and then reinstall: `pnpm remove puppeteer && pnpm add puppeteer`.
    *   Alternatively, try a manual browser install: `npx puppeteer browsers install chrome`.
-   **TypeScript errors during build:** Ensure your `tsconfig.json` is correctly configured and all types are installed (`pnpm install`).
-   **`ts-node` issues:** Make sure `ts-node` and `typescript` are listed in `devDependencies` in `package.json` and correctly installed.
