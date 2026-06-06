'use client'

import AgentTopology from '@/components/AgentTopology'
import TranscriptLog from '@/components/TranscriptLog'
import { useArbitrationWebSocket } from '@/lib/use-arbitration-ws'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8765/ws";

export default function Home() {
  const { transcript, phase, connected, runDemo, activityPulse } =
    useArbitrationWebSocket(WS_URL);

  const isIdle = phase === "idle";
  const isRunning = phase !== "idle" && phase !== "complete";
  const isComplete = phase === "complete";

  return (
    <main className="min-h-screen gradient-surface">
      <div className="max-w-[1440px] mx-auto px-5 py-6 md:px-8 md:py-8 space-y-5">
        {/* ─── HEADER ─── */}
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.3)]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="3" r="1.5" fill="white" />
                  <circle cx="3" cy="10" r="1.5" fill="white" opacity="0.7" />
                  <circle cx="13" cy="10" r="1.5" fill="white" opacity="0.7" />
                  <circle cx="8" cy="13" r="1.5" fill="white" opacity="0.5" />
                  <line x1="8" y1="4.5" x2="4" y2="8.8" stroke="white" strokeWidth="0.6" opacity="0.3" />
                  <line x1="8" y1="4.5" x2="12" y2="8.8" stroke="white" strokeWidth="0.6" opacity="0.3" />
                  <line x1="4" y1="10.5" x2="7.5" y2="12.5" stroke="white" strokeWidth="0.6" opacity="0.3" />
                  <line x1="12" y1="10.5" x2="8.5" y2="12.5" stroke="white" strokeWidth="0.6" opacity="0.3" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#eeeef5] tracking-tight">
                  Data Arbitration Mesh
                </h1>
                <p className="text-[11px] font-mono text-[#6b6b80] tracking-[0.05em] uppercase">
                  Autonomous • Peer-to-Peer • CDP-Aware
                </p>
              </div>
            </div>
          </div>

          {/* Status + CTA */}
          <div className="flex items-center gap-4">
            {/* Connection pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1e1e2e] bg-[#0d0d14]/80">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connected
                    ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                    : "bg-red-500"
                }`}
              />
              <span className="text-[10px] font-mono text-[#6b6b80]">
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>

            {/* Run button */}
            <button
              onClick={runDemo}
              disabled={!connected || isRunning}
              className="btn-run px-6 py-2.5 rounded-xl text-sm font-mono"
            >
              {isIdle ? "▶ Run Demo" : isComplete ? "↻ Re-Run" : "● Running…"}
            </button>
          </div>
        </header>

        {/* ─── TWO-COLUMN MAIN CONTENT ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* LEFT: Topology — takes 3/5 */}
          <section className="lg:col-span-3">
            <AgentTopology phase={phase} activityPulse={activityPulse} />
          </section>

          {/* RIGHT: Transcript — takes 2/5 */}
          <section className="lg:col-span-2 h-[440px]">
            <div className="h-full rounded-2xl border border-[#1e1e2e] gradient-card p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" className="text-[#8b5cf6]">
                    <rect x="0" y="0" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    <line x1="3" y1="4" x2="9" y2="4" stroke="currentColor" strokeWidth="0.4" />
                    <line x1="3" y1="6" x2="7" y2="6" stroke="currentColor" strokeWidth="0.4" />
                    <line x1="3" y1="8" x2="8" y2="8" stroke="currentColor" strokeWidth="0.4" />
                  </svg>
                  <span className="text-[11px] font-semibold font-mono text-[#a0a0b8] uppercase tracking-[0.15em]">
                    Negotiation Transcript
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#4a4a5e] tabular-nums">
                  {transcript.length} msg{transcript.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex-1 min-h-0 bg-zinc-950/50 rounded-xl border border-zinc-800/50 p-2 shadow-inner">
                <TranscriptLog messages={transcript} />
              </div>
            </div>
          </section>
        </div>

        {/* ─── ENTERPRISE INTEGRATION CARDS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              title: "Databricks Unity Catalog",
              desc: "Constraint Ledger maps to UC policies. Pipeline Compiler emits Delta Live Tables updates. Agent mesh runs alongside your existing lakehouse.",
              accent: "from-blue-500/10 to-transparent",
              icon: "⬡",
            },
            {
              title: "CDP & GDPR Compliant",
              desc: "Every ruling is an immutable audit artifact. The Constraint Ledger encodes regulatory articles as machine-checkable rules. Regulators get the transcript, not a PDF.",
              accent: "from-violet-500/10 to-transparent",
              icon: "⚖",
            },
            {
              title: "Zero Vendor Lock-In",
              desc: "MIT licensed. DuckDB for portability. Replace MessageBus with Kafka, Sentinel with Schema Registry, Compiler with dbt — the protocol stays the same.",
              accent: "from-emerald-500/10 to-transparent",
              icon: "⎔",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#1e1e2e] gradient-card p-4 group hover:border-[#2a2a3e] transition-all duration-300"
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="text-lg text-[#6b6b80] group-hover:text-[#a0a0b8] transition-colors">
                  {card.icon}
                </span>
                <span className="text-[12px] font-semibold font-mono text-[#a0a0b8]">
                  {card.title}
                </span>
              </div>
              <p className="text-[11px] text-[#6b6b80] leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>

        {/* ─── FOOTER ─── */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1e1e2e]">
          <p className="text-[10px] font-mono text-[#4a4a5e]">
            MIT Licensed — Proof of concept. Production: Google ADK, Kafka, Delta Lake, Databricks Unity Catalog.
          </p>
          <a
            href="https://senanalytics.sn"
            className="text-[10px] font-mono text-[#6b6b80] hover:text-[#a0a0b8] transition-colors"
          >
            senanalytics.sn
          </a>
        </div>
      </div>
    </main>
  )
}
