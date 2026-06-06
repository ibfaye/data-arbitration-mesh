"use client";

import { useMemo, useEffect, useState } from "react";
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
import type { ActivityPulse } from "@/lib/use-arbitration-ws";
import { agentIdToNodeId } from "@/lib/use-arbitration-ws";

// ─── Custom node types ───
const nodeTypes = { agentNode: AgentNode };

// ─── Agent position on the flow canvas ───
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

const INITIAL_EDGES: Edge[] = [
  { id: "sentinel→compliance", source: "sentinel", target: "enforcer-compliance", type: "smoothstep", animated: false, style: { stroke: "#2a2a3e", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#2a2a3e", width: 8, height: 8 } },
  { id: "sentinel→risk", source: "sentinel", target: "enforcer-risk", type: "smoothstep", animated: false, style: { stroke: "#2a2a3e", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#2a2a3e", width: 8, height: 8 } },
  { id: "compliance→arbiter", source: "enforcer-compliance", target: "arbiter", type: "smoothstep", animated: false, style: { stroke: "#2a2a3e", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#2a2a3e", width: 8, height: 8 } },
  { id: "risk→arbiter", source: "enforcer-risk", target: "arbiter", type: "smoothstep", animated: false, style: { stroke: "#2a2a3e", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#2a2a3e", width: 8, height: 8 } },
  { id: "arbiter→compiler", source: "arbiter", target: "compiler", type: "smoothstep", animated: false, style: { stroke: "#2a2a3e", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#2a2a3e", width: 8, height: 8 } },
  { id: "sentinel→arbiter", source: "sentinel", target: "arbiter", type: "smoothstep", animated: false, style: { stroke: "#1a1a28", strokeWidth: 1, strokeDasharray: "5 5" } },
];

// ─── Edge color mapping ───
const EDGE_COLORS: Record<string, { stroke: string; glow: string }> = {
  "sentinel→compliance": { stroke: "#8b5cf6", glow: "rgba(139,92,246,0.3)" },
  "sentinel→risk": { stroke: "#8b5cf6", glow: "rgba(139,92,246,0.3)" },
  "compliance→arbiter": { stroke: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  "risk→arbiter": { stroke: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  "arbiter→compiler": { stroke: "#10b981", glow: "rgba(16,185,129,0.3)" },
  "sentinel→arbiter": { stroke: "#3b82f6", glow: "rgba(59,130,246,0.2)" },
};

const minimapStyle: React.CSSProperties = {
  backgroundColor: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: "8px",
};

interface AgentTopologyProps {
  phase: string;
  activityPulse: ActivityPulse | null;
}

export default function AgentTopology({ phase, activityPulse }: AgentTopologyProps) {
  const isRunning = phase !== "idle" && phase !== "complete";
  const isComplete = phase === "complete";

  // Track which nodes/edges are currently "pulsing"
  const [pulseState, setPulseState] = useState<{
    senderNode: string | null;
    recipientNode: string | null;
    activeEdge: string | null;
    key: number; // forces re-render
  }>({ senderNode: null, recipientNode: null, activeEdge: null, key: 0 });

  // When a new activity pulse arrives, animate sender → edge → recipient
  useEffect(() => {
    if (!activityPulse) return;

    const senderNodeId = agentIdToNodeId(activityPulse.sender);
    const recipientNodeId = activityPulse.recipient
      ? agentIdToNodeId(activityPulse.recipient)
      : null;

    if (!senderNodeId) return;

    // Find the edge connecting sender → recipient
    let edgeId: string | null = null;
    if (recipientNodeId) {
      edgeId = INITIAL_EDGES.find(
        (e) => e.source === senderNodeId && e.target === recipientNodeId
      )?.id || null;
      // Try reverse direction too
      if (!edgeId) {
        edgeId = INITIAL_EDGES.find(
          (e) => e.source === recipientNodeId && e.target === senderNodeId
        )?.id || null;
      }
    }

    // Phase 1: sender node pulses
    setPulseState({
      senderNode: senderNodeId,
      recipientNode: null,
      activeEdge: null,
      key: Date.now(),
    });

    // Phase 2: edge animates (300ms later, overlaps with sender pulse)
    const edgeTimer = setTimeout(() => {
      setPulseState((prev) => ({
        ...prev,
        activeEdge: edgeId,
      }));
    }, 300);

    // Phase 3: recipient node pulses (600ms later)
    const recipientTimer = setTimeout(() => {
      if (recipientNodeId) {
        setPulseState((prev) => ({
          ...prev,
          senderNode: null, // sender stops pulsing
          recipientNode: recipientNodeId,
        }));
      }
    }, 600);

    // Phase 4: clear everything
    const clearTimer = setTimeout(() => {
      setPulseState({
        senderNode: null,
        recipientNode: null,
        activeEdge: null,
        key: 0,
      });
    }, 1400);

    return () => {
      clearTimeout(edgeTimer);
      clearTimeout(recipientTimer);
      clearTimeout(clearTimer);
    };
  }, [activityPulse?.timestamp, activityPulse?.sender, activityPulse?.recipient]);

  // ─── Derive nodes with active + pulsing state ───
  const nodes = useMemo(() => {
    const phaseActive = isRunning || isComplete;
    return INITIAL_NODES.map((n) => {
      const isSender = n.id === pulseState.senderNode;
      const isRecipient = n.id === pulseState.recipientNode;
      return {
        ...n,
        data: {
          ...n.data,
          active: phaseActive || isSender || isRecipient,
          pulsing: isSender || isRecipient,
        },
      };
    });
  }, [isRunning, isComplete, pulseState]);

  // ─── Derive edges ───
  const edges = useMemo(() => {
    const phaseActive = isRunning || isComplete;
    return INITIAL_EDGES.map((edge) => {
      const c = EDGE_COLORS[edge.id];
      if (!c) return edge;

      const isPulseEdge = edge.id === pulseState.activeEdge;
      const stroke = isPulseEdge ? c.stroke : phaseActive ? c.stroke : "#2a2a3e";
      const strokeWidth = isPulseEdge ? 3 : phaseActive ? 2 : 1.5;
      const animated = Boolean(isPulseEdge || (isRunning && !isPulseEdge));
      const filter = (phaseActive || isPulseEdge)
        ? `drop-shadow(0 0 ${isPulseEdge ? 8 : 4}px ${c.glow})`
        : undefined;

      return {
        ...edge,
        animated,
        style: { ...edge.style, stroke, strokeWidth, filter },
        markerEnd:
          typeof edge.markerEnd === "object" && edge.markerEnd !== null
            ? { ...edge.markerEnd, color: stroke }
            : { type: MarkerType.ArrowClosed, color: stroke, width: 8, height: 8 },
      };
    });
  }, [isRunning, isComplete, pulseState]);

  // Force React Flow to re-render when pulse state changes
  const rfKey = `rf-${pulseState.key || "idle"}`;

  return (
    <div className="w-full aspect-[4/3] max-h-[440px] rounded-2xl border border-[#1e1e2e] overflow-hidden gradient-card">
      <ReactFlow
        key={rfKey}
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
        <Background variant={BackgroundVariant.Dots} gap={20} size={0.5} color="#2a2a3e" />
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
        <Controls className="!bg-[#0d0d14] !border-[#1e1e2e] !rounded-xl [&>button]:!bg-[#1a1a24] [&>button]:!border-[#2a2a3e] [&>button]:!text-[#a0a0b8] [&>button]:hover:!bg-[#2a2a3e] [&>button>svg]:!fill-[#a0a0b8]" />
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
        <Panel position="bottom-center" className="!mb-3">
          <div className="px-4 py-2 rounded-full border border-[#1e1e2e] bg-[#0d0d14]/80 backdrop-blur-sm flex items-center gap-2">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="0" y="0" width="10" height="10" rx="2" fill="none" stroke="#6b6b80" strokeWidth="0.5" />
              <line x1="2" y1="3" x2="8" y2="3" stroke="#6b6b80" strokeWidth="0.4" />
              <line x1="2" y1="5" x2="6" y2="5" stroke="#6b6b80" strokeWidth="0.4" />
              <line x1="2" y1="7" x2="7" y2="7" stroke="#6b6b80" strokeWidth="0.4" />
            </svg>
            <span className="text-[10px] font-mono text-[#6b6b80] tracking-[0.1em]">CONSTRAINT LEDGER</span>
            <span className="text-[9px] font-mono text-[#4a4a5e]">CDP Art.38 · Art.42 · Art.53</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
