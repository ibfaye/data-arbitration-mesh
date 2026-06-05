"use client";

interface AgentNode {
  id: string;
  label: string;
  subtitle: string;
  x: number;
  y: number;
  color: "blue" | "violet" | "amber" | "emerald";
}

interface Connection {
  from: number;
  to: number;
  dashed?: boolean;
  color: "blue" | "violet" | "amber" | "emerald";
}

const NODES: AgentNode[] = [
  { id: "sentinel", label: "Schema Sentinel", subtitle: "Boundary Scanner", x: 50, y: 18, color: "blue" },
  { id: "enforcer-0", label: "Compliance Enforcer", subtitle: "Contract Validator", x: 18, y: 52, color: "violet" },
  { id: "enforcer-1", label: "Risk Model Enforcer", subtitle: "Contract Validator", x: 82, y: 52, color: "violet" },
  { id: "arbiter", label: "Arbitration Engine", subtitle: "Deadlock Breaker", x: 50, y: 78, color: "amber" },
  { id: "compiler", label: "Pipeline Compiler", subtitle: "Plan Generator", x: 50, y: 98, color: "emerald" },
];

const CONNECTIONS: Connection[] = [
  { from: 0, to: 1, color: "violet" },
  { from: 0, to: 2, color: "violet" },
  { from: 1, to: 3, color: "amber" },
  { from: 2, to: 3, color: "amber" },
  { from: 3, to: 4, color: "emerald" },
  { from: 0, to: 3, dashed: true, color: "blue" },
];

const COLOR_MAP = {
  blue: { stroke: "#3b82f6", glow: "rgba(59,130,246,0.3)", bg: "rgba(59,130,246,0.1)", ring: "rgba(59,130,246,0.5)" },
  violet: { stroke: "#8b5cf6", glow: "rgba(139,92,246,0.3)", bg: "rgba(139,92,246,0.1)", ring: "rgba(139,92,246,0.5)" },
  amber: { stroke: "#f59e0b", glow: "rgba(245,158,11,0.3)", bg: "rgba(245,158,11,0.1)", ring: "rgba(245,158,11,0.5)" },
  emerald: { stroke: "#10b981", glow: "rgba(16,185,129,0.3)", bg: "rgba(16,185,129,0.1)", ring: "rgba(16,185,129,0.5)" },
};

interface AgentTopologyProps {
  phase: string;
}

