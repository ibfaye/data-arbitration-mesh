"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

export interface AgentNodeData extends Record<string, unknown> {
  label: string;
  subtitle: string;
  accent: "blue" | "violet" | "amber" | "emerald";
  active: boolean;
  isArbiter: boolean;
}

const ACCENT_COLORS = {
  blue: { border: "border-blue-500/40", bg: "bg-blue-500/8", text: "text-blue-400", glow: "rgba(59,130,246,0.3)" },
  violet: { border: "border-violet-500/40", bg: "bg-violet-500/8", text: "text-violet-400", glow: "rgba(139,92,246,0.3)" },
  amber: { border: "border-amber-500/40", bg: "bg-amber-500/8", text: "text-amber-400", glow: "rgba(245,158,11,0.3)" },
  emerald: { border: "border-emerald-500/40", bg: "bg-emerald-500/8", text: "text-emerald-400", glow: "rgba(16,185,129,0.3)" },
};

function AgentNode({ data }: NodeProps<Node<AgentNodeData>>) {
  const c = ACCENT_COLORS[data.accent];
  const { active, isArbiter } = data;

  return (
    <div
      className={`
        relative px-4 py-3 rounded-xl border backdrop-blur-xl transition-all duration-500
        ${active ? `${c.border} ${c.bg}` : "border-[#1e1e2e] bg-[#0d0d14]/90"}
        ${isArbiter ? "min-w-[180px]" : "min-w-[170px]"}
        ${active ? "shadow-lg" : ""}
      `}
      style={{
        boxShadow: active ? `0 0 20px ${c.glow}, 0 0 40px ${c.glow}` : "none",
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-3 right-3 h-px rounded-full transition-opacity duration-500"
        style={{
          background: active
            ? `linear-gradient(90deg, transparent, ${c.glow}, transparent)`
            : "transparent",
          opacity: active ? 1 : 0,
        }}
      />

      {/* Pulse ring (Arbiter only) */}
      {isArbiter && active && (
        <div className="absolute inset-0 rounded-xl animate-pulse opacity-20"
          style={{ boxShadow: `0 0 24px ${c.glow}` }}
        />
      )}

      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-[#2a2a3e] !border-[#1e1e2e] !w-2 !h-2"
      />

      {/* Content */}
      <div className="flex items-center gap-2.5">
        {/* Icon */}
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[15px] transition-colors duration-500 ${
            active ? c.bg : "bg-[#1a1a24]"
          }`}
        >
          <span style={{ color: active ? undefined : "#4a4a5e" }}
            className={active ? c.text : ""}>
            {isArbiter ? "◆" : data.accent === "blue" ? "◈" : data.accent === "violet" ? "⬡" : data.accent === "emerald" ? "⎔" : "◈"}
          </span>
        </div>

        {/* Text */}
        <div>
          <div
            className="text-[11px] font-semibold font-mono leading-tight transition-colors duration-500"
            style={{ color: active ? undefined : "#6b6b80" }}
          >
            <span className={active ? c.text : ""}>{data.label}</span>
          </div>
          <div className="text-[9px] font-mono text-[#4a4a5e] leading-tight mt-0.5">
            {data.subtitle}
          </div>
        </div>
      </div>

      {/* Status dot */}
      <div className={`absolute top-2.5 right-3 w-1.5 h-1.5 rounded-full transition-all duration-500 ${
        active ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-[#3f3f46]"
      }`} />

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-[#2a2a3e] !border-[#1e1e2e] !w-2 !h-2"
      />
    </div>
  );
}

export default memo(AgentNode);
