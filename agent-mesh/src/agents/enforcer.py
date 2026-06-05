"""Contract Enforcer — declares downstream consumer needs and validates proposals.

Computational role: contract validator. Declares what data it needs and what
constraints apply, then validates incoming proposals against the shared
Constraint Ledger.

NOT a "Business Analyst" or "Data Consumer" — those are human roles.
This is a computational peer that declares semantic contracts and enforces
compliance autonomously.
"""

import logging
from typing import Any

from .base import BaseAgent
from ..protocol import (
    ArbitrationMessage,
    MessageBus,
    MessageType,
    ContractDeclaration,
    ConstraintViolation,
    ProposalStatus,
)
from ..ledger import ConstraintLedger

logger = logging.getLogger(__name__)


class ContractEnforcer(BaseAgent):
    """Declares downstream needs and validates proposals against the Constraint Ledger.

    Multiple enforcers can coexist — e.g., one for a compliance dashboard,
    one for a risk model, one for a customer-facing API. Each declares its own
    contract and independently validates proposals.
    """

    _instance_counter = 0

    def __init__(
        self,
        bus: MessageBus,
        ledger: ConstraintLedger,
        contract: ContractDeclaration,
        name: str = "Contract Enforcer",
    ):
        agent_id = f"enforcer_{ContractEnforcer._instance_counter}"
        ContractEnforcer._instance_counter += 1
        super().__init__(agent_id, bus)
        self.ledger = ledger
        self.contract = contract
        self._display_name = name

    @property
    def display_name(self) -> str:
        return self._display_name

    async def declare_contract(self):
        """Broadcast this enforcer's contract to the mesh."""
        msg = self.contract.to_message(sender=self.agent_id)
        logger.info(
            f"[{self.agent_id}] {self._display_name} declaring contract "
            f"{self.contract.contract_id}: {len(self.contract.required_columns)} required columns, "
            f"{len(self.contract.constraints)} constraints"
        )
        await self.emit(msg)

    async def on_message(self, msg: ArbitrationMessage):
        """Handle targeted messages — primarily schema change proposals to validate."""
        if msg.msg_type == MessageType.SCHEMA_CHANGE_PROPOSAL:
            await self._validate_proposal(msg)

    async def on_broadcast(self, msg: ArbitrationMessage):
        """Handle broadcasts."""
        if msg.msg_type == MessageType.SCHEMA_CHANGE_PROPOSAL:
            await self._validate_proposal(msg)

    async def _validate_proposal(self, msg: ArbitrationMessage):
        """Validate a schema change proposal against our contract and the ledger."""
        proposal = msg.payload.get("proposal", {})
        proposal_id = proposal.get("proposal_id", "unknown")

        violations = []

        # Check every new column against the Constraint Ledger
        for col in proposal.get("added_columns", []):
            col_info = {
                "name": col["name"],
                "type": col.get("type", "UNKNOWN"),
                "sample_values": col.get("sample_values", []),
                "semantic_role": col.get("semantic_role", ""),
            }
            ledger_violations = self.ledger.check_column(col_info)
            violations.extend(ledger_violations)

        # Check modified columns
        for col in proposal.get("modified_columns", []):
            col_info = {
                "name": col["name"],
                "change_type": col.get("change_type", ""),
                "old_type": col.get("old_type", ""),
                "new_type": col.get("new_type", ""),
            }
            ledger_violations = self.ledger.check_column(col_info)
            violations.extend(ledger_violations)

        # Check if any required contract columns are being removed
        required_names = {c["name"] for c in self.contract.required_columns}
        removed_names = set(proposal.get("removed_columns", []))
        contract_conflicts = required_names & removed_names
        for col_name in contract_conflicts:
            violations.append({
                "rule_id": "CONTRACT-BREAK",
                "rule_name": "Contract Column Removal",
                "severity": "mandatory",
                "source_ref": f"Contract {self.contract.contract_id}",
                "detail": f"Cannot remove '{col_name}': required by contract {self.contract.contract_id}.",
            })

        if violations:
            logger.warning(
                f"[{self.agent_id}] {self._display_name} found {len(violations)} violations "
                f"in proposal {proposal_id}"
            )
            for violation in violations:
                # Extract column name from violation detail for context
                detail = violation.get("detail", "")
                vcol = "unknown"
                if "'" in detail:
                    parts = detail.split("'")
                    vcol = parts[1] if len(parts) > 1 else "unknown"

                v = ConstraintViolation(
                    violation_id=f"VIOL-{proposal_id}-{violation['rule_id']}",
                    proposal_id=proposal_id,
                    contract_id=self.contract.contract_id,
                    violating_column=vcol,
                    violated_rule=violation["rule_id"],
                    detail=detail,
                    suggested_remedy=self._suggest_remedy(violation, vcol),
                )
                await self.emit(v.to_message(sender=self.agent_id))
        else:
            logger.info(
                f"[{self.agent_id}] {self._display_name}: proposal {proposal_id} "
                f"passes all constraints — no violations"
            )

    def _suggest_remedy(self, violation: dict, col_name: str = "") -> str | None:
        """Suggest a remedy based on the violation type and whether the column is in our contract."""
        rule_id = violation.get("rule_id", "")
        is_required = col_name in {c["name"] for c in self.contract.required_columns}

        if "PROFILING" in rule_id:
            if is_required:
                return (
                    f"Column '{col_name}' is required by contract {self.contract.contract_id}. "
                    "Apply deterministic masking with per-customer salt before Gold layer. "
                    "Business justification: risk modeling requires scoring data."
                )
            return f"Column '{col_name}' is not required by contract {self.contract.contract_id}. Apply strict masking or exclude from pipeline."

        if "PII" in rule_id:
            if is_required:
                return "Apply deterministic hashing with per-customer salt before Gold layer."
            return "Reject: PII column not declared in contract. Apply strict masking or exclude."

        if "MINIMIZATION" in rule_id:
            return "Provide business justification; otherwise exclude from pipeline."
        if "NULL" in rule_id:
            return "Annotate column as nullable in schema registry and downstream contracts."
        if "SECRETS" in rule_id:
            return "Reject outright. Upstream source must never emit secrets in plaintext."
        if "CONTRACT-BREAK" in rule_id:
            return "Column removal requires contract amendment with 30-day deprecation notice."
        return None
