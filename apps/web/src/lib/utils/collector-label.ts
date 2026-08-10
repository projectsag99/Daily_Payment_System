import { COLLECTOR_STATUS_LABELS, CollectorStatus, CollectorSummary } from "@/lib/types/collectors";

export function collectorSelectLabel(collector: CollectorSummary): string {
  const name = `${collector.firstName} ${collector.lastName}`.trim();
  if (collector.status === "active") {
    return name;
  }
  const statusLabel = COLLECTOR_STATUS_LABELS[collector.status as CollectorStatus];
  return `${name} (${statusLabel ?? collector.status})`;
}
