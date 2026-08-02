import { CollectorStatus } from "../../../common/constants";
import {
  getNextCollectorStatus,
  canCollectorLogin,
  canCollectorOperate,
} from "./collector-status.fsm";

describe("CollectorStatusFSM", () => {
  it("allows pending → active via approve", () => {
    expect(getNextCollectorStatus(CollectorStatus.PENDING, "approve")).toBe(
      CollectorStatus.ACTIVE,
    );
  });

  it("allows pending → rejected via reject", () => {
    expect(getNextCollectorStatus(CollectorStatus.PENDING, "reject")).toBe(
      CollectorStatus.REJECTED,
    );
  });

  it("allows active → suspended via suspend", () => {
    expect(getNextCollectorStatus(CollectorStatus.ACTIVE, "suspend")).toBe(
      CollectorStatus.SUSPENDED,
    );
  });

  it("allows suspended → active via reactivate", () => {
    expect(getNextCollectorStatus(CollectorStatus.SUSPENDED, "reactivate")).toBe(
      CollectorStatus.ACTIVE,
    );
  });

  it("blocks invalid transition rejected → approve", () => {
    expect(getNextCollectorStatus(CollectorStatus.REJECTED, "approve")).toBeNull();
  });

  it("blocks login for rejected collectors", () => {
    const result = canCollectorLogin(CollectorStatus.REJECTED);
    expect(result.allowed).toBe(false);
  });

  it("allows login for pending collectors", () => {
    expect(canCollectorLogin(CollectorStatus.PENDING).allowed).toBe(true);
  });

  it("only active collectors can operate", () => {
    expect(canCollectorOperate(CollectorStatus.ACTIVE)).toBe(true);
    expect(canCollectorOperate(CollectorStatus.PENDING)).toBe(false);
    expect(canCollectorOperate(CollectorStatus.SUSPENDED)).toBe(false);
  });
});
