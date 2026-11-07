import { describe, expect, it } from "vitest";
import { buildAssessment, type Assessment } from "@/lib/assessment";
import { simulateCapture, type Scenario } from "@/lib/capture-sim";
import { decide } from "@/lib/decision";

const both = (s: Scenario) => buildAssessment({ front: simulateCapture("front", s), back: simulateCapture("back", s) });

describe("adaptive decision", () => {
  it("Low with all rules met goes to completion", () => {
    expect(decide(both("good")).route).toBe("complete");
  });
  it("poor quality asks for recapture", () => {
    expect(decide(both("poor")).route).toBe("recapture");
  });
  it("screen replay asks for liveness", () => {
    expect(decide(both("suspicious")).route).toBe("liveness");
  });
  it("camera injection goes to manual review", () => {
    expect(decide(both("injection")).route).toBe("manual_review");
  });
  it("missing back side is never counted as passed", () => {
    const d = decide(buildAssessment({ front: simulateCapture("front", "good") }));
    expect(d.rules.find((r) => r.id === "back")?.state).toBe("missing");
    expect(d.route).toBe("recapture");
  });
  it("a Low label alone does not auto-approve when rules are unmet", () => {
    const a: Assessment = { ...buildAssessment({ front: simulateCapture("front", "good") }), risk: "low" };
    expect(decide(a).route).not.toBe("complete");
  });
  it("document inconsistency with good quality goes to NFC", () => {
    const a = both("good");
    const signals = a.signals.map((s) => (s.id === "front-document" ? { ...s, state: "warning" as const } : s));
    expect(decide({ ...a, signals, risk: "uncertain" }).route).toBe("nfc");
  });
});
