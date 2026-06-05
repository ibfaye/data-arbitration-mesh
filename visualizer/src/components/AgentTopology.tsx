"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import AgentNode from "./AgentNode";
import type { AgentNodeData } from "./AgentNode";

// ─── Custom node types ───
const nodeTypes = { agentNode: AgentNode };

// ─── Initial node layout ───
const INITIAL_NODES: Node<AgentNodeData>[] = [
  {
    id: "sentinel",
    type: "agentNode",
    position: { x: 280, y: 30 },
    data: { label: "Schema Sentinel", subtitle: "Boundary Scanner", accent: "blue", active: false, isArbiter: false },
  },
  {
    id: "enforcer-compliance",
    type: "agentNode",
    position: { x: 60, y: 200 },
    data: { label: "Compliance Enforcer", subtitle: "Contract Validator", accent: "violet", active: false, isArbiter: false },
  },
  {
    id: "enforcer-risk",
    type: "agentNode",
    position: { x: 500, y: 200 },
    data: { label: "Risk Model Enforcer", subtitle: "Contract Validator", accent: "violet", active: false, isArbiter: false },
  },
  {
    id: "arbiter",
    type: "agentNode",
    position: { x: 280, y: 370 },
    data: { label: "Arbitration Engine", subtitle: "Deadlock Breaker", accent: "amber", active: false, isArbiter: true },
  },
  {
    id: "compiler",
    type: "agentNode",
    position: { x: 280, y: 540 },
    data: { label: "Pipeline Compiler", subtitle: "Plan Generator", accent: "emerald", active: false, isArbiter: false },
  },
];

// ─── Edge definitions with animated markers ───
const INITIAL_EDGES: Edge[] = [
  {
    id: "sentinel→compliance",
    source: "sentinel", target: "enforcer-compliance",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#2a2a3e", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#2a2a3e", width: 8, height: 8 },
  },
  {
    id: "sentinel→risk",
    source: "sentinel", target: "enforcer-risk",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#2a2a3e", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#2a2a3e", width: 8, height: 8 },
  },
  {
    id: "compliance→arbiter",
    source: "enforcer-compliance", target: "arbiter",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#2a2a3e", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#2a2a3e", width: 8, height: 8 },
  },
  {
    id: "risk→arbiter",
    source: "enforcer-risk", target: "arbiter",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#2a2a3e", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#2a2a3e", width: 8, height: 8 },
  },
  {
    id: "arbiter→compiler",
    source: "arbiter", target: "compiler",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#2a2a3e", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#2a2a3e", width: 8, height: 8 },
  },
  // Direct sentinel → arbiter (dashed, optional path)
  {
    id: "sentinel→arbiter",
    source: "sentinel", target: "arbiter",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#1a1a28", strokeWidth: 1, strokeDasharray: "5 5" },
  },
];

// ─── Edge color mapping for active state ───
const EDGE_COLORS: Record<string, { stroke: string; glow: string }> = {
  "sentinel→compliance": { stroke: "#8b5cf6", glow: "rgba(139,92,246,0.3)" },
  "sentinel→risk": { stroke: "#8b5cf6", glow: "rgba(139,92,246,0.3)" },
  "compliance→arbiter": { stroke: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  "risk→arbiter": { stroke: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  "arbiter→compiler": { stroke: "#10b981", glow: "rgba(16,185,129,0.3)" },
  "sentinel→arbiter": { stroke: "#3b82f6", glow: "rgba(59,130,246,0.2)" },
};

// ─── MiniMap dark theme ───
const minimapStyle: React.CSSProperties = {
  backgroundColor: "#0d0d14",
  border: "1px solid #1e1e2e",
  borderRadius: "8px",
};

interface AgentTopologyProps {
  phase: string;
}

export default function AgentTopology({ phase }: AgentTopologyProps) {
  const isRunning = phase !== "idle" && phase !== "complete";
  const isComplete = phase === "complete";

  // Update nodes active state based on phase
  const nodes = useMemo(() => {
    const active = isRunning || isComplete;
    return INITIAL_NODES.map((n) => ({
      ...n,
      data: { ...n.data, active },
    }));
  }, [isRunning, isComplete]);

  // Update edges based on phase
  const edges = useMemo(() => {
    const active = isRunning || isComplete;
    return INITIAL_EDGES.map((edge) => {
      const c = EDGE_COLORS[edge.id];
      if (!c) return edge;

      return {
        ...edge,
        animated: isRunning, // Only animate during running phase
        style: {
          ...edge.style,
          stroke: active ? c.stroke : edge.style?.stroke,
          strokeWidth: active ? 2 : 1.5,
          filter: active ? `drop-shadow(0 0 4px ${c.glow})` : undefined,
        },
        markerEnd:
          typeof edge.markerEnd === "object" && edge.markerEnd !== null
            ? { ...edge.markerEnd, color: active ? c.stroke : "#2a2a3e" }
            : { type: MarkerType.ArrowClosed, color: active ? c.stroke : "#2a2a3e", width: 8, height: 8 },
      };
    });
  }, [isRunning, isComplete]);

  return (
    <div className="w-full aspect-[4/3] max-h-[440px] rounded-2xl border border-[#1e1e2e] overflow-hidden gradient-card">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        {/* Dark grid background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={0.5}
          color="#2a2a3e"
        />

        {/* MiniMap */}
        <MiniMap
          style={minimapStyle}
          nodeColor={(n) => {
            const d = n.data as AgentNodeData | undefined;
            if (!d?.active) return "#3f3f46";
            switch (d.accent) {
              case "blue": return "#3b82f6";
              case "violet": return "#8b5cf6";
              case "amber": return "#f59e0b";
              case "emerald": return "#10b981";
              default: return "#6b6b80";
            }
          }}
          maskColor="rgba(7,7,11,0.7)"
        />

        {/* Controls (zoom, fit) */}
        <Controls
          className="!bg-[#0d0d14] !border-[#1e1e2e] !rounded-xl [&>button]:!bg-[#1a1a24] [&>button]:!border-[#2a2a3e] [&>button]:!text-[#a0a0b8] [&>button]:hover:!bg-[#2a2a3e] [&>button>svg]:!fill-[#a0a0b8]"
        />

        {/* Phase panel */}
        <Panel position="top-left" className="!m-3">
          <div className="flex items-center gap-2">
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
        </Panel>

        {/* Constraint Ledger panel */}
        <Panel position="bottom-center" className="!mb-3">
          <div className="px-4 py-2 rounded-full border border-[#1e1e2e] bg-[#0d0d14]/80 backdrop-blur-sm flex items-center gap-2">
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
        </Panel>
      </ReactFlow>
    </div>
  );
}
