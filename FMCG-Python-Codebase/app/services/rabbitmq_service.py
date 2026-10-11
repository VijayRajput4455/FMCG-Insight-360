import json
import logging
import threading
from collections.abc import Callable
from typing import Any

import pika

from app.core.config import settings


logger = logging.getLogger(__name__)


class RabbitMQClient:
    _instance = None
    _instance_lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._state = threading.local()
        self._channel_lock = threading.Lock()
        self.exchange_name = settings.RABBITMQ_EXCHANGE
        self._initialized = True

    def _get_state(self):
        if not hasattr(self._state, "connection"):
            self._state.connection = None
        if not hasattr(self._state, "channels"):
            self._state.channels = {}
        return self._state

    def _build_connection_parameters(self) -> pika.ConnectionParameters:
        credentials = pika.PlainCredentials(
            settings.RABBITMQ_USER,
            settings.RABBITMQ_PASSWORD,
        )
        return pika.ConnectionParameters(
            host=settings.RABBITMQ_HOST,
            port=settings.RABBITMQ_PORT,
            virtual_host=settings.RABBITMQ_VHOST,
            credentials=credentials,
            heartbeat=settings.RABBITMQ_HEARTBEAT,
            blocked_connection_timeout=settings.RABBITMQ_BLOCKED_TIMEOUT,
        )

    def _ensure_connection(self):
        state = self._get_state()
        if state.connection is None or state.connection.is_closed:
            logger.info("Opening RabbitMQ connection to %s:%s", settings.RABBITMQ_HOST, settings.RABBITMQ_PORT)
            state.connection = pika.BlockingConnection(self._build_connection_parameters())

    def get_channel(self, queue_name: str):
        with self._channel_lock:
            self._ensure_connection()
            state = self._get_state()

            channel = state.channels.get(queue_name)
            if channel is not None and not channel.is_closed:
                return channel

            channel = state.connection.channel()
            channel.exchange_declare(
                exchange=self.exchange_name,
                exchange_type="direct",
                durable=True,
            )
            channel.queue_declare(queue=queue_name, durable=True)
            channel.queue_bind(
                exchange=self.exchange_name,
                queue=queue_name,
                routing_key=queue_name,
            )
            state.channels[queue_name] = channel
            logger.info("RabbitMQ channel ready for queue=%s", queue_name)
            return channel

    def publish(
        self,
        queue_name: str,
        message: dict[str, Any],
        *,
        headers: dict[str, Any] | None = None,
    ):
        channel = self.get_channel(queue_name)
        channel.basic_publish(
            exchange=self.exchange_name,
            routing_key=queue_name,
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,
                headers=headers or {},
            ),
        )
        logger.info("Published RabbitMQ message to queue=%s", queue_name)

    def consume(
        self,
        queue_name: str,
        on_message: Callable[[Any, Any, Any, bytes], None],
        *,
        prefetch_count: int = 1,
    ):
        channel = self.get_channel(queue_name)
        channel.basic_qos(prefetch_count=prefetch_count)
        channel.basic_consume(queue=queue_name, on_message_callback=on_message)
        logger.info("Waiting for RabbitMQ messages on queue=%s", queue_name)
        channel.start_consuming()

    def close(self, queue_name: str | None = None):
        state = self._get_state()
        if queue_name is not None:
            channel = state.channels.pop(queue_name, None)
            if channel is not None and not channel.is_closed:
                channel.close()
                logger.info("Closed RabbitMQ channel for queue=%s", queue_name)
        else:
            for name, channel in list(state.channels.items()):
                if channel is not None and not channel.is_closed:
                    channel.close()
                    logger.info("Closed RabbitMQ channel for queue=%s", name)
            state.channels.clear()

        if state.connection is not None and not state.connection.is_closed:
            state.connection.close()
            logger.info("Closed RabbitMQ connection")
            state.connection = None


_rabbitmq_client = RabbitMQClient()


def get_rabbitmq_client() -> RabbitMQClient:
    return _rabbitmq_client