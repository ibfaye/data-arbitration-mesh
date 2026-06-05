"""Typed message envelopes for agent-to-agent communication.

Key SCAMPER-R design: consumers declare semantic needs (ContractDeclaration),
not producers dictating schemas. The protocol reverses the traditional flow.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any
import uuid


class MessageType(str, Enum):
    """Every message on the bus is exactly one of these computational types."""
    SCHEMA_CHANGE_PROPOSAL = "schema_change_proposal"
    CONTRACT_DECLARATION = "contract_declaration"
    CONSTRAINT_VIOLATION = "constraint_violation"
    ARBITRATION_RULING = "arbitration_ruling"
    REMEDIATION_PLAN = "remediation_plan"
    ACKNOWLEDGEMENT = "acknowledgement"


class ProposalStatus(str, Enum):
    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    ACCEPTED_WITH_CONDITIONS = "accepted_with_conditions"


@dataclass
class ArbitrationMessage:
    """Every message on the bus is an ArbitrationMessage.

    The 'sender' is a computational role, not a human job title.
    Valid senders: 'sentinel', 'enforcer', 'arbiter', 'compiler'
    """
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    msg_type: MessageType = MessageType.ACKNOWLEDGEMENT
    sender: str = ""
    recipient: str | None = None  # None = broadcast to all peers
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass
class SchemaChangeProposal:
    """Sent by the Schema Sentinel when it detects drift at a pipeline boundary.

    SCAMPER-R: the Sentinel doesn't dictate — it proposes and awaits peer response.
    """
    proposal_id: str
    source_layer: str  # e.g. "bronze", "silver"
    target_layer: str  # e.g. "silver", "gold"
    added_columns: list[dict[str, str]] = field(default_factory=list)
    removed_columns: list[str] = field(default_factory=list)
    modified_columns: list[dict[str, Any]] = field(default_factory=list)
    sample_rows: list[dict[str, Any]] = field(default_factory=list)  # Evidence, not assertion
    status: ProposalStatus = ProposalStatus.PROPOSED

    def to_message(self, sender: str) -> ArbitrationMessage:
        return ArbitrationMessage(
            msg_type=MessageType.SCHEMA_CHANGE_PROPOSAL,
            sender=sender,
            payload={"proposal": self.__dict__},
        )


@dataclass
class ContractDeclaration:
    """Sent by each Contract Enforcer to declare its semantic needs.

    This is the SCAMPER-R inversion: consumers declare what they need,
    and the mesh figures out how to produce it — not the other way around.
    """
    contract_id: str
    enforcer_id: str  # Identifies which downstream consumer this contract belongs to
    required_columns: list[dict[str, str]] = field(default_factory=list)  # [{name, type, semantic_role}]
    constraints: list[dict[str, Any]] = field(default_factory=list)  # E.g. PII masking, CDP rules
    freshness_sla_seconds: int = 3600
    acceptable_latency_ms: int = 500

    def to_message(self, sender: str) -> ArbitrationMessage:
        return ArbitrationMessage(
            msg_type=MessageType.CONTRACT_DECLARATION,
            sender=sender,
            payload={"contract": self.__dict__},
        )


@dataclass
class ConstraintViolation:
    """Raised when a proposal violates a declared contract or ledger constraint.

    NOT sent by a "Governance Agent." Sent by any peer that detects the violation
    by consulting the shared Constraint Ledger.
    """
    violation_id: str
    proposal_id: str
    contract_id: str
    violating_column: str
    violated_rule: str  # Reference to the Constraint Ledger rule key
    detail: str
    suggested_remedy: str | None = None

    def to_message(self, sender: str, recipient: str | None = None) -> ArbitrationMessage:
        return ArbitrationMessage(
            msg_type=MessageType.CONSTRAINT_VIOLATION,
            sender=sender,
            recipient=recipient,
            payload={"violation": self.__dict__},
        )


@dataclass
class ArbitrationRuling:
    """Issued by the Arbitration Engine when negotiation reaches an impasse.

    The Arbiter is computational, not organizational. It samples evidence,
    applies the Constraint Ledger, and rules. No human approval chain.
    """
    ruling_id: str
    proposal_id: str
    violations: list[str] = field(default_factory=list)  # violation_ids
    ruling: ProposalStatus = ProposalStatus.REJECTED
    conditions: list[str] = field(default_factory=list)
    reasoning: str = ""

    def to_message(self, sender: str, recipient: str | None = None) -> ArbitrationMessage:
        return ArbitrationMessage(
            msg_type=MessageType.ARBITRATION_RULING,
            sender=sender,
            recipient=recipient,
            payload={"ruling": self.__dict__},
        )


@dataclass
class RemediationPlan:
    """Emitted by the Pipeline Compiler after a ruling is accepted.

    This is executable: it describes the transformation to apply.
    In enterprise deployment, this compiles to dbt model changes or
    Databricks Delta Live Tables pipeline updates.
    """
    plan_id: str
    ruling_id: str
    proposal_id: str
    steps: list[dict[str, Any]] = field(default_factory=list)  # Ordered transformation steps
    rollback_plan: list[dict[str, Any]] = field(default_factory=list)

    def to_message(self, sender: str, recipient: str | None = None) -> ArbitrationMessage:
        return ArbitrationMessage(
            msg_type=MessageType.REMEDIATION_PLAN,
            sender=sender,
            recipient=recipient,
            payload={"plan": self.__dict__},
        )