export default function AgentTopology({ phase }: AgentTopologyProps) {
  const isRunning = phase !== "idle" && phase !== "complete";
  const isComplete = phase === "complete";

  const activeNodes = new Set<number>();
  if (isRunning || isComplete) activeNodes.add(0).add(1).add(2).add(3).add(4);

  return (
    <div className="relative w-full aspect-[4/3] max-h-[440px] rounded-2xl border border-[#1e1e2e] gradient-card overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #8b5cf6 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Header */}
      <div className="absolute top-4 left-5 z-20 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" className="text-[#8b5cf6]">
            <circle cx="7" cy="7" r="2" fill="currentColor" />
            <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          </svg>
          <span className="text-[11px] font-semibold font-mono text-[#a0a0b8] uppercase tracking-[0.15em]">
            Mesh Topology
          </span>
        </div>
      </div>

      {/* Phase badge */}
      <div className="absolute top-4 right-5 z-20 flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isComplete
              ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
              : isRunning
              ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse"
              : "bg-[#3f3f46]"
          }`}
        />
        <span className="text-[10px] font-mono text-[#6b6b80] uppercase tracking-[0.15em]">
          {phase.replace(/_/g, " ")}
        </span>
      </div>

      {/* SVG Layer — connections */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 115" preserveAspectRatio="xMidYMid meet">
        <defs>
          {(["blue", "violet", "amber", "emerald"] as const).map((c) => (
            <radialGradient key={c} id={`glow-${c}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={COLOR_MAP[c].glow} stopOpacity="0.6" />
              <stop offset="100%" stopColor={COLOR_MAP[c].glow} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Connection lines */}
        {CONNECTIONS.map((conn, i) => {
          const from = NODES[conn.from];
          const to = NODES[conn.to];
          const c = COLOR_MAP[conn.color];
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          const active = isRunning || isComplete;

          return (
            <g key={i}>
              {/* Glow line behind */}
              {active && (
                <line
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={c.glow}
                  strokeWidth="1.5"
                  opacity="0.4"
                  strokeDasharray={conn.dashed ? "4 6" : undefined}
                />
              )}
              {/* Main line */}
              <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={active ? c.stroke : "#2a2a3e"}
                strokeWidth={active ? "0.8" : "0.5"}
                opacity={active ? 0.7 : 0.3}
                strokeDasharray={conn.dashed ? "4 6" : undefined}
              />
              {/* Animated flow dot */}
              {isRunning && !conn.dashed && (
                <circle
                  r="1.2"
                  fill={c.stroke}
                  opacity="0.9"
                  className="animate-connection-flow"
                >
                  <animateMotion
                    dur="2s"
                    repeatCount="indefinite"
                    path={`M${from.x},${from.y} L${to.x},${to.y}`}
                  />
                </circle>
              )}
              {/* Midpoint data pulse */}
              {isRunning && !conn.dashed && (
                <circle
                  cx={midX} cy={midY} r="3"
                  fill="none"
                  stroke={c.stroke}
                  strokeWidth="0.4"
                  opacity="0.5"
                  className="animate-node-pulse"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Agent nodes */}
      {NODES.map((node, i) => {
        const c = COLOR_MAP[node.color];
        const active = activeNodes.has(i);
        const isArbiter = node.id === "arbiter";

        return (
          <div
            key={node.id}
            className={`absolute z-10 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${
              isRunning ? "animate-node-pulse" : ""
            }`}
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              animationDelay: `${i * 0.2}s`,
            }}
          >
            {/* Outer ring (Arbiter gets special treatment) */}
            <div
              className={`absolute inset-0 rounded-xl transition-all duration-500 ${
                active ? "opacity-100" : "opacity-0"
              }`}
              style={{
                boxShadow: active ? `0 0 24px ${c.glow}, 0 0 48px ${c.glow}` : "none",
              }}
            />

            {/* Node card */}
            <div
              className={`relative px-3.5 py-2.5 rounded-xl border transition-all duration-500 backdrop-blur-xl ${
                active
                  ? isArbiter
                    ? "border-amber-500/40 bg-amber-500/10"
                    : `border-${node.color}-500/30 bg-${node.color}-500/8`
                  : "border-[#1e1e2e] bg-[#0d0d14]/90"
              }`}
            >
              {/* Top accent line */}
              <div
                className="absolute top-0 left-3 right-3 h-px rounded-full transition-opacity duration-500"
                style={{
                  background: active
                    ? `linear-gradient(90deg, transparent, ${c.stroke}, transparent)`
                    : "transparent",
                  opacity: active ? 1 : 0,
                }}
              />

              <div
                className="text-[11px] font-semibold font-mono leading-tight transition-colors duration-500"
                style={{ color: active ? c.stroke : "#6b6b80" }}
              >
                {node.label}
              </div>
              <div className="text-[9px] font-mono leading-tight text-[#4a4a5e] mt-0.5">
                {node.subtitle}
              </div>
            </div>
          </div>
        );
      })}

      {/* Constraint Ledger — bottom center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="px-5 py-2 rounded-full border border-[#1e1e2e] bg-[#0d0d14]/80 backdrop-blur-sm flex items-center gap-2">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0" y="0" width="10" height="10" rx="2" fill="none" stroke="#6b6b80" strokeWidth="0.5" />
            <line x1="2" y1="3" x2="8" y2="3" stroke="#6b6b80" strokeWidth="0.4" />
            <line x1="2" y1="5" x2="6" y2="5" stroke="#6b6b80" strokeWidth="0.4" />
            <line x1="2" y1="7" x2="7" y2="7" stroke="#6b6b80" strokeWidth="0.4" />
          </svg>
          <span className="text-[10px] font-mono text-[#6b6b80] tracking-[0.1em]">
            CONSTRAINT LEDGER
          </span>
          <span className="text-[9px] font-mono text-[#4a4a5e]">
            CDP Art.38 · Art.42 · Art.53
          </span>
        </div>
      </div>

      {/* Legend — bottom right */}
      <div className="absolute bottom-4 right-5 z-10 flex gap-4 text-[9px] font-mono text-[#4a4a5e]">
        {(["blue", "violet", "amber", "emerald"] as const).map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: COLOR_MAP[c].stroke }}
            />
            {c === "blue" ? "Scanner" : c === "violet" ? "Validator" : c === "amber" ? "Arbiter" : "Compiler"}
          </span>
        ))}
      </div>
    </div>
  );
}
