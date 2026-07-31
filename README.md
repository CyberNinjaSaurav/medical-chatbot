# medical-chatbot
This project is a Flask-based medical chatbot that leverages Retrieval-Augmented Generation (RAG) to provide informative answers to user queries. It uses Google's Gemini API for its language model and Pinecone as a vector database for efficient document retrieval.

## Project structure

- `platform` - React/Vite user platform.
- `platform/legacy-web` - legacy Flask templates and static assets used as a fallback.
- `product/medical_chatbot/api` - Flask API service.
- `product/medical_chatbot/ai` - Gemini agent and Kafka worker.
- `product/medical_chatbot/retrieval` - FastAPI retrieval service.
- `product/medical_chatbot/indexing` - Pinecone indexing scripts.
- `product/medical_chatbot/core` - shared Python helpers and prompts.
- `product/medical_chatbot/messaging` - Kafka messaging helpers.

## Common commands

```powershell
pip install -e product
python -m medical_chatbot.api.app
python -m medical_chatbot.ai.worker
python -m uvicorn medical_chatbot.retrieval.mcp_server:app --host 127.0.0.1 --port 8000
cd platform
npm run dev
```

<img width="922" height="821" alt="image" src="https://github.com/user-attachments/assets/66415311-4f7c-4dd3-854b-2fefd9f52ad7" />
<img width="897" height="798" alt="image" src="https://github.com/user-attachments/assets/fc225f5c-6299-40f2-8417-5693fa35b118" />
<img width="873" height="798" alt="image" src="https://github.com/user-attachments/assets/229d4cc0-3b0c-429a-ac50-bce04f39adca" />


