import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { truncate, handleApiError, CHARACTER_LIMIT } from "./utils.js";

// ─── truncate ──────────────────────────────────────────────────────────────────

describe("truncate", () => {
  it("returns the text unchanged when under the limit", () => {
    const short = "hello world";
    expect(truncate(short)).toBe(short);
  });

  it("truncates and appends warning when over the limit", () => {
    const long = "a".repeat(CHARACTER_LIMIT + 100);
    const result = truncate(long);
    expect(result.length).toBeLessThan(long.length);
    expect(result).toContain("⚠️ Response truncated");
    expect(result).toContain(String(long.length));
  });

  it("keeps exactly CHARACTER_LIMIT chars of content", () => {
    const exact = "x".repeat(CHARACTER_LIMIT);
    expect(truncate(exact)).toBe(exact);
  });
});

// ─── handleApiError ────────────────────────────────────────────────────────────

function makeAxiosError(status: number, message?: string): AxiosError {
  const err = new AxiosError("Request failed");
  err.response = {
    status,
    data: message ? { message } : {},
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
    statusText: String(status),
  };
  return err;
}

describe("handleApiError", () => {
  it("returns unauthorized message for 401", () => {
    expect(handleApiError(makeAxiosError(401))).toContain("Unauthorized");
  });

  it("returns forbidden message for 403", () => {
    expect(handleApiError(makeAxiosError(403, "no access"))).toContain("Forbidden");
  });

  it("returns not found message for 404", () => {
    expect(handleApiError(makeAxiosError(404))).toContain("Not found");
  });

  it("returns rate limit message for 429", () => {
    expect(handleApiError(makeAxiosError(429))).toContain("Rate limit");
  });

  it("returns generic API error for unknown status", () => {
    expect(handleApiError(makeAxiosError(500, "internal error"))).toContain(
      "API request failed (500)"
    );
  });

  it("returns timeout message for ECONNABORTED", () => {
    const err = new AxiosError("timeout");
    err.code = "ECONNABORTED";
    expect(handleApiError(err)).toContain("timed out");
  });

  it("handles plain Error instances", () => {
    const result = handleApiError(new Error("boom"));
    expect(result).toBe("Error: boom");
  });

  it("handles unknown thrown values", () => {
    expect(handleApiError("just a string")).toBe("Error: just a string");
  });
});
