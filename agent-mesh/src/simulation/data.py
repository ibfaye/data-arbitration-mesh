"""Synthetic fintech data generator — realistic enough to demonstrate the arbitration scenario.

Generates a "bronze layer" dataset that simulates a core banking system feed,
then introduces a breaking schema change (new column + type drift) to trigger
the full arbitration workflow.
"""

import random
import string
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from typing import Any


# ─── Initial stable schema (the "before" state) ───

INITIAL_SCHEMA = {
    "columns": [
        {"name": "transaction_id", "type": "STRING", "nullable": False},
        {"name": "account_id", "type": "STRING", "nullable": False},
        {"name": "customer_id", "type": "STRING", "nullable": False},
        {"name": "amount_xof", "type": "DECIMAL(18,2)", "nullable": False},
        {"name": "currency", "type": "STRING", "nullable": False},
        {"name": "transaction_type", "type": "STRING", "nullable": False},
        {"name": "channel", "type": "STRING", "nullable": True},
        {"name": "merchant_category", "type": "STRING", "nullable": True},
        {"name": "timestamp_utc", "type": "TIMESTAMP", "nullable": False},
    ],
    "source": "core_banking_system_v4.2",
    "layer": "bronze",
}

# ─── After the schema change (the "after" state) ───

CHANGED_SCHEMA = {
    "columns": [
        {"name": "transaction_id", "type": "STRING", "nullable": False},
        {"name": "account_id", "type": "STRING", "nullable": False},
        {"name": "customer_id", "type": "STRING", "nullable": False},
        {"name": "amount_xof", "type": "DECIMAL(18,2)", "nullable": False},
        {"name": "currency", "type": "STRING", "nullable": False},
        {"name": "transaction_type", "type": "STRING", "nullable": False},
        {"name": "channel", "type": "STRING", "nullable": True},
        {"name": "merchant_category", "type": "STRING", "nullable": True},
        {"name": "timestamp_utc", "type": "TIMESTAMP", "nullable": False},
        # ─── THE SCHEMA DRIFT ───
        {
            "name": "risk_score",  # NEW: added by upstream core banking system
            "type": "FLOAT",
            "nullable": True,
        },
        {
            "name": "counterparty_country",  # NEW: added for cross-border compliance
            "type": "STRING",
            "nullable": True,
        },
    ],
    "source": "core_banking_system_v4.3",  # Version bump triggered it
    "layer": "bronze",
}


# ─── Data generators ───

CURRENCIES = ["XOF", "XOF", "XOF", "EUR", "USD"]  # XOF-weighted for West African realism
TRANSACTION_TYPES = ["transfer", "purchase", "withdrawal", "deposit", "bill_payment"]
CHANNELS = ["mobile", "pos", "atm", "online", "agency", None]
MERCHANT_CATEGORIES = [
    "groceries", "telecom", "transport", "utilities", "healthcare",
    "education", "restaurant", "agriculture", None, None,  # Some nulls for realism
]
COUNTRIES = ["SN", "SN", "SN", "CI", "ML", "BF", "FR", "CN", "US"]  # Senegal-weighted


def _rand_id(prefix: str = "", length: int = 10) -> str:
    chars = string.ascii_uppercase + string.digits
    return prefix + "".join(random.choices(chars, k=length))


def generate_initial_rows(n: int = 500) -> list[dict[str, Any]]:
    """Generate rows matching the INITIAL_SCHEMA."""
    base_time = datetime.now(timezone.utc) - timedelta(hours=24)
    rows = []
    for i in range(n):
        rows.append({
            "transaction_id": _rand_id("TXN"),
            "account_id": _rand_id("ACC"),
            "customer_id": _rand_id("CUST"),
            "amount_xof": round(random.uniform(500, 5_000_000), 2),
            "currency": random.choice(CURRENCIES),
            "transaction_type": random.choice(TRANSACTION_TYPES),
            "channel": random.choice(CHANNELS),
            "merchant_category": random.choice(MERCHANT_CATEGORIES),
            "timestamp_utc": base_time + timedelta(seconds=i * 173),
        })
    return rows


def generate_changed_rows(n: int = 500) -> list[dict[str, Any]]:
    """Generate rows matching the CHANGED_SCHEMA — with the two new columns."""
    base_time = datetime.now(timezone.utc) - timedelta(hours=1)
    rows = []
    for i in range(n):
        rows.append({
            "transaction_id": _rand_id("TXN"),
            "account_id": _rand_id("ACC"),
            "customer_id": _rand_id("CUST"),
            "amount_xof": round(random.uniform(500, 5_000_000), 2),
            "currency": random.choice(CURRENCIES),
            "transaction_type": random.choice(TRANSACTION_TYPES),
            "channel": random.choice(CHANNELS),
            "merchant_category": random.choice(MERCHANT_CATEGORIES),
            "timestamp_utc": base_time + timedelta(seconds=i * 7),
            # ─── NEW COLUMNS ───
            "risk_score": round(random.uniform(0.0, 1.0), 4),
            "counterparty_country": random.choice(COUNTRIES),
        })
    return rows


@dataclass
class SimulationState:
    """Holds the current simulation state for the visualization to consume."""
    phase: str = "idle"  # idle → schema_drift_detected → negotiation → arbitration → remediation → complete
    current_schema: list[dict] = field(default_factory=lambda: INITIAL_SCHEMA["columns"])
    bronze_rows: list[dict] = field(default_factory=generate_initial_rows)
    events: list[dict] = field(default_factory=list)
    transcript: list[dict] = field(default_factory=list)

    def trigger_schema_drift(self):
        """Simulate the upstream core banking system deploying v4.3 with new columns."""
        self.phase = "schema_drift_detected"
        self.current_schema = CHANGED_SCHEMA["columns"]
        self.bronze_rows = generate_changed_rows(500)
        self.events.append({
            "event": "SCHEMA_DRIFT_DETECTED",
            "detail": "Core banking system upgraded from v4.2 → v4.3. "
                      "New columns detected: risk_score (FLOAT), counterparty_country (STRING).",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
