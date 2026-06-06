"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ArbitrationEvent {
  type: string;
  phase?: string;
  message?: string;
  transcript?: TranscriptMessage[];
  previous_schema?: unknown;
  new_schema?: unknown;
  added_columns?: string[];
}

export interface TranscriptMessage {
  id: string;
  msg_type: string;
  sender: string;
  recipient: string | null;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface ActivityPulse {
  sender: string;
  recipient: string | null;
  timestamp: number;
}

interface UseArbitrationWebSocketReturn {
  transcript: TranscriptMessage[];
  phase: string;
  connected: boolean;
  runDemo: () => void;
  summary: string | null;
  activityPulse: ActivityPulse | null;
}

/** Map agent IDs from the backend to React Flow node IDs */
export function agentIdToNodeId(agentId: string): string | null {
  const map: Record<string, string> = {
    sentinel_0: "sentinel",
    enforcer_0: "enforcer-compliance",
    enforcer_1: "enforcer-risk",
    arbiter: "arbiter",
    compiler: "compiler",
  };
  return map[agentId] || null;
}

export function useArbitrationWebSocket(
  url: string
): UseArbitrationWebSocketReturn {
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [phase, setPhase] = useState("idle");
  const [connected, setConnected] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [activityPulse, setActivityPulse] = useState<ActivityPulse | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const prevLengthRef = useRef(0);
  const pulseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Queue an activity pulse after delay, clearing old queue
  const queuePulse = useCallback((sender: string, recipient: string | null, delayMs: number) => {
    const timer = setTimeout(() => {
      setActivityPulse({
        sender,
        recipient,
        timestamp: Date.now(),
      });
    }, delayMs);
    pulseTimersRef.current.push(timer);
  }, []);

  // Clear all pending pulse timers
  const clearPulseQueue = useCallback(() => {
    pulseTimersRef.current.forEach(clearTimeout);
    pulseTimersRef.current = [];
  }, []);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: ArbitrationEvent = JSON.parse(event.data);

        switch (data.type) {
          case "transcript_update":
            if (data.transcript) {
              const prevLen = prevLengthRef.current;
              const newLen = data.transcript.length;
              setTranscript(data.transcript);
              prevLengthRef.current = newLen;

              // Detect new messages and emit activity pulses
              if (newLen > prevLen) {
                const newMessages = data.transcript.slice(prevLen);

                // Queue pulses for each new message with staggered timing
                // Don't clear — let all pulses play out in sequence
                newMessages.forEach((msg, i) => {
                  queuePulse(msg.sender, msg.recipient, prevLen * 800 + i * 800);
                });
              }
            }
            if (data.phase) {
              setPhase(data.phase);
            }
            break;

          case "phase_change":
            if (data.phase) setPhase(data.phase);
            if (data.message) setSummary(data.message);
            break;

          case "schema_drift":
            setPhase("schema_drift_detected");
            setSummary(
              `Schema drift detected: +${data.added_columns?.join(", ")} from ${data.new_schema}`
            );
            break;
        }
      } catch {
        // Malformed message — ignore
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
      clearPulseQueue();
    };
  }, [url]);

  const runDemo = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "run_demo" }));
      setTranscript([]);
      prevLengthRef.current = 0;
      setPhase("negotiation");
      setSummary("Starting autonomous negotiation demo...");
      clearPulseQueue();
      setActivityPulse(null);
    }
  }, []);

  return { transcript, phase, connected, runDemo, summary, activityPulse };
}
