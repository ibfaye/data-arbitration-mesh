"""Simulation runner — wires agents together and executes the breaking schema change scenario.

This is the main entry point that:
1. Creates the MessageBus and ConstraintLedger
2. Instantiates all computational agents
3. Declares downstream contracts
4. Triggers schema drift
5. Lets the negotiation play out autonomously
"""

import asyncio
import logging
from datetime import datetime, timezone

from ..protocol import MessageBus, ContractDeclaration, ProposalStatus
from ..ledger import ConstraintLedger
from ..agents import SchemaSentinel, ContractEnforcer, ArbitrationEngine, PipelineCompiler
from .data import (
    INITIAL_SCHEMA,
    SimulationState,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("arbitration-demo")


async def run_demo() -> SimulationState:
    """Run the full autonomous data arbitration demo.

    Returns the SimulationState containing the complete transcript,
    ready for the visualization layer to consume.
    """
    state = SimulationState()

    # ─── INFRASTRUCTURE ───
    bus = MessageBus()
    await bus.start()

    ledger = ConstraintLedger()

    # ─── COMPUTATIONAL AGENTS (peers, not org chart mirrors) ───
    sentinel = SchemaSentinel(bus, ledger)

    # Two Contract Enforcers — each representing a different downstream need
    compliance_enforcer = ContractEnforcer(
        bus,
        ledger,
        ContractDeclaration(
            contract_id="CONTRACT-COMPLIANCE-001",
            enforcer_id="enforcer_0",  # Will be updated after init
            required_columns=[
                {"name": "transaction_id", "type": "STRING", "semantic_role": "primary_key"},
                {"name": "customer_id", "type": "STRING", "semantic_role": "foreign_key_anonymized"},
                {"name": "amount_xof", "type": "DECIMAL(18,2)", "semantic_role": "metric"},
                {"name": "transaction_type", "type": "STRING", "semantic_role": "dimension"},
                {"name": "timestamp_utc", "type": "TIMESTAMP", "semantic_role": "temporal_partition"},
            ],
            constraints=[
                {"rule": "CDP-ART38-PII-MASKING", "detail": "All customer identifiers masked in Gold"},
                {"rule": "FRESHNESS", "detail": "Gold layer updated within 15 minutes of Bronze arrival"},
            ],
            freshness_sla_seconds=900,
        ),
        name="Compliance Dashboard Enforcer",
    )

    risk_enforcer = ContractEnforcer(
        bus,
        ledger,
        ContractDeclaration(
            contract_id="CONTRACT-RISK-001",
            enforcer_id="enforcer_1",  # Will be updated after init
            required_columns=[
                {"name": "transaction_id", "type": "STRING", "semantic_role": "primary_key"},
                {"name": "amount_xof", "type": "DECIMAL(18,2)", "semantic_role": "metric"},
                {"name": "currency", "type": "STRING", "semantic_role": "dimension"},
                {"name": "channel", "type": "STRING", "semantic_role": "dimension"},
                {"name": "risk_score", "type": "FLOAT", "semantic_role": "metric"},  # eagerly wants this
                {"name": "counterparty_country", "type": "STRING", "semantic_role": "dimension"},
            ],
            constraints=[
                {"rule": "CDP-ART42-DATA-MINIMIZATION", "detail": "No unnecessary PII for risk modeling"},
            ],
        ),
        name="Risk Model Enforcer",
    )

    arbiter = ArbitrationEngine(bus, ledger, ruling_delay=2.0)
    compiler = PipelineCompiler(bus)

    # Fix the enforcer_id references in contracts
    compliance_enforcer.contract.enforcer_id = compliance_enforcer.agent_id
    risk_enforcer.contract.enforcer_id = risk_enforcer.agent_id

    # ─── START ALL AGENTS ───
    await sentinel.start()
    await compliance_enforcer.start()
    await risk_enforcer.start()
    await arbiter.start()
    await compiler.start()

    # Set the sentinel's baseline schema
    sentinel.set_known_schema(INITIAL_SCHEMA["columns"])

    # ─── PHASE 1: ENFORCERS DECLARE THEIR CONTRACTS ───
    state.phase = "negotiation"
    logger.info("=== PHASE 1: Contract Enforcers declare their needs ===")
    await compliance_enforcer.declare_contract()
    await asyncio.sleep(0.5)
    await risk_enforcer.declare_contract()
    await asyncio.sleep(1.0)

    # ─── PHASE 2: TRIGGER SCHEMA DRIFT ───
    state.trigger_schema_drift()
    logger.info(f"=== PHASE 2: Schema drift triggered — {state.events[-1]['detail']} ===")

    # Send the changed data to the sentinel for scanning
    await sentinel.scan_incoming(state.bronze_rows, "core_banking_system_v4.3")

    # ─── PHASE 3: LET THE MESH NEGOTIATE AUTONOMOUSLY ───
    logger.info("=== PHASE 3: Agents negotiating autonomously... ===")
    # The Arbitration Engine deliberates for ~2 seconds (simulated),
    # then issues a ruling. The Pipeline Compiler consumes the ruling
    # and emits a remediation plan. All of this happens via the bus.
    await asyncio.sleep(5.0)  # Give the mesh time to resolve

    # ─── PHASE 4: CAPTURE THE TRANSCRIPT ───
    state.phase = "complete"
    state.transcript = bus.get_transcript()

    logger.info(f"=== DEMO COMPLETE: {len(state.transcript)} messages exchanged ===")

    await bus.stop()
    return state


def run_demo_sync() -> dict:
    """Synchronous wrapper — returns transcript as dict for API consumption."""
    state = asyncio.run(run_demo())
    return {
        "transcript": state.transcript,
        "events": state.events,
        "summary": _summarize_transcript(state.transcript),
    }


def _summarize_transcript(transcript: list[dict]) -> dict:
    """Summarize the negotiation transcript for the visualization header."""
    if not transcript:
        return {"total_messages": 0, "outcome": "No negotiation occurred."}

    msg_types = {}
    for msg in transcript:
        t = msg.get("msg_type", "unknown")
        msg_types[t] = msg_types.get(t, 0) + 1

    # Find the final ruling
    rulings = [
        m for m in transcript
        if m.get("msg_type") == "arbitration_ruling"
    ]
    outcome = "pending"
    if rulings:
        ruling_data = rulings[-1].get("payload", {}).get("ruling", {})
        outcome = ruling_data.get("ruling", "unknown")

    # Find the final plan
    plans = [
        m for m in transcript
        if m.get("msg_type") == "remediation_plan"
    ]
    steps = []
    if plans:
        steps = plans[-1].get("payload", {}).get("plan", {}).get("steps", [])

    return {
        "total_messages": len(transcript),
        "duration_seconds": "~5s (simulated)",
        "outcome": outcome,
        "message_breakdown": msg_types,
        "ruling_reasoning": rulings[-1].get("payload", {}).get("ruling", {}).get("reasoning", "")
        if rulings else "",
        "remediation_steps": steps,
    }


if __name__ == "__main__":
    result = run_demo_sync()
    import json
    print(json.dumps(result["summary"], indent=2))
