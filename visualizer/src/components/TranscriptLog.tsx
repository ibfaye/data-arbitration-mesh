"use client";

import { useEffect, useRef } from "react";
import type { TranscriptMessage } from "@/lib/use-arbitration-ws";

interface TranscriptLogProps {
  messages: TranscriptMessage[];
}

const AGENT_LABELS: Record<string, { name: string; color: string }> = {
  sentinel_0: { name: "Sentinel", color: "text-blue-400" },
  enforcer_0: { name: "Compliance Enforcer", color: "text-violet-400" },
  enforcer_1: { name: "Risk Model Enforcer", color: "text-violet-400" },
  arbiter: { name: "Arbiter", color: "text-amber-400" },
  compiler: { name: "Compiler", color: "text-emerald-400" },
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  contract_declaration: { label: "CONTRACT", color: "text-violet-400" },
  schema_change_proposal: { label: "PROPOSAL", color: "text-blue-400" },
  constraint_violation: { label: "VIOLATION", color: "text-red-400" },
  arbitration_ruling: { label: "RULING", color: "text-amber-400" },
  remediation_plan: { label: "PLAN", color: "text-emerald-400" },
};

function formatPayload(msg: TranscriptMessage): string {
  const payload = msg.payload;

  switch (msg.msg_type) {
    case "contract_declaration": {
      const contract = payload.contract as Record<string, unknown> | undefined;
      if (!contract) return "";
      const cols = contract.required_columns as Array<{ name: string }> | undefined;
      return `Requires: ${cols?.map((c) => c.name).join(", ") || "none"}`;
    }
    case "schema_change_proposal": {
      const proposal = payload.proposal as Record<string, unknown> | undefined;
      if (!proposal) return "";
      const added = proposal.added_columns as Array<{ name: string }> | undefined;
      return `+${added?.map((c) => c.name).join(", ") || "none"} (${proposal.proposal_id})`;
    }
    case "constraint_violation": {
      const violation = payload.violation as Record<string, unknown> | undefined;
      if (!violation) return "";
      return `${violation.detail} [${violation.violated_rule}]`;
    }
    case "arbitration_ruling": {
      const ruling = payload.ruling as Record<string, unknown> | undefined;
      if (!ruling) return "";
      return `${ruling.ruling?.toString().toUpperCase()}: ${ruling.reasoning}`;
    }
    case "remediation_plan": {
      const plan = payload.plan as Record<string, unknown> | undefined;
      if (!plan) return "";
      const steps = plan.steps as Array<{ description: string }> | undefined;
      return `${steps?.length || 0} step(s): ${steps?.map((s) => s.description).join(" → ")}`;
    }
    default:
      return "";
  }
}

export default function TranscriptLog({ messages }: TranscriptLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-zinc-700 flex items-center justify-center">
            <span className="text-zinc-600 text-lg">◈</span>
          </div>
          <p className="text-sm text-zinc-500 font-mono">
            Negotiation transcript empty. Run the demo to see agents negotiate live.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto transcript-scroll space-y-1 pr-2"
    >
      {messages.map((msg, i) => {
        const agent = AGENT_LABELS[msg.sender] || {
          name: msg.sender,
          color: "text-zinc-400",
        };
        const typeInfo = TYPE_LABELS[msg.msg_type] || {
          label: msg.msg_type.toUpperCase(),
          color: "text-zinc-500",
        };
        const payloadText = formatPayload(msg);
        const isRuling = msg.msg_type === "arbitration_ruling";

        return (
          <div
            key={msg.id || i}
            className={`message-enter px-3 py-2 rounded-md border ${
              isRuling
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-zinc-800 bg-zinc-900/40"
            }`}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
              <span className={agent.color}>{agent.name}</span>
              <span className="text-zinc-600">→</span>
              <span className={typeInfo.color}>{typeInfo.label}</span>
              {msg.recipient && (
                <>
                  <span className="text-zinc-600">→</span>
                  <span className="text-zinc-500">
                    {(AGENT_LABELS[msg.recipient] || { name: msg.recipient }).name}
                  </span>
                </>
              )}
              <span className="text-zinc-700 ml-auto text-[9px]">
                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}
              </span>
            </div>
            {payloadText && (
              <div className="mt-0.5 text-[11px] text-zinc-400 font-mono leading-relaxed">
                {payloadText}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
