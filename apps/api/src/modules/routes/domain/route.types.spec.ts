import {
  dayOfWeekForDate,
  routeAppliesOnDate,
} from "./route.types";

describe("route.types", () => {
  it("computes day of week in timezone", () => {
    // 2026-07-26 is a Sunday
    expect(dayOfWeekForDate("2026-07-26", "America/Bogota")).toBe(0);
  });

  it("allows routes with null day_of_week on any date", () => {
    expect(routeAppliesOnDate(null, "2026-07-26", "America/Bogota")).toBe(true);
  });

  it("filters routes by day_of_week", () => {
    expect(routeAppliesOnDate(0, "2026-07-26", "America/Bogota")).toBe(true);
    expect(routeAppliesOnDate(1, "2026-07-26", "America/Bogota")).toBe(false);
  });
});
