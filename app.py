import json
import logging
import os
import threading
import time
import uuid
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_from_directory, session
from flask_cors import CORS
from kafka import KafkaConsumer

from kafka_producer import KafkaJSONProducer

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("medical-flask-api")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
REQUEST_TOPIC = "medical-request"
RESPONSE_TOPIC = "medical-response"
RESPONSE_TIMEOUT_SECONDS = float(os.getenv("RESPONSE_TIMEOUT_SECONDS", "30"))
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "replace-with-a-secure-secret")


class KafkaResponseListener:
    def __init__(self, bootstrap_servers: str, response_topic: str) -> None:
        self._consumer = KafkaConsumer(
            response_topic,
            bootstrap_servers=bootstrap_servers.split(","),
            auto_offset_reset="latest",
            enable_auto_commit=True,
            group_id=os.getenv("FLASK_KAFKA_GROUP_ID", "medical-flask-response-group"),
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
            consumer_timeout_ms=1000,
        )
        self._cv = threading.Condition()
        self._responses: Dict[str, Dict[str, Any]] = {}
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        logger.info("Started response listener for topic=%s", response_topic)

    def _run(self) -> None:
        while self._running:
            try:
                for msg in self._consumer:
                    payload = msg.value
                    correlation_id = payload.get("correlation_id")
                    if not correlation_id:
                        logger.warning("Skipping response without correlation_id: %s", payload)
                        continue
                    with self._cv:
                        self._responses[correlation_id] = payload
                        self._cv.notify_all()
                    logger.info("Received response from Kafka correlation_id=%s", correlation_id)
            except Exception:
                logger.exception("Response listener loop failed; retrying in 2 seconds")
                time.sleep(2)

    def wait_for_response(self, correlation_id: str, timeout_seconds: float) -> Optional[Dict[str, Any]]:
        deadline = time.time() + timeout_seconds
        with self._cv:
            while correlation_id not in self._responses:
                remaining = deadline - time.time()
                if remaining <= 0:
                    return None
                self._cv.wait(timeout=remaining)
            return self._responses.pop(correlation_id, None)

    def close(self) -> None:
        self._running = False
        try:
            self._consumer.close()
        except Exception:
            logger.exception("Failed to close response consumer cleanly")


app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST_DIR = os.path.join(BASE_DIR, "frontend", "dist")
FRONTEND_ASSETS_DIR = os.path.join(FRONTEND_DIST_DIR, "assets")

producer = KafkaJSONProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    client_id="medical-flask-producer",
)
response_listener = KafkaResponseListener(
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    response_topic=RESPONSE_TOPIC,
)


def _get_session_id() -> str:
    if "session_id" not in session:
        session["session_id"] = str(uuid.uuid4())
    return session["session_id"]


@app.route("/")
def index():
    if os.path.isfile(os.path.join(FRONTEND_DIST_DIR, "index.html")):
        return send_from_directory(FRONTEND_DIST_DIR, "index.html")
    return render_template("index.html")


@app.route("/health", methods=["GET"])
def health() -> Any:
    return jsonify({"status": "ok"})


@app.route("/get", methods=["GET", "POST"])
def chat() -> Any:
    json_data = request.get_json(silent=True) or {}
    message = (
        json_data.get("msg")
        or request.form.get("msg")
        or request.args.get("msg")
        or ""
    ).strip()

    if not message:
        return jsonify({"error": "Please enter a message."}), 400

    correlation_id = str(uuid.uuid4())
    session_id = json_data.get("session_id") or _get_session_id()

    request_payload = {
        "correlation_id": correlation_id,
        "session_id": session_id,
        "query": message,
        "timestamp": int(time.time()),
    }

    try:
        producer.send_message(REQUEST_TOPIC, request_payload, key=correlation_id)
        logger.info("Published request correlation_id=%s session_id=%s", correlation_id, session_id)
    except Exception:
        logger.exception("Failed to publish request to Kafka")
        return jsonify({"error": "Unable to process request at the moment."}), 500

    response_payload = response_listener.wait_for_response(correlation_id, RESPONSE_TIMEOUT_SECONDS)
    if response_payload is None:
        logger.warning("Timed out waiting for response correlation_id=%s", correlation_id)
        return jsonify(
            {
                "error": "Timed out waiting for AI response.",
                "correlation_id": correlation_id,
                "session_id": session_id,
            }
        ), 504

    if response_payload.get("error"):
        return jsonify(response_payload), 500
    return jsonify(response_payload)


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
    app.run(host="0.0.0.0", port=5000, debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
