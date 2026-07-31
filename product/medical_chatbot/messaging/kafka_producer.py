import json
import logging
from typing import Any, Dict, Optional

from kafka import KafkaProducer

logger = logging.getLogger("kafka-producer")


class KafkaJSONProducer:
    def __init__(self, bootstrap_servers: str, client_id: str = "medical-kafka-producer") -> None:
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers.split(","),
            value_serializer=lambda value: json.dumps(value).encode("utf-8"),
            key_serializer=lambda key: key.encode("utf-8"),
            acks="all",
            retries=5,
            linger_ms=5,
            client_id=client_id,
        )
        logger.info("Kafka producer initialized client_id=%s", client_id)

    def send_message(self, topic: str, message: Dict[str, Any], key: Optional[str] = None) -> None:
        future = self.producer.send(topic, key=key, value=message)
        metadata = future.get(timeout=10)
        self.producer.flush()
        logger.info(
            "Kafka message sent topic=%s partition=%s offset=%s key=%s",
            metadata.topic,
            metadata.partition,
            metadata.offset,
            key,
        )

    def close(self) -> None:
        try:
            self.producer.flush()
            self.producer.close()
        except Exception:
            logger.exception("Failed to close Kafka producer cleanly")
