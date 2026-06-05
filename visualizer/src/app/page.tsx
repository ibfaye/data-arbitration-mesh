'use client'

import AgentTopology from '@/components/AgentTopology'
import TranscriptLog from '@/components/TranscriptLog'
import { useArbitrationWebSocket } from '@/lib/use-arbitration-ws'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765/ws'

export default function Home() {
  const { transcript, phase, connected, runDemo } =
    useArbitrationWebSocket(WS_URL)

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 relative selection:bg-zinc-800 selection:text-zinc-100">
      {/* Subtle background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-gradient-to-b from-blue-900/10 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 relative z-10">
        {/* ─── HEADER ─── */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-4 border-b border-zinc-800/50">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              Autonomous Data Arbitration Mesh
            </h1>
            <p className="text-sm text-zinc-500 font-mono mt-2 flex items-center gap-2">
              <span className="text-blue-400/80">Peer-to-peer negotiation</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span>Constraint Ledger governance</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span>CDP-aware</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection status pill */}
            <div className="flex items-center gap-2.5 text-xs font-mono bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm px-3.5 py-2 rounded-full shadow-inner">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected
                    ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                    : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                }`}
              />
              <span className={connected ? 'text-zinc-300' : 'text-zinc-500'}>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Run button */}
            <button
              onClick={runDemo}
              disabled={
                !connected || phase === 'arbitration' || phase === 'negotiation'
              }
              className="group px-5 py-2.5 rounded-full text-sm font-semibold 
                bg-white text-zinc-950 hover:bg-zinc-100 hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-300 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              {phase === 'idle'
                ? '▶ Run Demo'
                : phase === 'complete'
                  ? '↻ Re-Run Simulation'
                  : '● Running...'}
            </button>
          </div>
        </header>

        {/* ─── TWO-COLUMN LAYOUT ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: Agent Topology */}
          <section className="bg-zinc-900/20 rounded-3xl border border-zinc-800/40 p-1">
            <AgentTopology phase={phase} />
          </section>

          {/* RIGHT: Transcript */}
          <section className="h-[500px]">
            <div className="h-full rounded-2xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-xl shadow-2xl p-5 flex flex-col relative overflow-hidden group hover:border-zinc-700/60 transition-colors duration-500">
              {/* Subtle top glare */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-600/30 to-transparent" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-zinc-800/50 rounded-md">
                    <svg
                      className="w-4 h-4 text-zinc-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h7"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest">
                    Negotiation Ledger
                  </span>
                </div>
                <span className="text-[10px] font-mono font-semibold bg-zinc-800/60 text-zinc-400 px-2.5 py-1 rounded-full border border-zinc-700/50">
                  {transcript.length} events
                </span>
              </div>
              <div className="flex-1 min-h-0 bg-zinc-950/50 rounded-xl border border-zinc-800/50 p-2 shadow-inner">
                <TranscriptLog messages={transcript} />
              </div>
            </div>
          </section>
        </div>

        {/* ─── ENTERPRISE INTEGRATION FOOTER ─── */}
        <footer className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 mt-4 border-t border-zinc-800/50">
          {[
            {
              title: 'Databricks Unity Catalog',
              desc: 'Agent mesh integrates natively for policy enforcement and Delta Live Tables compilation.',
              icon: '⬡',
            },
            {
              title: 'Regulatory Compliance',
              desc: 'Constraint Ledger maps to CDP/GDPR. Ruling transcripts serve as automated audit artifacts.',
              icon: '⚖',
            },
            {
              title: 'Open Source Core',
              desc: 'MIT licensed. Built on DuckDB for portability. Easily replaces with Kafka + Spark.',
              icon: '⎔',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="group rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-5 hover:bg-zinc-800/30 hover:border-zinc-700/60 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400 group-hover:text-blue-400 transition-colors shadow-inner">
                  {card.icon}
                </div>
                <span className="text-sm font-semibold font-sans tracking-wide text-zinc-200">
                  {card.title}
                </span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
                {card.desc}
              </p>
            </div>
          ))}
        </footer>

        {/* ─── DISCLAIMER ─── */}
        <p className="text-[11px] text-zinc-600 text-center font-mono mt-8 pb-4">
          MIT Licensed — Proof of concept. Production deployment supports modern
          data stacks including Confluent, Delta Lake, and Snowflake.
        </p>
      </div>
    </main>
  )
}
