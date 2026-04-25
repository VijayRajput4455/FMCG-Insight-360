export type HistoryStatus = "pending" | "processing" | "completed" | "failed";

export type AuditHistoryItem = {
  auditId: number;
  productCode: string;
  sourceLabel: string;
  status: HistoryStatus;
  createdAtIso: string;
};

const STORAGE_KEY = "fmcg-audit-history";

export function getHistory(): AuditHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(items: AuditHistoryItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addHistoryItem(item: AuditHistoryItem): void {
  const items = getHistory();
  const exists = items.some((x) => x.auditId === item.auditId);
  if (exists) return;
  saveHistory([item, ...items].slice(0, 100));
}

export function updateHistoryStatus(auditId: number, status: HistoryStatus): void {
  const items = getHistory();
  const updated = items.map((item) => (item.auditId === auditId ? { ...item, status } : item));
  saveHistory(updated);
}
