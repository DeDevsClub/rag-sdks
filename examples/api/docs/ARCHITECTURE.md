# Next.js API Example Architecture

The example API is implemented using Next.js API Routes, which provides a simple and effective way to create server-side endpoints for handling HTTP requests. The API routes are located in the `examples/api` directory.

## API Endpoints

### Collection `Reset`

-   **Endpoint:** `POST /api/collection/reset`
-   **Description:** Clears an existing AstraDB collection (if it exists) and re-populates it with documents processed from a list of specified URLs. This is useful for initializing or completely refreshing the knowledge base.
-   **Request Body (JSON):**
    ```json
    {
      "urls": ["https://example.com/doc1", "https://anotherexample.com/doc2"], // Optional. Defaults to URLS_TO_PROCESS from .env if not provided.
      "collectionName": "my_custom_collection" // Optional. Defaults to ASTRA_DB_COLLECTION from .env if not provided.
    }
    ```
-   **Response Body (JSON - Success 200):**
    ```json
    {
      "status": "success",
      "message": "Collection 'my_custom_collection' reset and re-seeded successfully.",
      "collectionName": "my_custom_collection"
    }
    ```

### Collection `Seed`

-   **Endpoint:** `POST /api/collection/seed`
-   **Description:** Populates an existing AstraDB collection with documents processed from a list of specified URLs. This is useful for initializing the knowledge base.
-   **Request Body (JSON):**
    ```json
    {
      "urls": ["https://example.com/doc1", "https://anotherexample.com/doc2"], // Optional. Defaults to URLS_TO_PROCESS from .env if not provided.
      "collectionName": "my_custom_collection" // Optional. Defaults to ASTRA_DB_COLLECTION from .env if not provided.
    }
    ```
-   **Response Body (JSON - Success 200):**
    ```json
    {
      "status": "success",
      "message": "Collection 'my_custom_collection' seeded successfully.",
      "collectionName": "my_custom_collection"
    }
    ```

### Collection `Update`

-   **Endpoint:** `POST /api/collection/update`
-   **Description:** Updates an existing AstraDB collection with documents processed from a list of specified URLs. This is useful for updating the knowledge base.
-   **Request Body (JSON):**
    ```json
    {
      "urls": ["https://example.com/doc1", "https://anotherexample.com/doc2"], // Optional. Defaults to URLS_TO_PROCESS from .env if not provided.
      "collectionName": "my_custom_collection" // Optional. Defaults to ASTRA_DB_COLLECTION from .env if not provided.
    }
    ```
-   **Response Body (JSON - Success 200):**
    ```json
    {
      "status": "success",
      "message": "Collection 'my_custom_collection' updated successfully.",
      "collectionName": "my_custom_collection"
    }
    ```

---

### Chat

-   **Endpoint:** `POST /api/chat`
-   **Description:** Submits a user query to the RAG system. The API retrieves relevant documents from the vector store, augments the query with this context, and streams a response from the LLM.
-   **Request Body (JSON):**
    ```json
    {
      "query": "What are vector embeddings?",
      "collectionName": "my_custom_collection" // Optional. Defaults to ASTRA_DB_COLLECTION from .env.
      "chatHistory": [ // Optional. For maintaining conversation context.
        {"role": "user", "content": "Tell me about RAG."},
        {"role": "assistant", "content": "RAG stands for Retrieval Augmented Generation..."}
      ]
    }
    ```
-   **Response Body (JSON - Success 200):**
    ```json
    {
      "response": "Vector embeddings are numerical representations of text...",
      "sourceDocuments": [
        {"pageContent": "Text snippet from a relevant document...", "metadata": {"url": "source_url", "chunk_index": 0}},
        {"pageContent": "Another relevant text snippet...", "metadata": {"url": "source_url2", "chunk_index": 3}}
      ]
    }
    ```

### Error Response

-   **Response Body (JSON - Error 4xx/5xx):**
    ```json
    {
      "status": "error",
      "message": "A description of the error.",
      "details": "..." // Optional additional error details
    }
    ```

### Example cURL

```bash
    curl -X POST http://localhost:3000/api/collection/reset \
    -H "Content-Type: application/json" \
    -d '{
      "urls": ["https://docs.morpho.org/llms-full.txt"],
      "collectionName": "morpho_docs"
    }'
    ```
    