import { mapClientRow, parseNearParam } from "./client.mapper";
import { ClientStatus } from "../../../common/constants";

describe("client.mapper", () => {
  it("maps database row to API response", () => {
    const result = mapClientRow({
      id: "uuid-1",
      code: "CLI-001",
      first_name: "Ana",
      last_name: "López",
      national_id: "123",
      phone: "+57300",
      email: null,
      address_line: "Calle 1",
      country: "CO",
      department: "DC",
      city: "Bogotá",
      lat: 4.6,
      lng: -74.0,
      status: ClientStatus.ACTIVE,
      notes: null,
      created_by: null,
      created_at: new Date("2026-01-01"),
      updated_at: new Date("2026-01-02"),
      active_credits_count: "2",
      overdue_installments_count: "1",
    });

    expect(result.fullName).toBe("Ana López");
    expect(result.location).toEqual({ lat: 4.6, lng: -74.0 });
    expect(result.activeCreditsCount).toBe(2);
  });

  it("parses near query param", () => {
    expect(parseNearParam("4.6097,-74.0817")).toEqual({
      lat: 4.6097,
      lng: -74.0817,
    });
    expect(parseNearParam("invalid")).toBeUndefined();
  });
});
