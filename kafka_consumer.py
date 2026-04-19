import json
import logging
import os
import time
from typing import Any, Dict

from dotenv import load_dotenv
from kafka import KafkaConsumer

from agent import MedicalAgent
from kafka_producer import KafkaJSONProducer

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("medical-ai-worker")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
REQUEST_TOPIC = "medical-request"
RESPONSE_TOPIC = "medical-response"
AI_WORKER_GROUP_ID = os.getenv("AI_WORKER_GROUP_ID", "medical-ai-worker-group")
MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8000")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")


def _build_response_payload(
    correlation_id: str,
    session_id: str,
    answer: str = "",
    error: str = "",
) -> Dict[str, Any]:
    return {
        "correlation_id": correlation_id,
        "session_id": session_id,
        "answer": answer,
        "error": error,
        "timestamp": int(time.time()),
    }


def run_worker() -> None:
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY is required for AI worker")

    consumer = KafkaConsumer(
        REQUEST_TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        group_id=AI_WORKER_GROUP_ID,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )
    producer = KafkaJSONProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        client_id="medical-ai-worker-producer",
    )
    agent = MedicalAgent(google_api_key=GOOGLE_API_KEY, mcp_base_url=MCP_SERVER_URL)

    logger.info("AI worker started. Listening topic=%s", REQUEST_TOPIC)
    for message in consumer:
        payload = message.value or {}
        correlation_id = str(payload.get("correlation_id", "")).strip()
        session_id = str(payload.get("session_id", "")).strip() or "default-session"
        query = str(payload.get("query", "")).strip()

        if not correlation_id:
            logger.warning("Received message without correlation_id: %s", payload)
            continue

        if not query:
            response_payload = _build_response_payload(
                correlation_id=correlation_id,
                session_id=session_id,
                error="Empty query received.",
            )
            producer.send_message(RESPONSE_TOPIC, response_payload, key=correlation_id)
            continue

        logger.info("Processing request correlation_id=%s session_id=%s", correlation_id, session_id)
        try:
            answer = agent.generate_response(session_id=session_id, user_query=query)
            response_payload = _build_response_payload(
                correlation_id=correlation_id,
                session_id=session_id,
                answer=answer,
            )
        except Exception:
            logger.exception("AI worker failed for correlation_id=%s", correlation_id)
            response_payload = _build_response_payload(
                correlation_id=correlation_id,
                session_id=session_id,
                error="AI worker failed to generate a response.",
            )

        producer.send_message(RESPONSE_TOPIC, response_payload, key=correlation_id)
        logger.info("Published response correlation_id=%s", correlation_id)


if __name__ == "__main__":
    run_worker()
