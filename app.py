import os
import threading
import uuid
from collections import defaultdict
from typing import DefaultDict, Dict, List

import google.generativeai as genai
from dotenv import load_dotenv
from flask import Flask, request, render_template, session
from langchain_pinecone import PineconeVectorStore

from src.helper import download_hugging_face_embeddings


load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "replace-with-a-secure-secret")

if not PINECONE_API_KEY:
    raise ValueError("Missing environment variable: PINECONE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("Missing environment variable: GOOGLE_API_KEY")

os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY

app = Flask(__name__)
app.secret_key = SECRET_KEY

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

embeddings = download_hugging_face_embeddings()
docsearch = PineconeVectorStore.from_existing_index(
    index_name="medical-chatbot",
    embedding=embeddings,
)
retriever = docsearch.as_retriever(search_type="similarity", search_kwargs={"k": 3})

# Per-session in-memory chat store: keeps recent turns during app runtime.
chat_memory_store: DefaultDict[str, List[Dict[str, str]]] = defaultdict(list)
memory_lock = threading.Lock()
MAX_MEMORY_MESSAGES = int(os.getenv("CHAT_MEMORY_LIMIT", "510"))


def _get_session_id() -> str:
    if "session_id" not in session:
        session["session_id"] = str(uuid.uuid4())
    return session["session_id"]


def _get_chat_history(session_id: str) -> List[Dict[str, str]]:
    with memory_lock:
        return list(chat_memory_store[session_id])


def _append_memory(session_id: str, role: str, content: str) -> None:
    with memory_lock:
        chat_memory_store[session_id].append({"role": role, "content": content})
        chat_memory_store[session_id] = chat_memory_store[session_id][-MAX_MEMORY_MESSAGES:]


def _format_chat_history(history: List[Dict[str, str]]) -> str:
    if not history:
        return "No previous conversation."
    return "\n".join(f"{item['role'].title()}: {item['content']}" for item in history)


def retriever_tool(query: str) -> List[str]:
    docs = retriever.invoke(query)
    return [doc.page_content.strip() for doc in docs if doc.page_content.strip()]


def _build_context(retrieved_chunks: List[str]) -> str:
    if not retrieved_chunks:
        return "No relevant documents found."
    return "\n\n".join(f"[Doc {idx}] {chunk}" for idx, chunk in enumerate(retrieved_chunks, start=1))


def _extract_text(response) -> str:
    text = getattr(response, "text", None)
    if text:
        return text.strip()
    return "I could not generate a response at the moment."


def ai_agent(query: str) -> str:
    session_id = _get_session_id()
    history = _get_chat_history(session_id)
    retrieved_docs = retriever_tool(query)

    chat_history_str = _format_chat_history(history)
    retrieved_context_str = _build_context(retrieved_docs)

    final_prompt = (
        f"Previous Conversation:\n{chat_history_str}\n\n"
        f"Context:\n{retrieved_context_str}\n\n"
        f"User:\n{query}"
    )

    response = model.generate_content(final_prompt)
    answer = _extract_text(response)

    _append_memory(session_id, "user", query)
    _append_memory(session_id, "assistant", answer)
    return answer


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/get", methods=["GET", "POST"])
def chat():
    msg = (request.form.get("msg") or request.args.get("msg") or "").strip()
    if not msg:
        return "Please enter a message."
    return ai_agent(msg)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
