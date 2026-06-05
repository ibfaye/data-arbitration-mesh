"use client";

interface AgentTopologyProps {
  phase: string;
}

const AGENTS = [
  {
    id: "sentinel_0",
    name: "Schema Sentinel",
    role: "Boundary Scanner",
    color: "border-blue-500 text-blue-400",
    glow: "shadow-blue-500/30",
    x: 50,
    y: 15,
  },
  {
    id: "enforcer_0",
    name: "Compliance Enforcer",
    role: "Contract Validator",
    color: "border-violet-500 text-violet-400",
    glow: "shadow-violet-500/30",
    x: 10,
    y: 55,
  },
  {
    id: "enforcer_1",
    name: "Risk Model Enforcer",
    role: "Contract Validator",
    color: "border-violet-500 text-violet-400",
    glow: "shadow-violet-500/30",
    x: 90,
    y: 55,
  },
  {
    id: "arbiter",
    name: "Arbitration Engine",
    role: "Deadlock Breaker",
    color: "border-amber-500 text-amber-400",
    glow: "shadow-amber-500/30",
    x: 50,
    y: 85,
  },
  {
    id: "compiler",
    name: "Pipeline Compiler",
    role: "Plan Generator",
    color: "border-emerald-500 text-emerald-400",
    glow: "shadow-emerald-500/30",
    x: 50,
    y: 105,
  },
];

export default function AgentTopology({ phase }: AgentTopologyProps) {
  const isRunning = phase !== "idle" && phase !== "complete";

  return (
    <div className="relative w-full aspect-[4/3] max-h-[420px] bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Title */}
      <div className="absolute top-3 left-4 z-10">
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
          Mesh Topology
        </span>
      </div>

      {/* Phase indicator */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            phase === "complete"
              ? "bg-emerald-500"
              : isRunning
              ? "bg-amber-500 animate-pulse"
              : "bg-zinc-600"
          }`}
        />
        <span className="text-xs font-mono text-zinc-400 uppercase">
          {phase.replace(/_/g, " ")}
        </span>
      </div>

      {/* SVG connection lines */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 120"
        preserveAspectRatio="none"
      >
        {/* Sentinel → Enforcers */}
        <line x1="50" y1="20" x2="15" y2="52" stroke="#3f3f46" strokeWidth="0.3" />
        <line x1="50" y1="20" x2="85" y2="52" stroke="#3f3f46" strokeWidth="0.3" />

        {/* Enforcers → Arbiter */}
        <line x1="15" y1="60" x2="48" y2="82" stroke="#3f3f46" strokeWidth="0.3" />
        <line x1="85" y1="60" x2="52" y2="82" stroke="#3f3f46" strokeWidth="0.3" />

        {/* Arbiter → Compiler */}
        <line x1="50" y1="90" x2="50" y2="100" stroke="#3f3f46" strokeWidth="0.3" />

        {/* Sentinel → Arbiter (direct) */}
        <line x1="50" y1="25" x2="50" y2="80" stroke="#27272a" strokeWidth="0.2" strokeDasharray="2 2" />

        {/* If running, animate flows */}
        {isRunning && (
          <>
            <circle cx="50" cy="20" r="0.6" fill="#60a5fa" className="agent-pulse" />
            <circle cx="15" cy="52" r="0.6" fill="#a78bfa" className="agent-pulse" />
            <circle cx="85" cy="52" r="0.6" fill="#a78bfa" className="agent-pulse" />
          </>
        )}
      </svg>

      {/* Agent nodes */}
      {AGENTS.map((agent) => (
        <div
          key={agent.id}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10
            px-3 py-2 rounded-lg border ${agent.color} bg-zinc-900/90 backdrop-blur-sm
            ${isRunning ? `${agent.glow} shadow-lg` : ""}
            transition-all duration-500`}
          style={{
            left: `${agent.x}%`,
            top: `${agent.y}%`,
          }}
        >
          <div className="text-[11px] font-semibold font-mono leading-tight">
            {agent.name}
          </div>
          <div className="text-[9px] text-zinc-500 font-mono leading-tight">
            {agent.role}
          </div>
        </div>
      ))}

      {/* Constraint Ledger box at bottom-center */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-md border border-zinc-700 bg-zinc-900/80">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider text-center">
          Constraint Ledger{" "}
          <span className="text-zinc-600">(CDP Art.38, Art.42, SEN-SEC-001)</span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-4 flex gap-3 text-[9px] font-mono text-zinc-600">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Scanner
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> Validator
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Arbiter
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Compiler
        </span>
      </div>
    </div>
  );
}
