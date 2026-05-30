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
import psycopg2
from psycopg2.extras import RealDictCursor
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
CATALOG_UPLOAD_DIR = BASE_DIR / "static" / "catalogue_uploads"
CATALOG_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


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


def _get_db_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set. Configure PostgreSQL connection string.")
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


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


def _default_ui_config() -> Dict[str, Any]:
    return {
        "appointment": {
            "doctor_options": [
                "Dr. Sharma",
                "Dr. Patel",
                "Dr. Rao",
            ],
            "default_doctor": "Dr. Sharma",
        },
        "catalog": {
            "category_options": [
                "General",
                "Pain Relief",
                "Diabetes",
                "Cardiac",
            ],
            "default_category": "General",
            "currency_symbol": "Rs.",
        },
    }


def _default_home_content() -> Dict[str, Any]:
    return {
        "badge": "Medical Assistant Platform",
        "title": "Healthcare support in one place",
        "description": "Use chat for quick guidance, manage appointments, place medicine orders, and handle operations from admin tools.",
        "primary_button": {"label": "Start with Chat", "target": "chat"},
        "destinations": [
            {
                "id": "chat",
                "title": "Medical Chat",
                "description": "Start a symptom or medicine-related conversation with the assistant.",
                "buttonLabel": "Open Chat",
            },
            {
                "id": "appointment",
                "title": "Book Appointment",
                "description": "Schedule a doctor visit and track your recent appointments.",
                "buttonLabel": "Go to Appointments",
            },
            {
                "id": "delivery",
                "title": "Medicine Delivery",
                "description": "Browse the medicine catalogue and place a delivery order.",
                "buttonLabel": "Order Medicines",
            },
            {
                "id": "admin",
                "title": "Admin Panel",
                "description": "Manage catalogue items and upload medicine inventory in bulk.",
                "buttonLabel": "Open Admin",
            },
        ],
    }


