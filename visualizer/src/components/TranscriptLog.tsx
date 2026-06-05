"use client";

import { useEffect, useRef } from "react";
import type { TranscriptMessage } from "@/lib/use-arbitration-ws";

interface TranscriptLogProps {
  messages: TranscriptMessage[];
}

interface AgentStyle {
  name: string;
  icon: string;
  accent: string;
  bg: string;
}

const AGENT_STYLES: Record<string, AgentStyle> = {
  sentinel_0: { name: "Sentinel", icon: "◈", accent: "border-blue-500 bg-blue-500/5", bg: "bg-blue-500/8" },
  enforcer_0: { name: "Compliance Enforcer", icon: "⬡", accent: "border-violet-500 bg-violet-500/5", bg: "bg-violet-500/8" },
  enforcer_1: { name: "Risk Model Enforcer", icon: "⬡", accent: "border-violet-500 bg-violet-500/5", bg: "bg-violet-500/8" },
  arbiter: { name: "Arbiter", icon: "◆", accent: "border-amber-500 bg-amber-500/5", bg: "bg-amber-500/8" },
  compiler: { name: "Compiler", icon: "⎔", accent: "border-emerald-500 bg-emerald-500/5", bg: "bg-emerald-500/8" },
};

const TYPE_BADGES: Record<string, string> = {
  contract_declaration: "CONTRACT",
  schema_change_proposal: "PROPOSAL",
  constraint_violation: "VIOLATION",
  arbitration_ruling: "RULING",
  remediation_plan: "PLAN",
};

const TYPE_COLORS: Record<string, string> = {
  contract_declaration: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  schema_change_proposal: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  constraint_violation: "text-red-400 bg-red-500/10 border-red-500/20",
  arbitration_ruling: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  remediation_plan: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
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
      const id = proposal.proposal_id;
      return `New columns detected: +${added?.map((c) => c.name).join(", ") || "none"} [${id}]`;
    }
    case "constraint_violation": {
      const violation = payload.violation as Record<string, unknown> | undefined;
      if (!violation) return "";
      return `${violation.detail} — ${violation.suggested_remedy || ""}`;
    }
    case "arbitration_ruling": {
      const ruling = payload.ruling as Record<string, unknown> | undefined;
      if (!ruling) return "";
      const status = ruling.ruling?.toString().toUpperCase();
      return `Ruling: ${status} — ${ruling.reasoning}`;
    }
    case "remediation_plan": {
      const plan = payload.plan as Record<string, unknown> | undefined;
      if (!plan) return "";
      const steps = plan.steps as Array<{ description: string }> | undefined;
      return `Executing ${steps?.length || 0} step(s): ${steps?.map((s) => s.description).join(" → ")}`;
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
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl border border-[#1e1e2e] gradient-card flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#4a4a5e]">
              <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#6b6b80]">No messages yet</p>
            <p className="text-[11px] text-[#4a4a5e] mt-1 font-mono">
              Click Run Demo to start the negotiation
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto transcript-scroll space-y-2 pr-1">
      {messages.map((msg, i) => {
        const agent = AGENT_STYLES[msg.sender] || {
          name: msg.sender,
          icon: "○",
          accent: "border-zinc-700 bg-zinc-800/20",
          bg: "bg-zinc-800/10",
        };
        const badge = TYPE_BADGES[msg.msg_type] || msg.msg_type.toUpperCase();
        const badgeColor = TYPE_COLORS[msg.msg_type] || "text-zinc-400 bg-zinc-800/20 border-zinc-700/20";
        const payloadText = formatPayload(msg);
        const isRuling = msg.msg_type === "arbitration_ruling";
        const targetAgent =
          msg.recipient && AGENT_STYLES[msg.recipient]
            ? AGENT_STYLES[msg.recipient].name
            : null;

        return (
          <div
            key={msg.id || i}
            className={`animate-fade-up rounded-xl border-l-2 ${agent.accent} ${
              isRuling ? "gradient-card-amber" : "gradient-card"
            } p-3`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Header row */}
            <div className="flex items-center gap-2 mb-1.5">
              {/* Agent icon */}
              <span className="text-[15px] leading-none text-[#6b6b80]">{agent.icon}</span>

              {/* Agent name */}
              <span className="text-[11px] font-semibold font-mono text-[#a0a0b8]">
                {agent.name}
              </span>

              {/* Arrow to target */}
              {targetAgent && (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" className="text-[#4a4a5e]">
                    <path d="M3 9l6-6m0 0H4m5 0v5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[10px] font-mono text-[#4a4a5e]">{targetAgent}</span>
                </>
              )}

              {/* Message type badge */}
              <span
                className={`ml-auto text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}
              >
                {badge}
              </span>
            </div>

            {/* Payload content */}
            {payloadText && (
              <p className="text-[11px] text-[#808090] font-mono leading-relaxed ml-[23px]">
                {payloadText}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
