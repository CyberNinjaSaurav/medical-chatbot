import os
import threading
import uuid
from collections import defaultdict
from typing import DefaultDict, Dict, List

import google.generativeai as genai
from dotenv import load_dotenv
from flask_cors import CORS
from flask import Flask, request, render_template, send_from_directory, session
from langchain_pinecone import PineconeVectorStore

from src.helper import download_hugging_face_embeddings
from src.prompt import system_prompt


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
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST_DIR = os.path.join(BASE_DIR, "frontend", "dist")
FRONTEND_ASSETS_DIR = os.path.join(FRONTEND_DIST_DIR, "assets")

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


def query_clinical_guidelines(query: str) -> List[str]:
    return retriever_tool(query)


def _build_context(retrieved_chunks: List[str]) -> str:
    if not retrieved_chunks:
        return "No relevant documents found."
    return "\n\n".join(f"[Doc {idx}] {chunk}" for idx, chunk in enumerate(retrieved_chunks, start=1))


def _extract_text(response) -> str:
    if response is None:
        return "I could not generate a response at the moment. Please try again."

    # `response.text` may raise ValueError when Gemini returns no valid text Part.
    try:
        text = getattr(response, "text", None)
        if isinstance(text, str) and text.strip():
            return text.strip()
    except ValueError:
        pass

    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        part_texts = []
        for part in parts:
            part_text = getattr(part, "text", None)
            if part_text and str(part_text).strip():
                part_texts.append(str(part_text).strip())
        if part_texts:
            return "\n".join(part_texts)

    blocked_by_safety = False
    for candidate in candidates:
        finish_reason = str(getattr(candidate, "finish_reason", "")).upper()
        if "SAFETY" in finish_reason or "BLOCK" in finish_reason:
            blocked_by_safety = True
            break
        for rating in (getattr(candidate, "safety_ratings", None) or []):
            if getattr(rating, "blocked", False):
                blocked_by_safety = True
                break
        if blocked_by_safety:
            break

    if blocked_by_safety:
        return (
            "I cannot provide a response to that request because it was blocked by safety filters. "
            "Please rephrase your question with neutral clinical wording."
        )
    return "I could not generate a response at the moment. Please try again."


MEDICAL_KEYWORDS = {
    "pain", "fever", "cough", "cold", "infection", "rash", "nausea", "vomit",
    "diarrhea", "headache", "dizzy", "fatigue", "blood pressure", "sugar",
    "diabetes", "asthma", "heart", "chest", "stroke", "cancer", "tumor",
    "medication", "medicine", "drug", "dose", "tablet", "antibiotic",
    "treatment", "therapy", "symptom", "diagnosis", "doctor", "hospital",
    "clinic", "surgery", "protocol", "interaction", "side effect", "allergy",
}

SMALL_TALK_PATTERNS = {
    "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
    "how are you", "thanks", "thank you",
}


def _is_small_talk_or_non_medical(query: str) -> bool:
    normalized = query.strip().lower()
    if not normalized:
        return True
    if normalized in SMALL_TALK_PATTERNS:
        return True
    return not any(keyword in normalized for keyword in MEDICAL_KEYWORDS)


def ai_agent(query: str) -> str:
    session_id = _get_session_id()
    history = _get_chat_history(session_id)

    if _is_small_talk_or_non_medical(query):
        answer = (
            "Hello. I can assist with medical questions and clinical guidance. "
            "How can I help you medically today?"
        )
        _append_memory(session_id, "user", query)
        _append_memory(session_id, "assistant", answer)
        return answer

    retrieved_docs = query_clinical_guidelines(query)
    if not retrieved_docs:
        answer = (
            "I do not have sufficient specific clinical data to advise safely on this at this time. "
            "Please consult a licensed physician for a proper evaluation."
        )
        _append_memory(session_id, "user", query)
        _append_memory(session_id, "assistant", answer)
        return answer

    chat_history_str = _format_chat_history(history)
    retrieved_context_str = _build_context(retrieved_docs)

    final_prompt = (
        f"System:\n{system_prompt}\n\n"
        f"Previous Conversation:\n{chat_history_str}\n\n"
        f"Context:\n{retrieved_context_str}\n\n"
        f"User:\n{query}"
    )

    try:
        response = model.generate_content(final_prompt)
        answer = _extract_text(response)
    except Exception:
        app.logger.exception("Gemini generation failed")
        answer = "I ran into an issue generating a response right now. Please try again in a moment."

    _append_memory(session_id, "user", query)
    _append_memory(session_id, "assistant", answer)
    return answer


@app.route("/")
def index():
    if os.path.isfile(os.path.join(FRONTEND_DIST_DIR, "index.html")):
        return send_from_directory(FRONTEND_DIST_DIR, "index.html")
    return render_template("index.html")


@app.route("/get", methods=["GET", "POST"])
def chat():
    json_data = request.get_json(silent=True) or {}
    msg = (
        json_data.get("msg")
        or request.form.get("msg")
        or request.args.get("msg")
        or ""
    ).strip()
    if not msg:
        return "Please enter a message."
    return ai_agent(msg)


@app.route("/assets/<path:filename>")
def frontend_assets(filename: str):
    if os.path.isdir(FRONTEND_ASSETS_DIR):
        return send_from_directory(FRONTEND_ASSETS_DIR, filename)
    return "Frontend assets not found. Run `npm run build` inside `frontend/`.", 404


@app.route("/<path:filename>")
def serve_frontend_file(filename: str):
    
    file_path = os.path.join(FRONTEND_DIST_DIR, filename)
    if os.path.isfile(file_path):
        return send_from_directory(FRONTEND_DIST_DIR, filename)

    
    if not filename.startswith("get") and os.path.isfile(os.path.join(FRONTEND_DIST_DIR, "index.html")):
        return send_from_directory(FRONTEND_DIST_DIR, "index.html")
    return "Not found", 404

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
