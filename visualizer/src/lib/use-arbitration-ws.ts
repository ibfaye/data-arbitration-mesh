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

interface UseArbitrationWebSocketReturn {
  transcript: TranscriptMessage[];
  phase: string;
  connected: boolean;
  runDemo: () => void;
  summary: string | null;
}

export function useArbitrationWebSocket(
  url: string
): UseArbitrationWebSocketReturn {
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [phase, setPhase] = useState("idle");
  const [connected, setConnected] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
              setTranscript(data.transcript);
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
    };
  }, [url]);

  const runDemo = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "run_demo" }));
      setTranscript([]);
      setPhase("negotiation");
      setSummary("Starting autonomous negotiation demo...");
    }
  }, []);

  return { transcript, phase, connected, runDemo, summary };
}
