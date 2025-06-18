# Kong API Key Authentication

This project secures the gateway using Kong's `key-auth` plugin. Follow these steps to create a consumer and generate a key for the frontend:

1. Ensure the gateway is running. From the `services` directory:
   ```bash
   docker compose up --build gateway
   ```
2. Create a consumer named `frontend`:
   ```bash
   curl -X POST http://localhost:8001/consumers -d username=frontend
   ```
3. Generate an API key for that consumer:
   ```bash
   curl -X POST http://localhost:8001/consumers/frontend/key-auth
   ```
   The response includes a JSON payload containing a `key` field.
4. Copy the value of `key` and set it as `VITE_API_KEY` in your environment or `.env` file:
   ```bash
   VITE_API_KEY=<your-key>
   ```

If the frontend is started without a valid key, requests through the gateway will result in **401 Unauthorized** or **403 Forbidden** errors.
