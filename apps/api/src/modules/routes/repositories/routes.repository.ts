import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Route } from "../entities/route.entity";
import { RouteClientAssignment } from "../entities/route-client-assignment.entity";
import { RouteCollectorAssignment } from "../entities/route-collector-assignment.entity";
import { ShiftType } from "../../../common/constants";
import { todayInTimezone } from "../../clients/domain/client.types";
import {
  RouteClientRow,
  RouteSummaryRow,
  routeAppliesOnDate,
} from "../domain/route.types";

@Injectable()
export class RoutesRepository {
  private readonly timezone: string;

  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(RouteClientAssignment)
    private readonly clientAssignmentRepository: Repository<RouteClientAssignment>,
    @InjectRepository(RouteCollectorAssignment)
    private readonly collectorAssignmentRepository: Repository<RouteCollectorAssignment>,
    private readonly dataSource: DataSource,
    configService: ConfigService,
  ) {
    this.timezone = configService.get<string>("timezone", "America/Bogota");
  }

  async findAllAdmin(filters: {
    shift?: ShiftType;
    isActive?: boolean;
  }): Promise<RouteSummaryRow[]> {
    const conditions = ["r.deleted_at IS NULL"];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.shift) {
      conditions.push(`r.shift = $${idx++}`);
      params.push(filters.shift);
    }
    if (filters.isActive !== undefined) {
      conditions.push(`r.is_active = $${idx++}`);
      params.push(filters.isActive);
    }

    const today = todayInTimezone(this.timezone);
    const todayParam = idx;
    params.push(today);

    return this.dataSource.query(
      `SELECT
        r.id,
        r.name,
        r.shift,
        r.day_of_week,
        r.is_active,
        r.description,
        r.created_at,
        r.updated_at,
        COUNT(DISTINCT rca.client_id)::text AS client_count,
        active_collector.collector_id,
        active_collector.collector_name,
        CASE
          WHEN COUNT(DISTINCT rca.client_id) = 0 THEN NULL
          ELSE ROUND(
            100.0 * COUNT(DISTINCT CASE
              WHEN COALESCE(dvs.visit_status, rca.visit_status) IN ('paid', 'visited')
              THEN rca.client_id END
            ) / NULLIF(COUNT(DISTINCT rca.client_id), 0),
            1
          )::text
        END AS collected_today_pct
      FROM routes r
      LEFT JOIN route_client_assignments rca ON rca.route_id = r.id
      LEFT JOIN daily_visit_snapshots dvs
        ON dvs.route_id = r.id
        AND dvs.client_id = rca.client_id
        AND dvs.visit_date = $${todayParam}
      LEFT JOIN LATERAL (
        SELECT rc.collector_id,
          CONCAT(u.first_name, ' ', u.last_name) AS collector_name
        FROM route_collector_assignments rc
        INNER JOIN users u ON u.id = rc.collector_id
        WHERE rc.route_id = r.id
          AND $${todayParam}::date >= rc.effective_from
          AND (rc.effective_to IS NULL OR $${todayParam}::date <= rc.effective_to)
        ORDER BY rc.effective_from DESC
        LIMIT 1
      ) active_collector ON true
      WHERE ${conditions.join(" AND ")}
      GROUP BY r.id, active_collector.collector_id, active_collector.collector_name
      ORDER BY r.shift ASC, r.name ASC`,
      params,
    );
  }

  async findById(routeId: string): Promise<Route | null> {
    return this.routeRepository.findOne({
      where: { id: routeId },
    });
  }

  async createRoute(data: {
    name: string;
    shift: ShiftType;
    dayOfWeek?: number | null;
    description?: string;
  }): Promise<Route> {
    const route = this.routeRepository.create({
      name: data.name,
      shift: data.shift,
      dayOfWeek: data.dayOfWeek ?? null,
      description: data.description ?? null,
      isActive: true,
    });
    return this.routeRepository.save(route);
  }

  async updateRoute(
    routeId: string,
    data: Partial<{
      name: string;
      shift: ShiftType;
      dayOfWeek: number | null;
      isActive: boolean;
      description: string | null;
    }>,
  ): Promise<Route | null> {
    await this.routeRepository.update(routeId, data);
    return this.findById(routeId);
  }

  async softDeleteRoute(routeId: string): Promise<void> {
    await this.routeRepository.softDelete(routeId);
  }

  async canCollectorAccessRoute(
    routeId: string,
    collectorId: string,
    visitDate: string,
  ): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT 1
       FROM route_collector_assignments rco
       WHERE rco.route_id = $1
         AND rco.collector_id = $2
         AND $3::date >= rco.effective_from
         AND (rco.effective_to IS NULL OR $3::date <= rco.effective_to)
       LIMIT 1`,
      [routeId, collectorId, visitDate],
    );
    return rows.length > 0;
  }

  async findCollectorRoutes(
    collectorId: string,
    visitDate: string,
    shift?: ShiftType,
  ): Promise<RouteSummaryRow[]> {
    const params: unknown[] = [collectorId, visitDate];
    let shiftFilter = "";
    if (shift) {
      shiftFilter = `AND r.shift = $3`;
      params.push(shift);
    }

    const rows: RouteSummaryRow[] = await this.dataSource.query(
      `SELECT DISTINCT
        r.id,
        r.name,
        r.shift,
        r.day_of_week,
        r.is_active,
        r.description,
        r.created_at,
        r.updated_at,
        COUNT(DISTINCT rca.client_id)::text AS client_count,
        $1::uuid AS collector_id,
        NULL AS collector_name,
        NULL AS collected_today_pct
      FROM routes r
      INNER JOIN route_collector_assignments rco ON rco.route_id = r.id
      LEFT JOIN route_client_assignments rca ON rca.route_id = r.id
      WHERE r.deleted_at IS NULL
        AND r.is_active = true
        AND rco.collector_id = $1
        AND $2::date >= rco.effective_from
        AND (rco.effective_to IS NULL OR $2::date <= rco.effective_to)
        ${shiftFilter}
      GROUP BY r.id
      ORDER BY r.shift ASC, r.name ASC`,
      params,
    );

    return rows.filter((row) =>
      routeAppliesOnDate(row.day_of_week, visitDate, this.timezone),
    );
  }

  async findRouteClients(
    routeId: string,
    visitDate: string,
  ): Promise<RouteClientRow[]> {
    return this.dataSource.query(
      `SELECT
        c.id,
        c.code,
        c.first_name,
        c.last_name,
        rca.sequence_order,
        COALESCE(dvs.visit_status, rca.visit_status) AS visit_status,
        (
          SELECT COALESCE(SUM(i.amount_due - i.amount_paid), 0)
          FROM credits cr
          INNER JOIN installments i ON i.credit_id = cr.id
          WHERE cr.client_id = c.id
            AND cr.status = 'active'
            AND i.due_date = $2::date
            AND i.status IN ('pending', 'partial', 'overdue')
        )::text AS amount_due,
        (
          SELECT COUNT(*)::text
          FROM credits cr
          INNER JOIN installments i ON i.credit_id = cr.id
          WHERE cr.client_id = c.id
            AND cr.status = 'active'
            AND i.status IN ('overdue', 'partial')
            AND i.due_date < $2::date
        ) AS overdue_installment_count,
        ST_Y(c.current_location::geometry) AS lat,
        ST_X(c.current_location::geometry) AS lng
      FROM route_client_assignments rca
      INNER JOIN clients c ON c.id = rca.client_id AND c.deleted_at IS NULL
      LEFT JOIN daily_visit_snapshots dvs
        ON dvs.route_id = rca.route_id
        AND dvs.client_id = rca.client_id
        AND dvs.visit_date = $2::date
      WHERE rca.route_id = $1
      ORDER BY rca.sequence_order ASC`,
      [routeId, visitDate],
    );
  }

  async replaceRouteClients(
    routeId: string,
    clientIds: string[],
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `DELETE FROM route_client_assignments WHERE route_id = $1`,
        [routeId],
      );

      for (let i = 0; i < clientIds.length; i++) {
        await manager.query(
          `INSERT INTO route_client_assignments (route_id, client_id, sequence_order)
           VALUES ($1, $2, $3)`,
          [routeId, clientIds[i], i + 1],
        );
      }
    });
  }

  async assignCollector(data: {
    routeId: string;
    collectorId: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }): Promise<RouteCollectorAssignment> {
    const assignment = this.collectorAssignmentRepository.create({
      routeId: data.routeId,
      collectorId: data.collectorId,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ?? null,
    });
    return this.collectorAssignmentRepository.save(assignment);
  }

  async removeCollectorAssignment(assignmentId: string): Promise<boolean> {
    const result = await this.collectorAssignmentRepository.delete(assignmentId);
    return (result.affected ?? 0) > 0;
  }

  async findCollectorAssignment(
    assignmentId: string,
    routeId: string,
  ): Promise<RouteCollectorAssignment | null> {
    return this.collectorAssignmentRepository.findOne({
      where: { id: assignmentId, routeId },
    });
  }

  async validateClientIds(clientIds: string[]): Promise<string[]> {
    if (clientIds.length === 0) {
      return [];
    }
    const rows = await this.dataSource.query(
      `SELECT id FROM clients WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`,
      [clientIds],
    );
    return rows.map((r: { id: string }) => r.id);
  }

  async validateCollectorId(collectorId: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT u.id
       FROM users u
       INNER JOIN collector_profiles cp ON cp.user_id = u.id
       WHERE u.id = $1
         AND u.deleted_at IS NULL
         AND cp.status IN ('active', 'pending')`,
      [collectorId],
    );
    return rows.length > 0;
  }

  async listCollectorAssignments(routeId: string) {
    return this.dataSource.query(
      `SELECT
        rca.id,
        rca.collector_id,
        CONCAT(u.first_name, ' ', u.last_name) AS collector_name,
        rca.effective_from,
        rca.effective_to,
        rca.created_at
      FROM route_collector_assignments rca
      INNER JOIN users u ON u.id = rca.collector_id
      WHERE rca.route_id = $1
      ORDER BY rca.effective_from DESC`,
      [routeId],
    );
  }
}
