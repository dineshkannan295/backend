Deployment guide (Render backend)
--------------------------------

1) Create a Render service (Web Service):
   - Connect your GitHub repo containing this backend folder.
   - Choose Node environment.
   - Set build command: npm install
   - Set start command: npm start
   - Add the following environment variables in Render:
     - PROJECT_ID (Google Cloud project id)
     - LOCATION (e.g., us)
     - PROCESSOR_ID (Document AI processor id)
     - GOOGLE_KEY_FILE (set to /run/secrets/google-key.json if using Render secrets)
     - OPENAI_API_KEY (your OpenAI key)
     - OPENAI_MODEL (gpt-5.1 or gpt-4o if you prefer)

2) Google Key:
   - On Render you can add the google-key.json contents as a secret file and write it to ./google-key.json at runtime, or set GOOGLE_KEY_FILE to the path where you store it.

3) CORS:
   - The frontend (Vercel) will call the backend's /process endpoint. Ensure the backend URL is set in the frontend .env (NEXT_PUBLIC_BACKEND_URL).

4) Frontend (Vercel):
   - Create a repo for frontend folder.
   - Import into Vercel.
   - Add environment variable NEXT_PUBLIC_BACKEND_URL pointing to your Render service URL (e.g., https://your-service.onrender.com)

5) Testing:
   - Upload an invoice PDF from the frontend UI. The backend will process with Document AI and return extracted rows.
