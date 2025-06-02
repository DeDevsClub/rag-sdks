
    ```env
    # AstraDB Configuration
    ASTRA_DB_API_ENDPOINT="your_astradb_api_endpoint"
    ASTRA_DB_APPLICATION_TOKEN="your_astradb_application_token"
    ASTRA_DB_COLLECTION="your_default_collection_name" # e.g., docs
    ASTRA_DB_KEYSPACE="your_astradb_keyspace" # e.g., default_keyspace

    # OpenAI Configuration
    OPENAI_API_KEY="your_openai_api_key"
    OPENAI_EMBEDDING_MODEL_NAME="text-embedding-3-small" # Or your preferred embedding model
    OPENAI_MODEL_NAME="gpt-3.5-turbo" # Or your preferred chat completion model

    # Default URLs for the reset/seeding process (comma-separated)
    URLS_TO_PROCESS="https://docs.morpho.org/llms-full.txt,https://docs.morpho.org/llms.txt"
    ```