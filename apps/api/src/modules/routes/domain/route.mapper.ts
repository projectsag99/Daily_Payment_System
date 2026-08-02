import { RouteClientRow, RouteSummaryRow } from "./route.types";

export function mapRouteSummary(row: RouteSummaryRow) {
  return {
    id: row.id,
    name: row.name,
    shift: row.shift,
    dayOfWeek: row.day_of_week,
    isActive: row.is_active,
    description: row.description,
    clientCount: Number(row.client_count ?? 0),
    assignedCollector: row.collector_id
      ? { id: row.collector_id, name: row.collector_name }
      : null,
    collectedTodayPct: row.collected_today_pct
      ? Number(row.collected_today_pct)
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRouteClient(row: RouteClientRow) {
  const hasLocation = row.lat !== null && row.lng !== null;
  return {
    id: row.id,
    code: row.code,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    sequenceOrder: row.sequence_order,
    visitStatus: row.visit_status,
    amountDue: Number(row.amount_due ?? 0),
    overdueInstallmentCount: Number(row.overdue_installment_count ?? 0),
    location: hasLocation
      ? { lat: Number(row.lat), lng: Number(row.lng) }
      : null,
  };
}

export function mapRouteWithClients(
  route: ReturnType<typeof mapRouteSummary>,
  clients: RouteClientRow[],
) {
  return {
    ...route,
    clients: clients.map(mapRouteClient),
  };
}
