# Autonomous Data Arbitration Mesh

**Open-source proof-of-concept: computational agents negotiate schema changes, enforce regulatory compliance, and produce auditable decision ledgers — without a human in the loop.**

> **The Org Chart Delusion:** this mesh explicitly rejects the anti-pattern of mirroring human organizational structures in software. Agents are computational peers named by function (Scanner, Validator, Arbiter, Compiler), not job titles. Governance is a shared **Constraint Ledger** every agent consults independently — not a "Governance Agent" acting as a gatekeeper.

---

## What This Is

A peer-to-peer multi-agent mesh where:

1. A **Schema Sentinel** detects drift at pipeline boundaries and emits proposals
2. **Contract Enforcers** validate proposals against the shared Constraint Ledger — including regulatory rules (CDP Art.38, Art.42)
3. An **Arbitration Engine** breaks deadlocks by sampling evidence and issuing binding rulings
4. A **Pipeline Compiler** translates rulings into executable remediation plans

The entire negotiation is **fully autonomous**, produces an **immutable audit transcript**, and takes under 3 seconds of wall-clock time.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│              PEER-TO-PEER AGENT MESH              │
│                                                   │
│   Schema Sentinel ──┬── Compliance Enforcer       │
│        │            │         │                   │
│        │            │         │                   │
│        ├──── Arbitration Engine ────┤             │
│        │            │              │              │
│        │    Risk Model Enforcer    │              │
│        │                           │              │
│        └───── Pipeline Compiler ◄──┘              │
│                                                   │
│   ┌───────────────────────────────────────────┐   │
│   │       CONSTRAINT LEDGER (shared)          │   │
│   │  CDP Art.38 • CDP Art.42 • SEN-FIN-003  │   │
│   └───────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

**Key design decisions:**

| Aspect | Traditional Pipeline | Arbitration Mesh |
|---|---|---|
| Schema changes | Human PR review cycle | Autonomous agent negotiation |
| Governance | PDF policy docs, manual audits | Machine-readable Constraint Ledger, auto-enforced |
| Contract enforcement | Stale YAML files | Living semantic contracts, renegotiated on drift |
| Audit trail | Manual logging | Immutable negotiation transcript, regulator-ready |
| Communication | Producer dictates schema | **Consumers declare needs, mesh negotiates delivery** (SCAMPER-R) |

---

## Run It In 60 Seconds

```bash
git clone https://github.com/senanalytics/data-arbitration-mesh
cd data-arbitration-mesh
docker compose up
```

Then open **http://localhost:3000** — click **"Run Demo"** and watch the agents negotiate live.

The visualization shows:
- The mesh topology with live pulse animations
- A real-time streaming negotiation transcript
- Phase transitions: Negotiation → Schema Drift → Arbitration → Resolution

---

## The Demo Scenario

**"The Breaking Schema Change"**

A West African fintech's core banking system upgrades from v4.2 to v4.3, silently adding two new columns (`risk_score`, `counterparty_country`) to the Bronze layer feed. The Schema Sentinel detects the drift and proposes the change. Two Contract Enforcers — one for a compliance dashboard, one for a risk model — independently validate the proposal against the Constraint Ledger.

- **Compliance Enforcer** raises a CDP Art.38 violation: `risk_score` could be PII-derivable
- **Risk Model Enforcer** eagerly wants both new columns — no violations
- **Arbitration Engine** samples the data, finds no PII risk (normalized floats, not identifiable), and rules: **ACCEPTED WITH CONDITIONS** — apply masking before Gold layer
- **Pipeline Compiler** generates the remediation plan: apply `deterministic_hash` + `per_customer_salt` → apply schema → notify consumers

**Watch the entire negotiation happen in real-time in the visualization.**

---

## Enterprise Integration Paths

This demo uses DuckDB for portability. The same agent mesh architecture integrates with:

### Databricks
- **Schema Sentinel** → Unity Catalog schema change detection
- **Contract Enforcers** → UC policies enforced by agents
- **Pipeline Compiler** → Delta Live Tables pipeline updates
- **Constraint Ledger** → Unity Catalog tags + policy definitions

