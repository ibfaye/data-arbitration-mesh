"""Base agent — every computational peer shares this interface.

Design principle (The Org Chart Delusion):
Agents are named by what they compute, not what human role they mirror.
There is no hierarchy. Every agent is a peer that publishes to and subscribes
from the shared message bus.
"""

import asyncio
import logging
from abc import ABC, abstractmethod

from ..protocol import ArbitrationMessage, MessageBus

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Every agent in the mesh extends this.

    An agent is:
    - A named computational peer (not a job title)
    - A subscriber to the message bus
    - A publisher of structured ArbitrationMessages
    """

    def __init__(self, agent_id: str, bus: MessageBus):
        self.agent_id = agent_id
        self.bus = bus
        self._handlers_registered = False

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable name for the visualization layer."""
        ...

    async def start(self):
        """Register handlers on the bus and begin listening."""
        if not self._handlers_registered:
            # Subscribe to messages addressed to this agent
            self.bus.subscribe(self.agent_id, self._handle_message)
            # Also subscribe to broadcast messages
            self.bus.subscribe("*", self._handle_broadcast)
            self._handlers_registered = True
        logger.info(f"[{self.agent_id}] {self.display_name} started")

    async def _handle_message(self, msg: ArbitrationMessage):
        """Handle a message addressed specifically to this agent."""
        await self.on_message(msg)

    async def _handle_broadcast(self, msg: ArbitrationMessage):
        """Handle a broadcast message (sent to all peers)."""
        if msg.recipient is None or msg.recipient == self.agent_id:
            await self.on_broadcast(msg)

    @abstractmethod
    async def on_message(self, msg: ArbitrationMessage):
        """React to a targeted message. Override in subclasses."""
        ...

    @abstractmethod
    async def on_broadcast(self, msg: ArbitrationMessage):
        """React to a broadcast message. Override in subclasses."""
        ...

    async def emit(self, msg: ArbitrationMessage):
        """Publish a message to the bus."""
        await self.bus.publish(msg)
