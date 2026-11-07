import { describe, expect, it } from "vitest";
import { addEvidence, analystAct, applicantOutcome, approvalCheck, finalizeApplicant, initialCase, recordCapture, selectDocument, type CaseState } from "@/lib/case";
import { simulateCapture, type Scenario } from "@/lib/capture-sim";

const now = new Date("2026-11-07T06:00:00Z");
function capture(s: CaseState, sc: Scenario) {
  let c = selectDocument(s, "swiss-id", now);
  c = recordCapture(c, "front", simulateCapture("front", sc, now), now);
  return recordCapture(c, "back", simulateCapture("back", sc, now), now);
}

describe("full journeys", () => {
  it("Low: good capture completes without extra checks", () => {
    const s = finalizeApplicant(capture(initialCase(), "good"), now);
    expect(s.decision?.route).toBe("complete");
    expect(s.status).toBe("approved");
    expect(applicantOutcome(s)).toBe("complete");
  });

  it("Uncertain: chip unreadable → review; approve blocked; requested chip read then approved", () => {
    let s = capture(initialCase(), "mrz");
    expect(s.decision?.route).toBe("nfc");
    s = finalizeApplicant(addEvidence(s, { nfc: "unreadable" }, now), now);
    expect(applicantOutcome(s)).toBe("review");
    expect(approvalCheck(s).ok).toBe(false);
    expect(analystAct(s, { type: "approve" }, now).error).toBeDefined();
    s = analystAct(s, { type: "request", kind: "nfc" }, now).state;
    expect(applicantOutcome(s)).toBe("unable");
    s = addEvidence(s, { nfc: "authenticated" }, now);
    expect(s.status).toBe("pending_review");
    expect(approvalCheck(s).ok).toBe(true);
    s = analystAct(s, { type: "approve" }, now).state;
    expect(applicantOutcome(s)).toBe("complete");
  });

  it("Elevated: camera injection → review; reject needs a documented reason", () => {
    let s = finalizeApplicant(capture(initialCase(), "injection"), now);
    expect(s.status).toBe("pending_review");
    expect(analystAct(s, { type: "reject", reason: "Document could not be verified", note: "" }, now).error).toBeDefined();
    s = analystAct(s, { type: "reject", reason: "Document could not be verified", note: "Injected camera stream on both sides" }, now).state;
    expect(s.status).toBe("rejected");
    expect(applicantOutcome(s)).toBe("unable");
    expect(s.audit.at(-1)?.action).toBe("Rejected");
  });

  it("closed cases cannot be changed", () => {
    const s = finalizeApplicant(capture(initialCase(), "good"), now);
    expect(analystAct(s, { type: "review" }, now).error).toBe("Case is already closed.");
  });
});
