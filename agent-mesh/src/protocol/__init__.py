"""Data Arbitration Protocol — typed message envelopes for peer-to-peer agent negotiation.

Design principle (The Org Chart Delusion):
No agent "reports to" another. Every agent is a computational peer that
emits structured messages to a shared bus. Any agent can consume any message.
Governance is a shared Constraint Ledger, not a gatekeeper agent.
"""

from .envelope import (
    ArbitrationMessage,
    MessageType,
    ProposalStatus,
    SchemaChangeProposal,
    ContractDeclaration,
    ConstraintViolation,
    ArbitrationRuling,
    RemediationPlan,
)
from .bus import MessageBus

__all__ = [
    "ArbitrationMessage",
    "MessageType",
    "ProposalStatus",
    "SchemaChangeProposal",
    "ContractDeclaration",
    "ConstraintViolation",
    "ArbitrationRuling",
    "RemediationPlan",
    "MessageBus",
]
