import { describe, expect, it } from "vitest";
import { overallStatus, simulateCapture } from "@/lib/capture-sim";

describe("capture simulation", () => {
  it("good capture passes all checks", () => {
    expect(overallStatus(simulateCapture("front", "good"))).toBe("pass");
  });
  it("poor quality fails image quality", () => {
    const r = simulateCapture("front", "poor");
    expect(r.checks.find((c) => c.id === "quality")?.status).toBe("fail");
  });
  it("suspicious presentation flags a screen", () => {
    const r = simulateCapture("back", "suspicious");
    expect(r.checks.find((c) => c.id === "screen")?.status).toBe("fail");
  });
  it("is deterministic", () => {
    const d = new Date("2026-01-01");
    expect(simulateCapture("back", "poor", d)).toEqual(simulateCapture("back", "poor", d));
  });
});
