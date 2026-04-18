import logging
import os
import threading
from collections import defaultdict
from typing import DefaultDict, Dict, List

import google.generativeai as genai
import requests

logger = logging.getLogger("medical-agent")


class MedicalAgent:
    def __init__(self, google_api_key: str, mcp_base_url: str) -> None:
        if not google_api_key:
            raise ValueError("GOOGLE_API_KEY is required")

        genai.configure(api_key=google_api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")
        self.mcp_base_url = mcp_base_url.rstrip("/")
        self.max_memory_messages = int(os.getenv("CHAT_MEMORY_LIMIT", "40"))
        self.memory_store: DefaultDict[str, List[Dict[str, str]]] = defaultdict(list)
        self.lock = threading.Lock()

    def _get_history(self, session_id: str) -> List[Dict[str, str]]:
        with self.lock:
            return list(self.memory_store[session_id])

    def _append_memory(self, session_id: str, role: str, content: str) -> None:
        with self.lock:
            self.memory_store[session_id].append({"role": role, "content": content})
            self.memory_store[session_id] = self.memory_store[session_id][-self.max_memory_messages :]

    def _format_history(self, history: List[Dict[str, str]]) -> str:
        if not history:
            return "No prior conversation."
        return "\n".join(f"{item['role'].title()}: {item['content']}" for item in history)

    def _extract_text(self, response: object) -> str:
        if response is None:
            return "I could not generate a response. Please try again."

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
            collected: List[str] = []
            for part in parts:
                part_text = getattr(part, "text", None)
                if part_text and str(part_text).strip():
                    collected.append(str(part_text).strip())
            if collected:
                return "\n".join(collected)

        return "I could not generate a response. Please try again."

    def retrieve_context(self, query: str, top_k: int = 3) -> List[str]:
        endpoint = f"{self.mcp_base_url}/tool/retrieve"
        try:
            resp = requests.post(endpoint, json={"query": query, "top_k": top_k}, timeout=20)
            resp.raise_for_status()
            payload = resp.json()
            chunks = payload.get("chunks", [])
            if not isinstance(chunks, list):
                return []
            return [str(chunk).strip() for chunk in chunks if str(chunk).strip()]
        except Exception:
            logger.exception("MCP retrieval request failed")
            return []

    def _build_prompt(self, history: List[Dict[str, str]], context_chunks: List[str], user_query: str) -> str:
        history_text = self._format_history(history)
        if context_chunks:
            context_text = "\n\n".join(
                f"[Document {i}] {chunk}" for i, chunk in enumerate(context_chunks, start=1)
            )
        else:
            context_text = "No retrieval context found."

        return (
            "You are a medical assistant chatbot. "
            "Provide clinically cautious, non-diagnostic guidance. "
            "If uncertain, say what is unknown and advise consulting a licensed clinician.\n\n"
            f"Conversation History:\n{history_text}\n\n"
            f"Retrieved Context:\n{context_text}\n\n"
            f"User Query:\n{user_query}\n\n"
            "Answer in clear and concise language."
        )

    def generate_response(self, session_id: str, user_query: str) -> str:
        history = self._get_history(session_id)
        context_chunks = self.retrieve_context(user_query, top_k=3)
        prompt = self._build_prompt(history, context_chunks, user_query)

        try:
            response = self.model.generate_content(prompt)
            answer = self._extract_text(response)
        except Exception:
            logger.exception("Gemini generation failed")
            answer = "I ran into a generation issue. Please try again in a moment."

        self._append_memory(session_id, "user", user_query)
        self._append_memory(session_id, "assistant", answer)
        return answer
