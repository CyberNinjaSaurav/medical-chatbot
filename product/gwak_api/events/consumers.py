import logging
from typing import Any

from gwak_api.events.bus import bus

logger = logging.getLogger("gwak.events.consumers")


def _on_order_placed(payload: dict[str, Any]) -> None:
    logger.info("order.placed consumed order_id=%s", payload.get("order_id"))


def _on_payment_confirmed(payload: dict[str, Any]) -> None:
    logger.info("payment.confirmed consumed order_id=%s", payload.get("order_id"))


def _on_rx_rejected(payload: dict[str, Any]) -> None:
    logger.info("rx.rejected consumed order_id=%s reason=%s", payload.get("order_id"), payload.get("reason"))


def _on_consultation_completed(payload: dict[str, Any]) -> None:
    logger.info("consultation.completed id=%s", payload.get("consultation_id"))


bus.subscribe("order.placed", _on_order_placed)
bus.subscribe("payment.confirmed", _on_payment_confirmed)
bus.subscribe("rx.rejected", _on_rx_rejected)
bus.subscribe("consultation.completed", _on_consultation_completed)
