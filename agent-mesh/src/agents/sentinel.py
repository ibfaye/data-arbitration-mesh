"""Schema Sentinel — detects drift at pipeline boundaries and proposes changes.

Computational role: boundary scanner. Monitors the incoming data stream for
schema deviations and emits SchemaChangeProposal messages when drift is detected.

NOT a "Data Producer" — that's a human role. This is a computational peer that
samples incoming data and compares it against the known schema.
"""

import logging
from datetime import datetime
from typing import Any

from .base import BaseAgent
from ..protocol import (
    ArbitrationMessage,
    MessageBus,
    MessageType,
    SchemaChangeProposal,
    ProposalStatus,
)
from ..ledger import ConstraintLedger

logger = logging.getLogger(__name__)


class SchemaSentinel(BaseAgent):
    """Agent that scans pipeline boundaries for schema drift.

    When it detects new/changed/removed columns, it emits a proposal.
    It does NOT own the schema — it observes and reports.
    """

    display_name = "Schema Sentinel"
    _instance_counter = 0

    def __init__(self, bus: MessageBus, ledger: ConstraintLedger):
        agent_id = f"sentinel_{SchemaSentinel._instance_counter}"
        SchemaSentinel._instance_counter += 1
        super().__init__(agent_id, bus)
        self.ledger = ledger
        self.known_schema: list[dict[str, Any]] = []
        self._proposal_counter = 0

    def set_known_schema(self, schema: list[dict[str, Any]]):
        """Set the baseline schema that the sentinel compares against."""
        self.known_schema = [dict(col) for col in schema]  # deep copy

    async def scan_incoming(self, sample_rows: list[dict[str, Any]], source_label: str):
        """Scan incoming data rows and detect schema drift.

        Called by the simulation runner when new data arrives.
        """
        if not sample_rows:
            return

        # Extract actual column set from the sample
        actual_columns = set()
        column_samples: dict[str, list[Any]] = {}
        for row in sample_rows:
            for key, value in row.items():
                actual_columns.add(key)
                if key not in column_samples:
                    column_samples[key] = []
                if len(column_samples[key]) < 5:  # Keep up to 5 samples
                    column_samples[key].append(value)

        known_names = {col["name"] for col in self.known_schema}

        # Detect additions
        added = actual_columns - known_names
        # Detect removals
        removed = known_names - actual_columns
        # Detect type changes
        modified = self._detect_type_changes(actual_columns, sample_rows)

        if not added and not removed and not modified:
            return  # No drift detected

        self._proposal_counter += 1
        proposal = SchemaChangeProposal(
            proposal_id=f"PROP-{self._proposal_counter:04d}",
            source_layer="bronze",
            target_layer="silver",
            added_columns=[
                {
                    "name": col,
                    "type": self._infer_type(column_samples.get(col, [])),
                    "sample_values": column_samples.get(col, [])[:3],
                }
                for col in added
            ],
            removed_columns=list(removed),
            modified_columns=modified,
            sample_rows=[
                {col: row.get(col) for col in list(actual_columns)[:10]}
                for row in sample_rows[:3]
            ],
        )

        logger.info(
            f"[{self.agent_id}] Drift detected at {source_label}: "
            f"+{len(added)} cols, -{len(removed)} cols, ~{len(modified)} mods → emitting {proposal.proposal_id}"
        )

        await self.emit(proposal.to_message(sender=self.agent_id))

    def _detect_type_changes(
        self, actual_columns: set[str], rows: list[dict]
    ) -> list[dict[str, Any]]:
        """Detect columns whose actual type differs from the known schema."""
        known_types = {col["name"]: col["type"] for col in self.known_schema}
        modified = []
        for col_name in actual_columns & set(known_types.keys()):
            old_type = known_types[col_name]
            new_type = self._infer_type([row.get(col_name) for row in rows[:10] if col_name in row])
            if old_type != new_type:
                modified.append({
                    "name": col_name,
                    "old_type": old_type,
                    "new_type": new_type,
                    "change_type": "type_modified",
                })
        return modified

    @staticmethod
    def _infer_type(values: list[Any]) -> str:
        """Crude type inference from sample values. Production: use schema registry."""
        if not values:
            return "UNKNOWN"
        non_null = [v for v in values if v is not None]
        if not non_null:
            return "NULLABLE_UNKNOWN"

        sample = non_null[0]
        if isinstance(sample, bool):
            return "BOOLEAN"
        if isinstance(sample, int):
            return "BIGINT"
        if isinstance(sample, float):
            # Check if all values are within DECIMAL range
            return "FLOAT" if any(abs(v) < 0.01 for v in non_null) else "DECIMAL(18,2)"
        if isinstance(sample, datetime):
            return "TIMESTAMP"
        if isinstance(sample, str):
            return "STRING"

        return "STRING"

    async def on_message(self, msg: ArbitrationMessage):
        """Handle messages addressed to the sentinel."""
        if msg.msg_type == MessageType.ARBITRATION_RULING:
            ruling = msg.payload.get("ruling", {})
            logger.info(
                f"[{self.agent_id}] Received ruling {ruling.get('ruling_id')} "
                f"for proposal {ruling.get('proposal_id')}: {ruling.get('ruling')}"
            )

    async def on_broadcast(self, msg: ArbitrationMessage):
        """Handle broadcast messages."""
        pass  # Sentinel primarily emits, not consumes broadcasts