### dbt Cloud
- **Pipeline Compiler** → dbt model diffs via API
- **Constraint Ledger** → dbt source freshness + schema tests

### Kafka / Confluent
- **MessageBus** → Kafka topics (replace `MessageBus` with `KafkaProducer`/`KafkaConsumer`)
- **Schema Sentinel** → Schema Registry change listener

### Airflow / Dagster
- **Pipeline Compiler** → DAG generation from rulings

---

## Project Structure

```
data-arbitration-mesh/
├── docker-compose.yml
├── agent-mesh/                    # Python: FastAPI + WebSocket server
│   ├── server.py                  # API entry point
│   ├── src/
│   │   ├── protocol/              # ArbitrationMessage types + MessageBus
│   │   │   ├── envelope.py        # Typed message dataclasses
│   │   │   └── bus.py             # Pub/sub message dispatch
│   │   ├── ledger/                # Constraint Ledger (rules engine)
│   │   │   └── __init__.py        # CDP/GDPR rule definitions
│   │   ├── agents/                # Computational peers
│   │   │   ├── sentinel.py        # Schema drift detection
│   │   │   ├── enforcer.py        # Contract validation
│   │   │   ├── arbiter.py         # Dispute resolution
│   │   │   └── compiler.py        # Remediation plan generation
│   │   └── simulation/            # Synthetic data + scenario
│   │       ├── data.py            # Fintech data generator
│   │       └── runner.py          # Simulation orchestrator
│   └── requirements.txt
└── visualizer/                    # Next.js 16: streaming UI
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx           # Main dashboard
    │   │   └── layout.tsx         # Root layout
    │   ├── components/
    │   │   ├── AgentTopology.tsx   # Mesh topology visualization
    │   │   └── TranscriptLog.tsx   # Streaming transcript
    │   └── lib/
    │       └── use-arbitration-ws.ts  # WebSocket hook
    └── Dockerfile
```

---

## Design Philosophy

### No Org Chart Mirroring

Every agent is named by its **computational function**, not a human job title:
- **Schema Sentinel** → boundary scanner (not "Data Producer")
- **Contract Enforcer** → semantic validator (not "Business Analyst")
- **Arbitration Engine** → deadlock breaker (not "Manager" or "Governance Board")
- **Pipeline Compiler** → plan generator (not "DevOps Engineer")

### Governance is Data, Not Authority

The Constraint Ledger is a **shared data structure** consulted by every agent independently. There is no "Governance Agent" that approves or rejects. Every computational peer is responsible for checking its own compliance.

### SCAMPER-R: Consumers Drive the Pipeline

Traditional: `Producer defines schema → Consumers adapt`  
This mesh: **`Consumers declare semantic needs → Mesh negotiates delivery`**

This is not just an inversion — it's an architectural principle. Downstream consumers are the ones with the clearest view of what data they need and what constraints apply. The mesh should figure out how to produce it.

---

## Regulatory Context

The Constraint Ledger includes rules mapped to:

- **CDP (Commission de Protection des Données Personnelles du Sénégal)** — Art.38 (PII masking), Art.42 (data minimization)
- **GDPR** — Art.5(1)(c) (data minimization), Art.32 (security)
- **Internal policies** — schema stability, null thresholds, secrets handling

In production, these rules can be loaded from policy-as-code systems (OPA/Rego, Azure Policy, Databricks Unity Catalog policies).

---

## License

MIT — use it, fork it, deploy it. If you build something on top of it, we'd love to hear about it.

---

## About Sen'Analytics

We build enterprise data infrastructure and autonomous agent systems for financial institutions, telecoms, and high-growth companies in West Africa and North America. This demo is a provocation — a proof that data governance can be computational, autonomous, and regulator-ready.

**Website:** [senanalytics.sn](https://senanalytics.sn) (coming soon)  
**Contact:** Build something with us → [engineering@senanalytics.sn](mailto:engineering@senanalytics.sn)
