import { DataAPIClient, Db } from "@datastax/astra-db-ts";
import OpenAI from "openai";
import axios from "axios";
import { JSDOM } from "jsdom";
import { config } from "./configLoader.js"; // Using .js due to ESM module resolution in Node

// Assuming SDKDocument and OpenAIEmbeddingAdapter are part of your main RAG SDK
// Adjust the import path as necessary if your RAG SDK is structured differently or installed as a package.
// For a local monorepo setup, it might be like '../../../../src'
import { Document } from "../config/data-loader.js";
import { OpenAIEmbeddingAdapter } from "src/scripts/reset.js";
// import { OpenAIEmbeddingAdapter } from "../config/vector-store.js"; // Added for OpenAIEmbeddingAdapter

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const EMBEDDING_BATCH_SIZE = 100;

interface ProcessedDocument extends Document {
  embedding?: number[];
}

async function fetchWebPageContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    if (response.headers["content-type"]?.includes("text/html")) {
      const dom = new JSDOM(response.data);
      return dom.window.document.body.textContent || "";
    }
    return String(response.data); // Ensure it's a string
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    throw new Error(`Failed to fetch content from URL: ${url}`);
  }
}

function cleanText(text: string): string {
  return text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function chunkText(
  text: string,
  url: string,
  chunkSize: number,
  chunkOverlap: number
): Document[] {
  const documents: Document[] = [];
  for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
    const chunk = text.substring(i, i + chunkSize);
    documents.push({
      id: `doc_${url}_${documents.length}`, // Example ID generation, adjust as needed
      content: chunk,
      metadata: { url, chunk_index: documents.length },
    });
  }
  return documents;
}

export interface ProcessCollectionParams {
  urlsToProcessInput?: string[];
  collectionNameInput?: string;
  operation: "reset" | "seed" | "update";
}

export async function processCollectionLogic({
  urlsToProcessInput,
  collectionNameInput,
  operation,
}: ProcessCollectionParams) {
  const collectionName = collectionNameInput || config.astraDbCollection;
  const urlsToProcess =
    urlsToProcessInput && urlsToProcessInput.length > 0
      ? urlsToProcessInput
      : config.urlsToProcess;

  if (urlsToProcess.length === 0) {
    throw new Error("No URLs provided to process.");
  }

  console.log(
    `Starting operation '${operation}' for collection '${collectionName}' with URLs: ${urlsToProcess.join(
      ", "
    )}`
  );

  const embeddingAdapter = new OpenAIEmbeddingAdapter(config.openaiApiKey);

  const embeddingDimension = embeddingAdapter.dimensions;
  if (!embeddingDimension) {
    throw new Error("Could not determine embedding dimension from the model.");
  }

  const astraClient = new DataAPIClient(config.astraDbApplicationToken);
  const db: Db = astraClient.db(config.astraDbApiEndpoint, {
    keyspace: config.astraDbKeyspace,
  });

  if (operation === "reset") {
    try {
      console.log(`Attempting to drop collection '${collectionName}'...`);
      await db.dropCollection(collectionName);
      console.log(`Collection '${collectionName}' dropped successfully.`);
    } catch (e: any) {
      if (
        e.message &&
        (e.message.includes("does not exist") ||
          e.message.includes("Not found"))
      ) {
        console.log(
          `Collection '${collectionName}' does not exist, no need to drop.`
        );
      } else {
        console.warn(
          `Could not drop collection '${collectionName}': ${e.message}. This might be okay if creating next.`
        );
      }
    }
  }

  try {
    console.log(
      `Ensuring collection '${collectionName}' exists with dimension ${embeddingDimension}...`
    );
    await db.createCollection(collectionName, {
      vector: { dimension: embeddingDimension, metric: "cosine" },
      // checkExists: operation !== "reset", // For reset, we expect it to be gone or fail if it's there with wrong config
    });
    console.log(`Collection '${collectionName}' ensured/created.`);
  } catch (e: any) {
    throw new Error(
      `Failed to ensure/create collection '${collectionName}' with dimension ${embeddingDimension}: ${e.message}`
    );
  }

  // Assuming AstraDBStore is correctly imported and set up from your SDK
  // This part might need adjustment based on how AstraDBStore is implemented in your main SDK src
  const { VectorStore } = await import("../config/vector-store.js"); // Dynamic import for ESM
  const vectorStore = new VectorStore({
    provider: "datastax_astra",
    token: config.astraDbApplicationToken,
    endpoint: config.astraDbApiEndpoint,
    collectionName,
    keyspace: config.astraDbKeyspace,
    embeddingDimension,
  });

  let allSdkDocuments: Document[] = [];
  for (const url of urlsToProcess) {
    console.log(`Fetching content from: ${url}`);
    const rawContent = await fetchWebPageContent(url);
    if (!rawContent) {
      console.warn(`No content fetched from URL: ${url}. Skipping.`);
      continue;
    }
    const cleanedContent = cleanText(rawContent);
    const chunkedDocs = chunkText(
      cleanedContent,
      url,
      CHUNK_SIZE,
      CHUNK_OVERLAP
    );
    allSdkDocuments.push(...chunkedDocs);
    console.log(`Processed ${chunkedDocs.length} chunks from ${url}`);
  }

  if (allSdkDocuments.length === 0) {
    throw new Error("No processable content found from the provided URLs.");
  }

  console.log(`Total document chunks to process: ${allSdkDocuments.length}`);
  const documentsWithEmbeddings: ProcessedDocument[] = [];
  for (let i = 0; i < allSdkDocuments.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = allSdkDocuments.slice(i, i + EMBEDDING_BATCH_SIZE);
    const pageContents = batch.map((doc) => doc.content);
    console.log(
      `Generating embeddings for batch ${
        Math.floor(i / EMBEDDING_BATCH_SIZE) + 1
      } of ${Math.ceil(allSdkDocuments.length / EMBEDDING_BATCH_SIZE)} (size: ${
        batch.length
      })`
    );
    const embeddings = await embeddingAdapter.generateEmbeddings(pageContents);
    batch.forEach((doc, index) => {
      documentsWithEmbeddings.push({ ...doc, embedding: embeddings[index] });
    });
  }
  console.log(`Generated all ${documentsWithEmbeddings.length} embeddings.`);

  // The addDocuments method in your SDK's AstraDBStore needs to handle the actual insertion
  // including passing the pre-generated embeddings.
  console.log(
    `Adding ${documentsWithEmbeddings.length} documents to collection '${collectionName}'...`
  );
  await vectorStore.addDocuments(documentsWithEmbeddings);
  console.log(
    `Successfully added/updated ${documentsWithEmbeddings.length} documents in '${collectionName}'.`
  );

  let message = "";
  if (operation === "reset") {
    message = `Collection '${collectionName}' reset and re-seeded successfully.`;
  } else if (operation === "seed") {
    message = `Collection '${collectionName}' seeded successfully.`;
  } else {
    // update
    message = `Collection '${collectionName}' updated successfully.`;
  }

  return {
    status: "success",
    message,
    collectionName,
    documentsProcessed: documentsWithEmbeddings.length,
    urlsProcessed: urlsToProcess,
  };
}
