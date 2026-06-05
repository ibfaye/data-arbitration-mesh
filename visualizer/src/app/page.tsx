"use client";

import AgentTopology from "@/components/AgentTopology";
import TranscriptLog from "@/components/TranscriptLog";
import { useArbitrationWebSocket } from "@/lib/use-arbitration-ws";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8765/ws";

export default function Home() {
  const { transcript, phase, connected, runDemo } =
    useArbitrationWebSocket(WS_URL);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-4">
        {/* ─── HEADER ─── */}
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold font-mono tracking-tight">
              Autonomous Data Arbitration Mesh
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Peer-to-peer agent negotiation • Constraint Ledger governance • CDP-aware
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connected ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="text-zinc-500">
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>

            {/* Run button */}
            <button
              onClick={runDemo}
              disabled={!connected || phase === "arbitration" || phase === "negotiation"}
              className="px-4 py-2 rounded-lg text-sm font-mono font-semibold
                bg-zinc-100 text-zinc-950 hover:bg-zinc-200
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all active:scale-95"
            >
              {phase === "idle"
                ? "▶ Run Demo"
                : phase === "complete"
                ? "↻ Re-Run"
                : "● Running..."}
            </button>
          </div>
        </header>

        {/* ─── TWO-COLUMN LAYOUT ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: Agent Topology */}
          <section>
            <AgentTopology phase={phase} />
          </section>

          {/* RIGHT: Transcript */}
          <section className="h-[420px]">
            <div className="h-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Negotiation Transcript
                </span>
                <span className="text-[10px] font-mono text-zinc-600">
                  {transcript.length} messages
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <TranscriptLog messages={transcript} />
              </div>
            </div>
          </section>
        </div>

        {/* ─── ENTERPRISE INTEGRATION FOOTER ─── */}
        <footer className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {[
            {
              title: "Databricks",
              desc: "Agent mesh integrates with Unity Catalog for policy enforcement and Delta Live Tables for pipeline compilation.",
              icon: "⬡",
            },
            {
              title: "CDP / GDPR",
              desc: "Constraint Ledger maps to regulatory articles. Ruling transcripts serve as audit artifacts for compliance reviews.",
              icon: "⚖",
            },
            {
              title: "Open Source",
              desc: "MIT licensed. DuckDB for portability. Replace with Kafka + Spark in production. Zero vendor lock-in.",
              icon: "⎔",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-zinc-600 text-sm">{card.icon}</span>
                <span className="text-xs font-semibold font-mono text-zinc-300">
                  {card.title}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </footer>

        {/* ─── DISCLAIMER ─── */}
        <p className="text-[10px] text-zinc-700 text-center font-mono">
          MIT Licensed — Proof of concept. Production deployment uses Google ADK,
          Apache Kafka, Delta Lake, and Databricks Unity Catalog.
        </p>
      </div>
    </main>
  );
}
