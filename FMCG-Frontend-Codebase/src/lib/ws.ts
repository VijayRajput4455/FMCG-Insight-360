import type { AuditStatusResponse } from "@/lib/api";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://127.0.0.1:8000";

export type AuditSocketHandlers = {
  onMessage: (data: AuditStatusResponse | Record<string, unknown>) => void;
  onError: (error: Event) => void;
  onClose: () => void;
};

export function connectAuditSocket(auditId: number, handlers: AuditSocketHandlers): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/api/v1/audit/ws/${auditId}`);

  ws.onmessage = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as AuditStatusResponse | Record<string, unknown>;
      handlers.onMessage(payload);
    } catch {
      handlers.onMessage({ status: "error", error_message: "Invalid WebSocket payload" });
    }
  };

  ws.onerror = (event) => {
    handlers.onError(event);
  };

  ws.onclose = () => {
    handlers.onClose();
  };

  return ws;
}
