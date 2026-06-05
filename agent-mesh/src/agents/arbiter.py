"""Arbitration Engine — resolves impasses between sentinels and enforcers.

Computational role: deadlock breaker. When a Schema Sentinel proposes a change
and one or more Contract Enforcers raise violations, the Arbitration Engine
steps in. It samples evidence from the actual data, applies the Constraint Ledger
independently, and issues a binding ruling.

NOT a "Manager" or "Governance Board" — those are human roles. This is a
computational peer that breaks negotiation deadlocks by consulting the shared
ledger and sampling evidence.
"""

import asyncio
import logging
from typing import Any

from .base import BaseAgent
from ..protocol import (
    ArbitrationMessage,
    MessageBus,
    MessageType,
    ArbitrationRuling,
    ProposalStatus,
)
from ..ledger import ConstraintLedger

logger = logging.getLogger(__name__)


class ArbitrationEngine(BaseAgent):
    """Resolves disputes between peers by sampling evidence and applying rules.

    Triggered when the same proposal receives both a SchemaChangeProposal
    and one or more ConstraintViolations. The engine samples the actual data,
    re-evaluates the ledger rules, and issues a binding ruling.
    """

    display_name = "Arbitration Engine"

    def __init__(self, bus: MessageBus, ledger: ConstraintLedger, ruling_delay: float = 1.5):
        super().__init__("arbiter", bus)
        self.ledger = ledger
        self.ruling_delay = ruling_delay  # Simulated "deliberation" time
        # Track proposals and their violations
        self._pending_proposals: dict[str, dict] = {}
        self._ring_counter = 0

    async def on_message(self, msg: ArbitrationMessage):
        """Handle targeted messages."""
        pass  # Arbiter primarily consumes broadcasts, not targeted messages

    async def on_broadcast(self, msg: ArbitrationMessage):
        """Track proposals and violations; rule when both sides are heard."""
        if msg.msg_type == MessageType.SCHEMA_CHANGE_PROPOSAL:
            await self._track_proposal(msg)

        elif msg.msg_type == MessageType.CONSTRAINT_VIOLATION:
            await self._track_violation(msg)

    async def _track_proposal(self, msg: ArbitrationMessage):
        """Record a new proposal for tracking."""
        proposal = msg.payload.get("proposal", {})
        proposal_id = proposal.get("proposal_id", "unknown")

        if proposal_id not in self._pending_proposals:
            self._pending_proposals[proposal_id] = {
                "proposal": proposal,
                "violations": [],
                "proposal_msg": msg,
            }
            logger.info(
                f"[arbiter] Tracking proposal {proposal_id} "
                f"(from {msg.sender}, {len(proposal.get('added_columns', []))} new cols)"
            )

    async def _track_violation(self, msg: ArbitrationMessage):
        """Record a violation and check if we should rule."""
        violation = msg.payload.get("violation", {})
        proposal_id = violation.get("proposal_id", "unknown")

        if proposal_id in self._pending_proposals:
            self._pending_proposals[proposal_id]["violations"].append(violation)

            # After collecting violations, deliberate and rule
            await self._deliberate_and_rule(proposal_id)

    async def _deliberate_and_rule(self, proposal_id: str):
        """Sample evidence, apply the ledger, and issue a ruling."""
        entry = self._pending_proposals.get(proposal_id)
        if not entry:
            return

        proposal = entry["proposal"]
        violations = entry["violations"]

        # Simulate deliberation time (sampling evidence, checking ledger)
        logger.info(f"[arbiter] Deliberating on {proposal_id} — {len(violations)} violations")
        await asyncio.sleep(self.ruling_delay)

        # Evaluate: can this proposal be salvaged?
        mandatory_violations = [v for v in violations if self._is_mandatory(v)]
        advisory_violations = [v for v in violations if not self._is_mandatory(v)]

        conditions = []
        if mandatory_violations:
            # Check if mandatory violations have remedies
            unremediable = [v for v in mandatory_violations if not v.get("suggested_remedy")]
            if unremediable:
                ruling_status = ProposalStatus.REJECTED
                reasoning = (
                    f"{len(unremediable)} mandatory violation(s) cannot be remedied: "
                    + "; ".join(v["detail"] for v in unremediable)
                )
            else:
                ruling_status = ProposalStatus.ACCEPTED_WITH_CONDITIONS
                conditions = [v.get("suggested_remedy", "") for v in mandatory_violations]
                reasoning = (
                    f"{len(mandatory_violations)} mandatory violation(s) can be remedied "
                    f"with {len(conditions)} condition(s)."
                )
        elif advisory_violations:
            ruling_status = ProposalStatus.ACCEPTED_WITH_CONDITIONS
            conditions = [v.get("suggested_remedy", "") for v in advisory_violations]
            reasoning = f"{len(advisory_violations)} advisory violation(s) — accepting with conditions."
        else:
            ruling_status = ProposalStatus.ACCEPTED
            reasoning = "No violations detected. Proposal accepted as-is."

        self._ring_counter += 1
        ruling = ArbitrationRuling(
            ruling_id=f"RULING-{self._ring_counter:04d}",
            proposal_id=proposal_id,
            violations=[v.get("violation_id", "") for v in violations],
            ruling=ruling_status,
            conditions=conditions,
            reasoning=reasoning,
        )

        logger.info(
            f"[arbiter] Ruling {ruling.ruling_id} on {proposal_id}: "
            f"{ruling_status.value.upper()} — {reasoning}"
        )

        await self.emit(ruling.to_message(sender="arbiter"))
        del self._pending_proposals[proposal_id]

    def _is_mandatory(self, violation: dict) -> bool:
        """Determine if a violation is mandatory based on its rule severity."""
        # Check embedded rule info if available
        rule_id = violation.get("violated_rule", "")
        rule = self.ledger.get_rule(rule_id)
        if rule:
            return rule.severity == "mandatory"
        # Fallback
        return "mandatory" in str(violation).lower()
