from __future__ import annotations

import json
import logging
from collections import defaultdict
from collections.abc import Callable
from typing import Any
from uuid import uuid4

from gwak_api.core.config import get_settings

logger = logging.getLogger("gwak.events")

Handler = Callable[[dict[str, Any]], None]


class EventBus:
    """In-process event bus for MVP; swap to Kafka when use_inprocess_events=False."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[Handler]] = defaultdict(list)
        self._seen_keys: set[str] = set()

    def subscribe(self, event_name: str, handler: Handler) -> None:
        self._handlers[event_name].append(handler)

    def publish(self, event_name: str, payload: dict[str, Any], *, idempotency_key: str | None = None) -> None:
        key = idempotency_key or str(uuid4())
        if key in self._seen_keys:
            logger.info("Skipping duplicate event %s key=%s", event_name, key)
            return
        self._seen_keys.add(key)
        envelope = {
            "event": event_name,
            "idempotency_key": key,
            "payload": payload,
        }
        settings = get_settings()
        if not settings.use_inprocess_events:
            # Kafka publish seam — log for now when Kafka unavailable
            logger.info("Kafka publish seam: %s", json.dumps(envelope))
        for handler in self._handlers.get(event_name, []):
            try:
                handler(payload)
            except Exception:
                logger.exception("Handler failed for %s", event_name)


bus = EventBus()


def publish(event_name: str, payload: dict[str, Any], *, idempotency_key: str | None = None) -> None:
    bus.publish(event_name, payload, idempotency_key=idempotency_key)
