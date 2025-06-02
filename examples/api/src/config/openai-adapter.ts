// scripts/reset.ts

import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import axios from 'axios';
import { JSDOM } from 'jsdom';
import { DataAPIClient } from '@datastax/astra-db-ts';
import OpenAI from 'openai';
import { EmbeddingModel } from "../config/vector-store";

// Retrieve environment variables
const {
  ASTRA_DB_NAMESPACE, // Astra DB namespace (keyspace)
  ASTRA_DB_COLLECTION,  // Astra DB collection name
  ASTRA_DB_API_ENDPOINT, // Astra DB API endpoint URL
  ASTRA_DB_APPLICATION_TOKEN, // Astra DB application token for authentication
  OPENAI_API_KEY, // OpenAI API key
  OPENAI_EMBEDDING_MODEL_NAME = 'text-embedding-3-small',
  URLS_TO_PROCESS,
} = process.env;

// Validate essential environment variables
if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is missing or empty.');
  process.exit(1);
}

// (Similar to the one in scripts/test.ts or could be imported if centralized)
export class OpenAIEmbeddingAdapter implements EmbeddingModel {
    private openai: OpenAI;
    public dimensions: number;
    public modelName: string;
    public name: string; // Added to satisfy EmbeddingModel interface
  
    constructor(apiKey: string, modelName: string = OPENAI_EMBEDDING_MODEL_NAME) {
      this.openai = new OpenAI({ apiKey });
      this.modelName = modelName;
      this.name = modelName; // Initialize the name property
      // Known dimensions for common OpenAI models (this might need to be fetched or configured)
      // For 'text-embedding-ada-002', it's 1536
      // For 'text-embedding-3-small', it's 1536
      // For 'text-embedding-3-large', it's 3072
      // Adjust this based on the modelName
      if (modelName === 'text-embedding-ada-002' || modelName === 'text-embedding-3-small') {
        this.dimensions = 1536;
      } else if (modelName === 'text-embedding-3-large') {
        this.dimensions = 3072;
      } else {
        console.warn(`Unknown dimensions for embedding model ${modelName}. Defaulting to 1536. Please verify.`);
        this.dimensions = 1536; // Default or throw error
      }
    }
  
    async generateEmbeddings(texts: string[]): Promise<number[][]> {
      const BATCH_SIZE = 100; // Number of texts to process in each API call
      const allEmbeddings: number[][] = [];
      console.log(`Total texts to embed: ${texts.length}, using batch size: ${BATCH_SIZE}`);
  
      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batchTextsRaw = texts.slice(i, i + BATCH_SIZE);
        // OpenAI recommends replacing newlines for better embedding quality
        const batchTexts = batchTextsRaw.map(text => text.replace(/\n/g, ' '));
        console.log(`Processing batch: ${i / BATCH_SIZE + 1} / ${Math.ceil(texts.length / BATCH_SIZE)}, size: ${batchTexts.length}`);
        try {
          const response = await this.openai.embeddings.create({
            model: this.modelName,
            input: batchTexts,
          });
          allEmbeddings.push(...response.data.map(embedding => embedding.embedding));
        } catch (error) {
          console.error(`Error generating OpenAI embeddings for batch starting at index ${i}:`, error);
          // Optionally, decide if you want to retry or collect partial results
          throw error; // Re-throwing to stop the process if a batch fails for now
        }
      }
      console.log(`Successfully generated embeddings for all ${texts.length} texts.`);
      return allEmbeddings;
    }
  }