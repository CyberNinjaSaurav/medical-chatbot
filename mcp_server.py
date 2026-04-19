import logging
import os
from typing import Any, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

try:
    from pinecone import Pinecone
except ImportError as exc:
    raise ImportError("pinecone package is required for MCP retrieval server") from exc

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("mcp-server")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "medical-chatbot")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")


class RetrieveRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=3, ge=1, le=10)


class RetrieveResponse(BaseModel):
    query: str
    chunks: List[str]


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


app = FastAPI(title="Medical MCP Tool Server", version="1.0.0")
retriever = PineconeRetriever(PINECONE_API_KEY, PINECONE_INDEX_NAME, EMBEDDING_MODEL_NAME)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/tool/retrieve", response_model=RetrieveResponse)
def tool_retrieve(payload: RetrieveRequest) -> RetrieveResponse:
    try:
        chunks = retriever.retrieve(payload.query, payload.top_k)
        logger.info("MCP retrieve query='%s' chunks=%d", payload.query, len(chunks))
        return RetrieveResponse(query=payload.query, chunks=chunks)
    except Exception as exc:
        logger.exception("MCP retrieve failed")
        raise HTTPException(status_code=500, detail=f"Retrieve tool failed: {exc}") from exc
