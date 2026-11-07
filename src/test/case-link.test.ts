import { describe, expect, it } from "vitest";
import {
  applicantOutcome,
  applyLink,
  caseLinkActive,
  initialCase,
  parseCaseLink,
  type CaseLink,
} from "@/lib/case";

const now = new Date("2026-11-07T06:00:00Z");
const link = (l: Partial<CaseLink>): CaseLink => ({ demo: null, screen: null, status: null, requested: null, reason: null, ...l });

describe("case deep links", () => {
  it("drops unknown demo, screen and status values instead of trusting them", () => {
    const p = parseCaseLink({ demo: "not-a-scenario", screen: "admin", status: "superuser", requested: "exploit" });
    expect(p).toEqual({ demo: null, screen: null, status: null, requested: null, reason: null });
    expect(caseLinkActive(p)).toBe(false);
  });

  it("keeps only known values", () => {
    expect(parseCaseLink({ demo: "uncertain_chip", screen: "check", requested: "nfc" })).toEqual(
      link({ demo: "uncertain_chip", screen: "check", requested: "nfc" }),
    );
  });

  it("a link with no demo cannot open a case", () => {
    const s = initialCase();
    expect(applyLink(s, link({ status: "approved" }), now)).toBe(s);
  });

  it("Low + screen=result completes: approved through the normal policy path", () => {
    const s = applyLink(initialCase(), link({ demo: "low", screen: "result" }), now);
    expect(s.status).toBe("approved");
    expect(applicantOutcome(s)).toBe("complete");
    expect(s.screen).toBe("result");
  });

  it("Uncertain chip + screen=result asks for the chip read instead of pretending to pass", () => {
    const s = applyLink(initialCase(), link({ demo: "uncertain_chip", screen: "result" }), now);
    expect(s.status).toBe("evidence_requested");
    expect(s.requested).toBe("nfc");
    expect(applicantOutcome(s)).toBe("unable");
  });

  it("Elevated injection + screen=result goes to a specialist, never an automatic rejection", () => {
    const s = applyLink(initialCase(), link({ demo: "elevated_injection", screen: "result" }), now);
    expect(s.status).toBe("pending_review");
    expect(applicantOutcome(s)).toBe("review");
    expect(s.rejectReason).toBeNull();
  });

  it("screen=check opens the check the policy asked for", () => {
    const s = applyLink(initialCase(), link({ demo: "elevated_replay", screen: "check" }), now);
    expect(s.screen).toBe("check");
    expect(s.decision?.route).toBe("liveness");
  });

  it("status=approved is refused when policy requirements are unmet", () => {
    const blocked = applyLink(initialCase(), link({ demo: "elevated_injection", status: "approved" }), now);
    expect(blocked.status).not.toBe("approved");
    const ok = applyLink(initialCase(), link({ demo: "low", status: "approved" }), now);
    expect(ok.status).toBe("approved");
  });

  it("status=rejected records a reason from the documented list only", () => {
    const s = applyLink(initialCase(), link({ demo: "elevated_replay", status: "rejected" }), now);
    expect(s.status).toBe("rejected");
    expect(s.rejectReason).toBe("Document could not be verified");
  });
});
