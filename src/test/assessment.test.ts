import { describe, expect, it } from "vitest";
import { buildAssessment } from "@/lib/assessment";
import { simulateCapture } from "@/lib/capture-sim";

const both = (s: "good" | "poor" | "suspicious") => ({ front: simulateCapture("front", s), back: simulateCapture("back", s) });

describe("assessment", () => {
  it("good captures on both sides give Low risk", () => {
    expect(buildAssessment(both("good")).risk).toBe("low");
  });
  it("poor quality gives Uncertain risk", () => {
    expect(buildAssessment(both("poor")).risk).toBe("uncertain");
  });
  it("screen replay gives Elevated risk", () => {
    expect(buildAssessment(both("suspicious")).risk).toBe("elevated");
  });
  it("a missing side is Not performed and gives Uncertain risk", () => {
    const a = buildAssessment({ front: simulateCapture("front", "good") });
    expect(a.signals.find((s) => s.id === "back-screen")?.state).toBe("not_performed");
    expect(a.risk).toBe("uncertain");
  });
  it("poor image makes dependent warnings Inconclusive", () => {
    const a = buildAssessment(both("poor"));
    expect(a.signals.find((s) => s.id === "front-document")?.state).toBe("inconclusive");
  });
});
