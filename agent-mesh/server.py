"""API Server — bridges the agent mesh to the visualization frontend via WebSocket.

Runs the demo simulation, captures the transcript from the MessageBus,
and streams it to connected WebSocket clients in real time.
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from src.protocol import MessageBus
from src.ledger import ConstraintLedger
from src.agents import SchemaSentinel, ContractEnforcer, ArbitrationEngine, PipelineCompiler
from src.protocol import ContractDeclaration
from src.simulation.data import INITIAL_SCHEMA, CHANGED_SCHEMA, SimulationState, generate_changed_rows

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

# ─── Global state (in production: use Redis or similar) ───
_active_demos: dict[str, dict] = {}


class DemoRunner:
    """Runs the arbitration demo and streams messages to WebSocket clients."""

    def __init__(self):
        self.bus: MessageBus | None = None
        self.ledger: ConstraintLedger | None = None
        self.clients: set[WebSocket] = set()
        self.state = SimulationState()
        self._running = False

    async def add_client(self, ws: WebSocket):
        await ws.accept()
        self.clients.add(ws)
        logger.info(f"WebSocket client connected ({len(self.clients)} total)")

    def remove_client(self, ws: WebSocket):
        self.clients.discard(ws)
        logger.info(f"WebSocket client disconnected ({len(self.clients)} total)")

    async def broadcast(self, event: dict):
        """Send an event to all connected WebSocket clients."""
        message = json.dumps(event)
        dead: list[WebSocket] = []
        for ws in self.clients:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.remove_client(ws)

    async def _push_transcript_snapshot(self):
        """Send current transcript to all clients."""
        if self.bus:
            await self.broadcast({
                "type": "transcript_update",
                "transcript": self.bus.get_transcript(),
                "phase": self.state.phase,
            })

    async def run_demo(self):
        """Run the full demo, streaming progress to connected clients."""
        if self._running:
            await self.broadcast({"type": "error", "message": "Demo already running."})
            return

        self._running = True
        self.bus = MessageBus()
        self.ledger = ConstraintLedger()

        await self.bus.start()

        # ─── Create agents ───
        sentinel = SchemaSentinel(self.bus, self.ledger)

        compliance_enforcer = ContractEnforcer(
            self.bus,
            self.ledger,
            ContractDeclaration(
                contract_id="CONTRACT-COMPLIANCE-001",
                enforcer_id="",  # Fixed after init
                required_columns=[
                    {"name": "transaction_id", "type": "STRING", "semantic_role": "primary_key"},
                    {"name": "customer_id", "type": "STRING", "semantic_role": "foreign_key_anonymized"},
                    {"name": "amount_xof", "type": "DECIMAL(18,2)", "semantic_role": "metric"},
                    {"name": "transaction_type", "type": "STRING", "semantic_role": "dimension"},
                    {"name": "timestamp_utc", "type": "TIMESTAMP", "semantic_role": "temporal_partition"},
                ],
                constraints=[
                    {"rule": "CDP-ART38-PII-MASKING"},
                ],
            ),
            name="Compliance Dashboard Enforcer",
        )

        risk_enforcer = ContractEnforcer(
            self.bus,
            self.ledger,
            ContractDeclaration(
                contract_id="CONTRACT-RISK-001",
                enforcer_id="",
                required_columns=[
                    {"name": "transaction_id", "type": "STRING", "semantic_role": "primary_key"},
                    {"name": "amount_xof", "type": "DECIMAL(18,2)", "semantic_role": "metric"},
                    {"name": "currency", "type": "STRING", "semantic_role": "dimension"},
                    {"name": "channel", "type": "STRING", "semantic_role": "dimension"},
                    {"name": "risk_score", "type": "FLOAT", "semantic_role": "metric"},
                    {"name": "counterparty_country", "type": "STRING", "semantic_role": "dimension"},
                ],
            ),
            name="Risk Model Enforcer",
        )

        arbiter = ArbitrationEngine(self.bus, self.ledger, ruling_delay=2.0)
        compiler = PipelineCompiler(self.bus)

        # Fix enforcer contract IDs
        compliance_enforcer.contract.enforcer_id = compliance_enforcer.agent_id
        risk_enforcer.contract.enforcer_id = risk_enforcer.agent_id

        # Start all agents
        await sentinel.start()
        await compliance_enforcer.start()
        await risk_enforcer.start()
        await arbiter.start()
        await compiler.start()

        sentinel.set_known_schema(INITIAL_SCHEMA["columns"])

        # ─── PHASE 1: CONTRACT DECLARATION ───
        self.state.phase = "negotiation"
        await self.broadcast({
            "type": "phase_change",
            "phase": "negotiation",
            "message": "Contract Enforcers declaring their semantic needs..."
        })

        await compliance_enforcer.declare_contract()
        await asyncio.sleep(0.3)
        await risk_enforcer.declare_contract()
        await asyncio.sleep(0.3)
        await self._push_transcript_snapshot()

        # ─── PHASE 2: SCHEMA DRIFT ───
        self.state.phase = "schema_drift_detected"
        await self.broadcast({
            "type": "phase_change",
            "phase": "schema_drift_detected",
            "message": "Core banking system upgraded: v4.2 → v4.3. New columns detected.",
        })

        # Brief pause for dramatic effect in the UI
        await asyncio.sleep(0.5)

        changed_rows = generate_changed_rows(500)
        self.state.current_schema = CHANGED_SCHEMA["columns"]

        await self.broadcast({
            "type": "schema_drift",
            "previous_schema": INITIAL_SCHEMA["columns"],
            "new_schema": CHANGED_SCHEMA["columns"],
            "added_columns": ["risk_score", "counterparty_country"],
            "source": "core_banking_system_v4.3",
        })

        await sentinel.scan_incoming(changed_rows, "core_banking_system_v4.3")
        await self._push_transcript_snapshot()

        # ─── PHASE 3: ARBITRATION ───
        self.state.phase = "arbitration"
        await self.broadcast({
            "type": "phase_change",
            "phase": "arbitration",
            "message": "Arbitration Engine deliberating — sampling evidence, applying CDP rules..."
        })

        # Wait for the arbiter to deliberate and the compiler to emit the plan
        await asyncio.sleep(4.0)
        await self._push_transcript_snapshot()

        # ─── PHASE 4: DONE ───
        self.state.phase = "complete"
        await self._push_transcript_snapshot()

        await self.broadcast({
            "type": "phase_change",
            "phase": "complete",
            "message": "Negotiation complete. Pipeline updated autonomously.",
        })

        await self.bus.stop()
        self._running = False
        logger.info("Demo complete")


# ─── FastAPI App ───

demo_runner = DemoRunner()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    logger.info("Data Arbitration Mesh API starting...")
    yield
    logger.info("Data Arbitration Mesh API shutting down...")


app = FastAPI(
    title="Data Arbitration Mesh API",
    description="Real-time streaming API for the autonomous data arbitration demo.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "ok", "service": "data-arbitration-mesh"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """WebSocket endpoint for real-time transcript streaming."""
    await demo_runner.add_client(ws)
    try:
        # Send current state if available
        if demo_runner.bus:
            await ws.send_text(json.dumps({
                "type": "transcript_update",
                "transcript": demo_runner.bus.get_transcript(),
                "phase": demo_runner.state.phase,
            }))

        # Keep the connection alive, listening for control messages
        while True:
            data = await ws.receive_text()
            try:
                command = json.loads(data)
                if command.get("action") == "run_demo":
                    # Run the demo in the background, streaming to all clients
                    asyncio.create_task(demo_runner.run_demo())
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        demo_runner.remove_client(ws)


@app.post("/demo/run")
async def trigger_demo():
    """HTTP endpoint to trigger the demo."""
    if demo_runner._running:
        return {"status": "error", "message": "Demo already running."}
    asyncio.create_task(demo_runner.run_demo())
    return {"status": "ok", "message": "Demo started. Connect via WebSocket at /ws"}


@app.get("/ledger/rules")
async def list_rules():
    """List all constraint ledger rules."""
    ledger = demo_runner.ledger or ConstraintLedger()
    return {"rules": ledger.list_rules()}


@app.get("/transcript")
async def get_transcript():
    """Return the current negotiation transcript."""
    if demo_runner.bus:
        return {
            "transcript": demo_runner.bus.get_transcript(),
            "phase": demo_runner.state.phase,
        }
    return {"transcript": [], "phase": "idle"}


@app.get("/health")
async def health():
    return {"status": "healthy", "demo_running": demo_runner._running}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