def _ensure_db_schema() -> None:
    with _get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS ui_configs (
                    key TEXT PRIMARY KEY,
                    value JSONB NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS catalog_items (
                    id UUID PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT 'General',
                    description TEXT NOT NULL DEFAULT '',
                    price NUMERIC(12,2) NOT NULL DEFAULT 0,
                    stock INTEGER NOT NULL DEFAULT 0,
                    image_url TEXT NOT NULL DEFAULT '',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS appointments (
                    id UUID PRIMARY KEY,
                    patient_name TEXT NOT NULL,
                    doctor TEXT NOT NULL,
                    appointment_date TEXT NOT NULL,
                    appointment_time TEXT NOT NULL,
                    reason TEXT NOT NULL DEFAULT '',
                    status TEXT NOT NULL DEFAULT 'booked',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS medicine_orders (
                    id UUID PRIMARY KEY,
                    customer_name TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    address TEXT NOT NULL,
                    notes TEXT NOT NULL DEFAULT '',
                    items JSONB NOT NULL,
                    total NUMERIC(12,2) NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'placed',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )

            cur.execute(
                """
                INSERT INTO ui_configs (key, value)
                VALUES (%s, %s::jsonb)
                ON CONFLICT (key) DO NOTHING;
                """,
                ("ui_config", json.dumps(_default_ui_config())),
            )
            cur.execute(
                """
                INSERT INTO ui_configs (key, value)
                VALUES (%s, %s::jsonb)
                ON CONFLICT (key) DO NOTHING;
                """,
                ("home_content", json.dumps(_default_home_content())),
            )
        conn.commit()


def _load_json_config(key: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
    with _get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT value FROM ui_configs WHERE key = %s", (key,))
            row = cur.fetchone()

    if not row:
        return fallback
    value = row.get("value")
    if isinstance(value, dict):
        return value
    return fallback


def _load_ui_config() -> Dict[str, Any]:
    raw = _load_json_config("ui_config", _default_ui_config())
    config = _default_ui_config()
    config.update({k: v for k, v in raw.items() if isinstance(v, dict)})
    return config


def _load_home_content() -> Dict[str, Any]:
    raw = _load_json_config("home_content", _default_home_content())
    fallback = _default_home_content()
    for key in ("badge", "title", "description", "primary_button", "destinations"):
        if key in raw:
            fallback[key] = raw[key]
    return fallback


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

try:
    _ensure_db_schema()
except Exception:
    logger.exception("Failed to initialize PostgreSQL schema")


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
    with _get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id::text AS id, name, category, description, price::float AS price, stock, image_url,
                       created_at, updated_at
                FROM catalog_items
                ORDER BY created_at ASC
                """
            )
            items = cur.fetchall()
    return jsonify({"items": items})


@app.route("/api/ui-config", methods=["GET"])
def get_ui_config() -> Any:
    return jsonify(_load_ui_config())


@app.route("/api/home-content", methods=["GET"])
def get_home_content() -> Any:
    return jsonify(_load_home_content())


@app.route("/api/catalog/items", methods=["POST"])
def create_catalog_item() -> Any:
    payload = request.get_json(silent=True) or {}
    item = _sanitize_catalog_item(payload)

    if not item["name"]:
        return jsonify({"error": "name is required"}), 400

    with _get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO catalog_items
                (id, name, category, description, price, stock, image_url, created_at, updated_at)
                VALUES (%s::uuid, %s, %s, %s, %s, %s, %s, %s::timestamptz, %s::timestamptz)
                """,
                (
                    item["id"],
                    item["name"],
                    item["category"],
                    item["description"],
                    item["price"],
                    item["stock"],
                    item["image_url"],
                    item["created_at"],
                    item["updated_at"],
                ),
            )
        conn.commit()

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

    with _get_db_connection() as conn:
        with conn.cursor() as cur:
            for item in uploaded_items:
                cur.execute(
                    """
                    INSERT INTO catalog_items
                    (id, name, category, description, price, stock, image_url, created_at, updated_at)
                    VALUES (%s::uuid, %s, %s, %s, %s, %s, %s, %s::timestamptz, %s::timestamptz)
                    """,
                    (
                        item["id"],
                        item["name"],
                        item["category"],
                        item["description"],
                        item["price"],
                        item["stock"],
                        item["image_url"],
                        item["created_at"],
                        item["updated_at"],
                    ),
                )
        conn.commit()

    return jsonify({"uploaded_count": len(uploaded_items), "errors": errors}), 201


@app.route("/api/catalog/<item_id>", methods=["DELETE"])
def delete_catalog_item(item_id: str) -> Any:
    with _get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM catalog_items WHERE id = %s::uuid", (item_id,))
            deleted = cur.rowcount
        conn.commit()
        if deleted == 0:
            return jsonify({"error": "Catalogue item not found"}), 404
    return jsonify({"status": "deleted", "id": item_id})


@app.route("/api/appointments", methods=["GET", "POST"])
def appointments() -> Any:
    if request.method == "GET":
        with _get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id::text AS id, patient_name, doctor, appointment_date, appointment_time,
                           reason, status, created_at
                    FROM appointments
                    ORDER BY created_at ASC
                    """
                )
                data = cur.fetchall()
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

    with _get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO appointments
                (id, patient_name, doctor, appointment_date, appointment_time, reason, status, created_at)
                VALUES (%s::uuid, %s, %s, %s, %s, %s, %s, %s::timestamptz)
                """,
                (
                    appointment["id"],
                    appointment["patient_name"],
                    appointment["doctor"],
                    appointment["appointment_date"],
                    appointment["appointment_time"],
                    appointment["reason"],
                    appointment["status"],
                    appointment["created_at"],
                ),
            )
        conn.commit()

    return jsonify(appointment), 201


@app.route("/api/medicine-orders", methods=["GET", "POST"])
def medicine_orders() -> Any:
    if request.method == "GET":
        with _get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id::text AS id, customer_name, phone, address, notes, items, total::float AS total, status, created_at
                    FROM medicine_orders
                    ORDER BY created_at ASC
                    """
                )
                data = cur.fetchall()
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

    with _get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO medicine_orders
                (id, customer_name, phone, address, notes, items, total, status, created_at)
                VALUES (%s::uuid, %s, %s, %s, %s, %s::jsonb, %s, %s, %s::timestamptz)
                """,
                (
                    order["id"],
                    order["customer_name"],
                    order["phone"],
                    order["address"],
                    order["notes"],
                    json.dumps(order["items"]),
                    order["total"],
                    order["status"],
                    order["created_at"],
                ),
            )
        conn.commit()

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
