import { describe, expect, it } from "vitest";
import { buildAssessment, type ExtraEvidence } from "@/lib/assessment";
import { simulateCapture, type Scenario } from "@/lib/capture-sim";
import { challengeSequence, decide } from "@/lib/decision";

const d = new Date("2026-01-01");
const run = (s: Scenario, extra: ExtraEvidence = {}) =>
  decide(buildAssessment({ front: simulateCapture("front", s, d), back: simulateCapture("back", s, d) }, d, extra));

describe("NFC and face follow-up checks", () => {
  it("unclear document details request NFC", () => expect(run("mrz").route).toBe("nfc"));
  it("authenticated chip completes verification", () => expect(run("mrz", { nfc: "authenticated" }).route).toBe("complete"));
  it("unreadable chip goes to review, not completion", () => expect(run("mrz", { nfc: "unreadable" }).route).toBe("manual_review"));
  it("unreadable chip is never counted as passed", () => {
    const r = run("mrz", { nfc: "unreadable" }).rules.find((x) => x.id === "chip");
    expect(r?.state).toBe("missing");
  });
  it("passed liveness resolves screen replay, then chip resolves document mismatch", () => {
    expect(run("suspicious", { face: "passed" }).route).toBe("nfc");
    expect(run("suspicious", { face: "passed", nfc: "authenticated" }).route).toBe("complete");
  });
  it("inconclusive liveness goes to review", () => expect(run("suspicious", { face: "inconclusive" }).route).toBe("manual_review"));
  it("liveness cannot override camera injection", () => expect(run("injection", { face: "passed" }).route).toBe("manual_review"));
  it("good capture never asks for NFC or face", () => expect(run("good").route).toBe("complete"));
  it("head-turn challenge is reproducible", () => {
    expect(challengeSequence("abc")).toEqual(challengeSequence("abc"));
    expect(challengeSequence("abc")).toHaveLength(3);
  });
});

describe("document failed", () => {
  it("failed document details first request the chip", () => expect(run("tampered").route).toBe("nfc"));
  it("chip contradicting the document goes to manual review, never completion", () => {
    const d = run("tampered", { nfc: "mismatch" });
    expect(d.route).toBe("manual_review");
    expect(d.rules.find((r) => r.id === "chip")?.state).toBe("unmet");
  });
  it("unreadable chip on a failed document goes to manual review", () => expect(run("tampered", { nfc: "unreadable" }).route).toBe("manual_review"));
});
