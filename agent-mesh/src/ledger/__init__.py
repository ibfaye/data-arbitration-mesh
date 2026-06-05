"""Constraint Ledger — the shared, immutable governance ruleset.

Design principle (The Org Chart Delusion):
Governance is NOT an agent. It is a shared data structure that every agent
consults independently. There is no "Governance Agent" that acts as a
gatekeeper or approval authority. Each computational peer is responsible
for checking its own compliance against the ledger.

The ledger contains:
- Regulatory rules (CDP/GDPR references)
- Schema compatibility policies
- Data quality thresholds
- PII classification patterns
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import re
from typing import Any, Callable


@dataclass
class ConstraintRule:
    """A single rule in the ledger. Every rule is versioned and immutable after creation."""
    rule_id: str
    name: str
    description: str
    category: str  # "regulatory", "schema", "quality", "security"
    source_ref: str  # e.g. "CDP Art. 42", "GDPR Art. 5(1)(c)", "Internal Policy SEN-FIN-003"
    check: Callable[[dict[str, Any]], tuple[bool, str]]  # Returns (passed, detail)
    severity: str = "mandatory"  # "mandatory", "advisory"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ConstraintLedger:
    """The shared constraint ledger — consulted by all agents, owned by none."""

    def __init__(self):
        self._rules: dict[str, ConstraintRule] = {}
        self._register_default_rules()

    def _register_default_rules(self):
        """Register the default constraint rules used in the demo scenario.

        These rules simulate what would be loaded from a policy-as-code system
        (e.g., OPA/Rego, Azure Policy, Databricks Unity Catalog policies) in production.
        """

        # --- REGULATORY RULES (CDP/GDPR) ---

        def _pii_no_raw_exposure(col_info: dict[str, Any]) -> tuple[bool, str]:
            """CDP Art. 38: PII must be masked before Gold layer exposure."""
            column_name = col_info.get("name", "").lower()
            semantic_role = col_info.get("semantic_role", "").lower()
            sample_values = col_info.get("sample_values", [])

            # PII indicator patterns in column names
            pii_patterns = [
                r"phone", r"email", r"passport", r"national_id", r"cni",
                r"address", r"name", r"dob", r"birth", r"social_security",
                r"num[eé]ro.*t[eé]l", r"adresse", r"nom",
            ]

            # Check if column name matches PII patterns
            for pattern in pii_patterns:
                if re.search(pattern, column_name):
                    return False, f"CDP Art.38: Column '{col_info['name']}' matches PII pattern. Masking required before Gold layer."

            return True, f"CDP Art.38: No PII detected in column '{col_info['name']}'."

        self.add_rule(ConstraintRule(
            rule_id="CDP-ART38-PII-MASKING",
            name="PII Masking Before Gold Layer",
            description="Personally identifiable information must be deterministically masked before reaching the Gold (serving) layer.",
            category="regulatory",
            source_ref="CDP Art. 38",
            check=_pii_no_raw_exposure,
            severity="mandatory",
        ))

        def _data_minimization(col_info: dict[str, Any]) -> tuple[bool, str]:
            """CDP Art. 42: Data minimization — only collect what is necessary."""
            # For demo: reject columns with overly sensitive-looking names
            high_risk = ["biometric", "fingerprint", "dna", "retina", "biométrie"]
            column_name = col_info.get("name", "").lower()
            for risk in high_risk:
                if risk in column_name:
                    return False, f"CDP Art.42: Column '{col_info['name']}' exceeds data minimization principle. Justification required."
            return True, f"CDP Art.42: Data minimization OK for '{col_info['name']}'."

        self.add_rule(ConstraintRule(
            rule_id="CDP-ART42-DATA-MINIMIZATION",
            name="Data Minimization",
            description="Only data strictly necessary for the declared purpose may be collected and processed.",
            category="regulatory",
            source_ref="CDP Art. 42",
            check=_data_minimization,
            severity="mandatory",
        ))

        # --- PROFILING / SCORING RULES ---

        def _profiling_column_review(col_info: dict[str, Any]) -> tuple[bool, str]:
            """CDP Art. 53: profiling/scoring columns require masking and justification."""
            column_name = col_info.get("name", "").lower()
            profiling_patterns = [
                r"score", r"rating", r"profile", r"classification",
                r"segment", r"tier", r"risk", r"fraud",
            ]
            for pattern in profiling_patterns:
                if re.search(pattern, column_name):
                    return False, (
                        f"CDP Art.53: Column '{col_info['name']}' matches profiling/scoring pattern. "
                        f"Masking required before Gold layer + data protection impact assessment."
                    )
            return True, f"No profiling concern for '{col_info['name']}'."

        self.add_rule(ConstraintRule(
            rule_id="CDP-ART53-PROFILING-MASKING",
            name="Profiling Column Masking",
            description="Columns used for scoring, profiling, or individual classification must be masked and justified with a DPIA.",
            category="regulatory",
            source_ref="CDP Art. 53",
            check=_profiling_column_review,
            severity="mandatory",
        ))

        # --- SCHEMA RULES ---

        def _no_breaking_type_change(col_info: dict[str, Any]) -> tuple[bool, str]:
            """Schema stability: type changes on existing columns need migration."""
            change_type = col_info.get("change_type", "")
            if change_type == "type_modified":
                old_type = col_info.get("old_type", "")
                new_type = col_info.get("new_type", "")
                return False, (
                    f"Breaking type change: '{col_info['name']}' changed from {old_type} "
                    f"to {new_type}. Migration required."
                )
            return True, f"No breaking type change for '{col_info['name']}'."

        self.add_rule(ConstraintRule(
            rule_id="SCHEMA-NO-BREAKING-TYPE",
            name="No Breaking Type Changes Without Migration",
            description="Column type changes that would cause downstream failures must include a migration plan.",
            category="schema",
            source_ref="Internal Policy SEN-DE-001",
            check=_no_breaking_type_change,
            severity="mandatory",
        ))

        # --- QUALITY RULES ---

        def _non_null_threshold(col_info: dict[str, Any]) -> tuple[bool, str]:
            """Quality: new columns must not be >50% null without annotation."""
            null_ratio = col_info.get("null_ratio", 0.0)
            if null_ratio > 0.5:
                return False, (
                    f"Quality threshold: '{col_info['name']}' has {null_ratio:.0%} nulls. "
                    f"Annotate as optional or populate before Gold layer."
                )
            return True, f"Null ratio {null_ratio:.0%} within threshold for '{col_info['name']}'."

        self.add_rule(ConstraintRule(
            rule_id="QUAL-NULL-THRESHOLD",
            name="Null Ratio Threshold",
            description="New columns with >50% null values must be annotated or populated.",
            category="quality",
            source_ref="Internal Policy SEN-DE-003",
            check=_non_null_threshold,
            severity="advisory",
        ))

        # --- SECURITY RULES ---

        def _no_plaintext_tokens(col_info: dict[str, Any]) -> tuple[bool, str]:
            """Security: detect columns that look like tokens or keys."""
            column_name = col_info.get("name", "").lower()
            token_patterns = [r"token", r"api_key", r"secret", r"password", r"credential"]
            for pattern in token_patterns:
                if re.search(pattern, column_name):
                    return False, (
                        f"SECURITY: Column '{col_info['name']}' appears to contain secrets. "
                        f"Never store plaintext credentials in data pipelines."
                    )
            return True, f"No secrets detected in column '{col_info['name']}'."

        self.add_rule(ConstraintRule(
            rule_id="SEC-NO-PLAINTEXT-SECRETS",
            name="No Plaintext Secrets",
            description="Columns containing credentials, tokens, or secrets must never enter the pipeline raw.",
            category="security",
            source_ref="Internal Policy SEN-SEC-001",
            check=_no_plaintext_tokens,
            severity="mandatory",
        ))

    def add_rule(self, rule: ConstraintRule):
        """Add a rule to the ledger (immutable after addition)."""
        self._rules[rule.rule_id] = rule

    def check_column(self, column_info: dict[str, Any]) -> list[dict[str, Any]]:
        """Check a column against all rules. Returns list of violations."""
        violations = []
        for rule in self._rules.values():
            passed, detail = rule.check(column_info)
            if not passed:
                violations.append({
                    "rule_id": rule.rule_id,
                    "rule_name": rule.name,
                    "severity": rule.severity,
                    "source_ref": rule.source_ref,
                    "detail": detail,
                })
        return violations

    def get_rule(self, rule_id: str) -> ConstraintRule | None:
        """Retrieve a specific rule by ID."""
        return self._rules.get(rule_id)

    def list_rules(self) -> list[dict[str, Any]]:
        """List all rules in the ledger."""
        return [
            {
                "rule_id": r.rule_id,
                "name": r.name,
                "category": r.category,
                "source_ref": r.source_ref,
                "severity": r.severity,
                "description": r.description,
            }
            for r in self._rules.values()
        ]
