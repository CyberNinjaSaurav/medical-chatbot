import json
import logging
import os
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_from_directory, session
from flask_cors import CORS
from kafka import KafkaConsumer
from werkzeug.utils import secure_filename

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

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CATALOG_FILE = DATA_DIR / "catalogue.json"
APPOINTMENTS_FILE = DATA_DIR / "appointments.json"
MEDICINE_ORDERS_FILE = DATA_DIR / "medicine_orders.json"
CATALOG_UPLOAD_DIR = BASE_DIR / "static" / "catalogue_uploads"
CATALOG_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

_store_lock = threading.Lock()


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


def _read_json_list(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
            if isinstance(data, list):
                return data
    except json.JSONDecodeError:
        logger.warning("Invalid JSON in %s. Resetting to empty list.", path)
    return []


def _write_json_list(path: Path, data: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


def _sanitize_catalog_item(payload: Dict[str, Any]) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "id": payload.get("id") or str(uuid.uuid4()),
        "name": str(payload.get("name", "")).strip(),
        "category": str(payload.get("category", "General")).strip() or "General",
        "description": str(payload.get("description", "")).strip(),
        "price": float(payload.get("price", 0) or 0),
        "stock": int(payload.get("stock", 0) or 0),
        "image_url": str(payload.get("image_url", "")).strip(),
        "created_at": payload.get("created_at") or now_iso,
        "updated_at": now_iso,
    }


def _parse_catalog_file(path: Path) -> List[Dict[str, Any]]:
    if path.suffix.lower() != ".json":
        raise ValueError("Only .json files are supported for bulk catalogue upload.")

    with path.open("r", encoding="utf-8") as uploaded_file:
        data = json.load(uploaded_file)

    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        raise ValueError("Uploaded JSON must be an object or an array of catalogue objects.")

    normalized_items = []
    for item in data:
        if not isinstance(item, dict):
            continue
        normalized = _sanitize_catalog_item(item)
        if normalized["name"]:
            normalized_items.append(normalized)
    return normalized_items


app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY
CORS(app)

FRONTEND_DIST_DIR = BASE_DIR / "frontend" / "dist"
FRONTEND_ASSETS_DIR = FRONTEND_DIST_DIR / "assets"

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
    if (FRONTEND_DIST_DIR / "index.html").is_file():
        return send_from_directory(str(FRONTEND_DIST_DIR), "index.html")
    return render_template("index.html")


@app.route("/health", methods=["GET"])
def health() -> Any:
    return jsonify({"status": "ok"})


@app.route("/api/catalog", methods=["GET"])
def get_catalog() -> Any:
    with _store_lock:
        items = _read_json_list(CATALOG_FILE)
    return jsonify({"items": items})


@app.route("/api/catalog/items", methods=["POST"])
def create_catalog_item() -> Any:
    payload = request.get_json(silent=True) or {}
    item = _sanitize_catalog_item(payload)

    if not item["name"]:
        return jsonify({"error": "name is required"}), 400

    with _store_lock:
        items = _read_json_list(CATALOG_FILE)
        items.append(item)
        _write_json_list(CATALOG_FILE, items)

    return jsonify(item), 201


@app.route("/api/catalog/upload", methods=["POST"])
def upload_catalog_files() -> Any:
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files uploaded. Use multipart/form-data with files."}), 400

    uploaded_items: List[Dict[str, Any]] = []
    errors: List[str] = []

    for file in files:
        filename = secure_filename(file.filename or "")
        if not filename:
            continue

        destination = CATALOG_UPLOAD_DIR / filename
        file.save(destination)

        try:
            uploaded_items.extend(_parse_catalog_file(destination))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{filename}: {exc}")

    if not uploaded_items and errors:
        return jsonify({"error": "No valid catalogue items found.", "details": errors}), 400

    with _store_lock:
        items = _read_json_list(CATALOG_FILE)
        items.extend(uploaded_items)
        _write_json_list(CATALOG_FILE, items)

    return jsonify({"uploaded_count": len(uploaded_items), "errors": errors}), 201


@app.route("/api/catalog/<item_id>", methods=["DELETE"])
def delete_catalog_item(item_id: str) -> Any:
    with _store_lock:
        items = _read_json_list(CATALOG_FILE)
        next_items = [item for item in items if item.get("id") != item_id]
        if len(next_items) == len(items):
            return jsonify({"error": "Catalogue item not found"}), 404
        _write_json_list(CATALOG_FILE, next_items)

    return jsonify({"status": "deleted", "id": item_id})


@app.route("/api/appointments", methods=["GET", "POST"])
def appointments() -> Any:
    if request.method == "GET":
        with _store_lock:
            data = _read_json_list(APPOINTMENTS_FILE)
        return jsonify({"items": data})

    payload = request.get_json(silent=True) or {}
    patient_name = str(payload.get("patient_name", "")).strip()
    doctor = str(payload.get("doctor", "")).strip()
    appointment_date = str(payload.get("appointment_date", "")).strip()
    appointment_time = str(payload.get("appointment_time", "")).strip()

    if not patient_name or not doctor or not appointment_date or not appointment_time:
        return jsonify({"error": "patient_name, doctor, appointment_date, and appointment_time are required"}), 400

    appointment = {
        "id": str(uuid.uuid4()),
        "patient_name": patient_name,
        "doctor": doctor,
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "reason": str(payload.get("reason", "")).strip(),
        "status": "booked",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    with _store_lock:
        items = _read_json_list(APPOINTMENTS_FILE)
        items.append(appointment)
        _write_json_list(APPOINTMENTS_FILE, items)

    return jsonify(appointment), 201


@app.route("/api/medicine-orders", methods=["GET", "POST"])
def medicine_orders() -> Any:
    if request.method == "GET":
        with _store_lock:
            data = _read_json_list(MEDICINE_ORDERS_FILE)
        return jsonify({"items": data})

    payload = request.get_json(silent=True) or {}
    customer_name = str(payload.get("customer_name", "")).strip()
    phone = str(payload.get("phone", "")).strip()
    address = str(payload.get("address", "")).strip()
    items = payload.get("items") or []

    if not customer_name or not phone or not address:
        return jsonify({"error": "customer_name, phone, and address are required"}), 400
    if not isinstance(items, list) or not items:
        return jsonify({"error": "items must be a non-empty list"}), 400

    order_items = []
    order_total = 0.0
    for item in items:
        try:
            quantity = int(item.get("quantity", 1))
            unit_price = float(item.get("price", 0))
        except (TypeError, ValueError):
            continue

        if quantity <= 0:
            continue

        line_total = quantity * unit_price
        order_total += line_total
        order_items.append(
            {
                "catalog_id": item.get("id"),
                "name": str(item.get("name", "")).strip(),
                "quantity": quantity,
                "price": unit_price,
                "line_total": round(line_total, 2),
            }
        )

    if not order_items:
        return jsonify({"error": "No valid order items found"}), 400

    order = {
        "id": str(uuid.uuid4()),
        "customer_name": customer_name,
        "phone": phone,
        "address": address,
        "notes": str(payload.get("notes", "")).strip(),
        "items": order_items,
        "total": round(order_total, 2),
        "status": "placed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    with _store_lock:
        existing_orders = _read_json_list(MEDICINE_ORDERS_FILE)
        existing_orders.append(order)
        _write_json_list(MEDICINE_ORDERS_FILE, existing_orders)

    return jsonify(order), 201


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
    if FRONTEND_ASSETS_DIR.is_dir():
        return send_from_directory(str(FRONTEND_ASSETS_DIR), filename)
    return "Frontend assets not found. Run `npm run build` inside `frontend/`.", 404


@app.route("/<path:filename>")
def serve_frontend_file(filename: str):
    file_path = FRONTEND_DIST_DIR / filename
    if file_path.is_file():
        return send_from_directory(str(FRONTEND_DIST_DIR), filename)

    if not filename.startswith("get") and (FRONTEND_DIST_DIR / "index.html").is_file():
        return send_from_directory(str(FRONTEND_DIST_DIR), "index.html")
    return "Not found", 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
