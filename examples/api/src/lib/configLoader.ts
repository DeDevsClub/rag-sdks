import dotenv from 'dotenv';
dotenv.config(); // Load .env file into process.env

export interface AppConfig {
  astraDbApiEndpoint: string;
  astraDbApplicationToken: string;
  astraDbKeyspace: string;
  astraDbCollection: string;
  openaiApiKey: string;
  openaiEmbeddingModelName: string;
  openaiModelName: string;
  urlsToProcess: string[];
  apiPort: number;
}

function getEnvVar(name: string, required: boolean = true, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (required && !value) {
    console.error(`Error: Environment variable ${name} is missing or empty.`);
    process.exit(1);
  }
  return value as string;
}

function getEnvVarAsArray(name: string, required: boolean = true, defaultValue?: string[]): string[] {
  const value = process.env[name];
  if (required && !value) {
    console.error(`Error: Environment variable ${name} is missing or empty.`);
    process.exit(1);
  }
  if (value) {
    return value.split(',').map(item => item.trim()).filter(item => item);
  }
  return defaultValue || [];
}

export function loadAppConfig(): AppConfig {
  return {
    astraDbApiEndpoint: getEnvVar('ASTRA_DB_API_ENDPOINT'),
    astraDbApplicationToken: getEnvVar('ASTRA_DB_APPLICATION_TOKEN'),
    astraDbKeyspace: getEnvVar('ASTRA_DB_KEYSPACE'),
    astraDbCollection: getEnvVar('ASTRA_DB_COLLECTION'),
    openaiApiKey: getEnvVar('OPENAI_API_KEY'),
    openaiEmbeddingModelName: getEnvVar('OPENAI_EMBEDDING_MODEL_NAME', true, 'text-embedding-3-small'),
    openaiModelName: getEnvVar('OPENAI_MODEL_NAME', true, 'gpt-3.5-turbo'),
    urlsToProcess: getEnvVarAsArray('URLS_TO_PROCESS', false, ['https://docs.datastax.com/en/astra-db-serverless/index.html']),
    apiPort: parseInt(getEnvVar('API_PORT', true, '8000'), 10),
  };
}

export const config = loadAppConfig();
