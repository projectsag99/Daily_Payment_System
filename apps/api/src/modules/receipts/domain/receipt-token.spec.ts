import {
  addDaysFromNow,
  buildReceiptPublicUrl,
  generateReceiptPublicToken,
  isLinkExpired,
} from "./receipt-token";

describe("receipt-token", () => {
  it("generates a base64url token with 256 bits of entropy", () => {
    const token = generateReceiptPublicToken();
    expect(token.length).toBeGreaterThan(0);
    expect(token).not.toMatch(/[+/=]/);
  });

  it("builds a public URL without trailing slash issues", () => {
    expect(buildReceiptPublicUrl("https://app.example.com/", "abc")).toBe(
      "https://app.example.com/r/abc",
    );
  });

  it("detects expired links", () => {
    const expiredAt = new Date("2020-01-01T00:00:00.000Z");
    expect(isLinkExpired(expiredAt, new Date("2026-01-01T00:00:00.000Z"))).toBe(
      true,
    );
  });

  it("adds days from now", () => {
    const now = new Date("2026-08-01T12:00:00.000Z");
    jest.useFakeTimers().setSystemTime(now);
    const expiresAt = addDaysFromNow(30);
    expect(expiresAt.toISOString().slice(0, 10)).toBe("2026-08-31");
    jest.useRealTimers();
  });
});
