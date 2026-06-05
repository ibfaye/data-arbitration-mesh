"""Peer-to-peer message bus — no central orchestrator, no message broker dependency.

Design principle (The Org Chart Delusion):
The bus is a shared channel, not a hierarchy. Any agent can emit, any agent can
subscribe. There is no "manager" agent that routes or approves messages.
The bus enforces only the message contract (every message is an ArbitrationMessage),
not the communication topology.
"""

import asyncio
import json
import logging
from collections import defaultdict
from typing import Callable, Awaitable

from .envelope import ArbitrationMessage

logger = logging.getLogger(__name__)

MessageHandler = Callable[[ArbitrationMessage], Awaitable[None]]


class MessageBus:
    """In-memory pub/sub bus for agent-to-agent communication.

    For production: replace with Kafka or Redis Streams, keeping the same
    ArbitrationMessage envelope contract.
    """

    def __init__(self):
        self._subscribers: dict[str, list[MessageHandler]] = defaultdict(list)
        self._transcript: list[ArbitrationMessage] = []  # Immutable ledger of all messages
        self._message_queue: asyncio.Queue[ArbitrationMessage] = asyncio.Queue()
        self._running = False
        self._dispatch_task: asyncio.Task | None = None

    async def start(self):
        """Start the dispatch loop."""
        self._running = True
        self._dispatch_task = asyncio.create_task(self._dispatch_loop())
        logger.info("MessageBus dispatch loop started")

    async def stop(self):
        """Stop the dispatch loop."""
        self._running = False
        if self._dispatch_task:
            self._dispatch_task.cancel()
            try:
                await self._dispatch_task
            except asyncio.CancelledError:
                pass
        logger.info("MessageBus stopped")

    async def _dispatch_loop(self):
        """Continuously dispatch messages from the queue to subscribers."""
        while self._running:
            try:
                msg = await asyncio.wait_for(self._message_queue.get(), timeout=1.0)
                await self._deliver(msg)
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break

    async def _deliver(self, msg: ArbitrationMessage):
        """Deliver a message to all relevant subscribers."""
        # Always deliver to broadcast subscribers (recipient=None handlers)
        for handler in self._subscribers.get("*", []):
            try:
                await handler(msg)
            except Exception:
                logger.exception(f"Broadcast handler failed for {msg.id}")

        # Deliver to specific recipient if named
        if msg.recipient:
            for handler in self._subscribers.get(msg.recipient, []):
                try:
                    await handler(msg)
                except Exception:
                    logger.exception(f"Targeted handler failed for {msg.recipient}")

        # Also deliver to sender-type subscribers
        sender_key = f"sender:{msg.sender}"
        if sender_key in self._subscribers:
            for handler in self._subscribers[sender_key]:
                try:
                    await handler(msg)
                except Exception:
                    logger.exception(f"Sender handler failed for {msg.sender}")

    async def publish(self, msg: ArbitrationMessage):
        """Publish a message to the bus. Blocking-safe — queues for dispatch."""
        self._transcript.append(msg)  # Immutable append to the transcript ledger
        await self._message_queue.put(msg)

    def subscribe(self, pattern: str, handler: MessageHandler):
        """Subscribe to messages matching a pattern.

        Patterns:
          - "*"  : all messages (broadcast)
          - "sentinel" : messages addressed to this agent
          - "sender:arbiter" : messages FROM this sender
        """
        self._subscribers[pattern].append(handler)

    def get_transcript(self) -> list[dict]:
        """Return the full message transcript as a list of dicts (for API/visualization)."""
        return [json.loads(json.dumps(msg.__dict__, default=str)) for msg in self._transcript]
