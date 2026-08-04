import logging
import os
from pathlib import Path
from typing import Any, List

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from sentence_transformers import SentenceTransformer

try:
    from pinecone import Pinecone
except ImportError as exc:
    raise ImportError("pinecone package is required for Flask retrieval server") from exc

PROJECT_ROOT = Path(__file__).resolve().parents[3]

load_dotenv(PROJECT_ROOT / ".env")

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("mcp-server")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "medical-chatbot")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")


class PineconeRetriever:
    def __init__(self, api_key: str, index_name: str, embedding_model_name: str) -> None:
        if not api_key:
            raise ValueError("PINECONE_API_KEY is required")
        self.embedder = SentenceTransformer(embedding_model_name)
        self.pc = Pinecone(api_key=api_key)
        self.index = self.pc.Index(index_name)
        logger.info("Pinecone retriever initialized index=%s model=%s", index_name, embedding_model_name)

    def _extract_text(self, metadata: Any) -> str:
        if not isinstance(metadata, dict):
            return ""
        for key in ("text", "chunk", "content", "page_content"):
            value = metadata.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return ""

    def retrieve(self, query: str, top_k: int) -> List[str]:
        vector = self.embedder.encode(query, normalize_embeddings=True).tolist()
        result = self.index.query(
            vector=vector,
            top_k=top_k,
            include_metadata=True,
        )

        matches = []
        if isinstance(result, dict):
            matches = result.get("matches", [])
        else:
            matches = getattr(result, "matches", []) or []

        chunks: List[str] = []
        for match in matches:
            metadata = match.get("metadata") if isinstance(match, dict) else getattr(match, "metadata", {})
            text = self._extract_text(metadata)
            if text:
                chunks.append(text)
        return chunks


app = Flask(__name__)
retriever = PineconeRetriever(PINECONE_API_KEY, PINECONE_INDEX_NAME, EMBEDDING_MODEL_NAME)


@app.route("/health", methods=["GET"])
def health() -> dict:
    return jsonify({"status": "ok"})


@app.route("/tool/retrieve", methods=["POST"])
def tool_retrieve():
    payload = request.get_json(silent=True) or {}
    query = str(payload.get("query", "")).strip()
    if not query:
        return jsonify({"error": "query is required"}), 400

    try:
        top_k = int(payload.get("top_k", 3))
    except (TypeError, ValueError):
        return jsonify({"error": "top_k must be an integer"}), 400

    if top_k < 1 or top_k > 10:
        return jsonify({"error": "top_k must be between 1 and 10"}), 400

    try:
        chunks = retriever.retrieve(query, top_k)
        logger.info("MCP retrieve query='%s' chunks=%d", query, len(chunks))
        return jsonify({"query": query, "chunks": chunks})
    except Exception as exc:
        logger.exception("MCP retrieve failed")
        return jsonify({"error": f"Retrieve tool failed: {exc}"}), 500


if __name__ == "__main__":
    app.run(
        host=os.getenv("RETRIEVAL_HOST", "127.0.0.1"),
        port=int(os.getenv("RETRIEVAL_PORT", "8000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
