"""Pipeline Compiler — translates rulings into executable remediation plans.

Computational role: plan generator. When the Arbitration Engine issues a ruling,
the Pipeline Compiler translates it into an ordered sequence of transformation
steps. In production, this would generate dbt model diffs, Databricks Delta Live
Tables pipeline updates, or Airflow DAG modifications.

NOT a "DevOps Engineer" or "Data Engineer" — those are human roles.
This is a computational peer that consumes rulings and emits executable plans.
"""

import logging
from typing import Any

from .base import BaseAgent
from ..protocol import (
    ArbitrationMessage,
    MessageBus,
    MessageType,
    RemediationPlan,
    ProposalStatus,
)

logger = logging.getLogger(__name__)


class PipelineCompiler(BaseAgent):
    """Consumes rulings and produces executable transformation plans.

    The compiler is the last link in the autonomous chain:
    Sentinel detects → Enforcer validates → Arbiter rules → Compiler acts.
    """

    display_name = "Pipeline Compiler"
    _plan_counter = 0

    def __init__(self, bus: MessageBus):
        super().__init__("compiler", bus)

    async def on_message(self, msg: ArbitrationMessage):
        """Handle targeted messages (rulings addressed to the compiler)."""
        if msg.msg_type == MessageType.ARBITRATION_RULING:
            await self._compile_plan(msg)

    async def on_broadcast(self, msg: ArbitrationMessage):
        """Handle broadcast rulings."""
        if msg.msg_type == MessageType.ARBITRATION_RULING:
            await self._compile_plan(msg)

    async def _compile_plan(self, msg: ArbitrationMessage):
        """Translate a ruling into an executable remediation plan."""
        ruling = msg.payload.get("ruling", {})
        proposal_id = ruling.get("proposal_id", "unknown")
        ruling_id = ruling.get("ruling_id", "unknown")
        status = ruling.get("ruling", "rejected")
        conditions = ruling.get("conditions", [])

        PipelineCompiler._plan_counter += 1

        if status == ProposalStatus.ACCEPTED:
            steps = [self._make_step("apply_schema", f"Apply schema changes from proposal {proposal_id}")]
        elif status == ProposalStatus.ACCEPTED_WITH_CONDITIONS:
            steps = self._generate_remediation_steps(conditions, proposal_id)
        else:
            steps = [
                self._make_step(
                    "notify_upstream",
                    f"Reject schema change for proposal {proposal_id}. "
                    f"Notify source system owner to remediate."
                ),
                self._make_step(
                    "block_pipeline",
                    f"Add schema guard at bronze→silver boundary for proposal {proposal_id} "
                    f"until upstream remediates."
                ),
            ]

        plan = RemediationPlan(
            plan_id=f"PLAN-{PipelineCompiler._plan_counter:04d}",
            ruling_id=ruling_id,
            proposal_id=proposal_id,
            steps=steps,
            rollback_plan=[
                self._make_step("revert_schema", "Roll back to last known good schema version."),
                self._make_step("notify_consumers", "Notify all downstream contracts of rollback."),
            ],
        )

        logger.info(
            f"[compiler] Emitting {plan.plan_id} for {proposal_id}: "
            f"{len(steps)} step(s), status={status}"
        )

        await self.emit(plan.to_message(sender="compiler"))

    def _generate_remediation_steps(
        self, conditions: list[str], proposal_id: str
    ) -> list[dict[str, Any]]:
        """Generate ordered transformation steps from conditions."""
        steps = []
        for i, condition in enumerate(conditions):
            if "hash" in condition.lower() or "mask" in condition.lower():
                steps.append(
                    self._make_step(
                        "apply_masking",
                        f"Step {i+1}: {condition}",
                        {
                            "function": "deterministic_hash",
                            "strategy": "per_customer_salt",
                            "target_layer": "gold",
                        },
                    )
                )
            elif "annotate" in condition.lower() or "nullable" in condition.lower():
                steps.append(
                    self._make_step(
                        "update_schema_registry",
                        f"Step {i+1}: {condition}",
                        {
                            "action": "annotate_nullable",
                        },
                    )
                )
            elif "deprecation" in condition.lower():
                steps.append(
                    self._make_step(
                        "schedule_deprecation",
                        f"Step {i+1}: {condition}",
                        {
                            "notice_period_days": 30,
                        },
                    )
                )
            else:
                steps.append(
                    self._make_step(
                        "apply_condition",
                        f"Step {i+1}: {condition}",
                    )
                )

        # Always append schema application as final step
        steps.append(
            self._make_step("apply_schema", f"Apply schema changes from proposal {proposal_id}")
        )

        return steps

    @staticmethod
    def _make_step(
        action: str, description: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        return {
            "action": action,
            "description": description,
            "params": params or {},
        }
