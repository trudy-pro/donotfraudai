// Pure, deterministic case model shared by the applicant flow and the analyst dashboard.
// Synthetic data only; every function takes `now` so journeys are reproducible in tests.
import { buildAssessment, effectiveSignals, type Assessment, type ExtraEvidence } from "./assessment";
import { simulateCapture, type CaptureResult, type Scenario, type Side } from "./capture-sim";
import { decide, type Decision } from "./decision";

export type DocType = "swiss-id" | "residence-permit" | "passport";
export type DemoCase = "low" | "uncertain" | "uncertain_chip" | "document_failed" | "elevated_replay" | "elevated_injection";
export type CaseStatus = "in_progress" | "approved" | "pending_review" | "in_review" | "evidence_requested" | "rejected";
export type CheckKind = "recapture" | "nfc" | "liveness";
export type ApplicantScreen = "welcome" | "document" | "front" | "back" | "assessment" | "decision" | "check" | "result";
export type ApplicantOutcome = "complete" | "review" | "unable";

export interface AuditEntry {
  at: string;
  actor: "applicant" | "system" | "analyst";
  action: string;
  detail?: string;
}

export interface CaseState {
  caseId: string;
  screen: ApplicantScreen;
  doc: DocType | null;
  captures: Partial<Record<Side, CaptureResult>>;
  extra: ExtraEvidence;
  assessment: Assessment | null;
  decision: Decision | null;
  demoCase: DemoCase | null;
  status: CaseStatus;
  requested: CheckKind | null;
  rejectReason: string | null;
  audit: AuditEntry[];
}

export const DEMO_SCENARIO: Record<DemoCase, Scenario> = {
  low: "good",
  uncertain: "poor",
  uncertain_chip: "mrz",
  document_failed: "tampered",
  elevated_replay: "suspicious",
  elevated_injection: "injection",
};

export const DOC_LABEL: Record<DocType, string> = {
  "swiss-id": "Swiss identity card",
  "residence-permit": "Swiss residence permit",
  passport: "Passport",
};

export const CHECK_LABEL: Record<CheckKind, string> = {
  recapture: "Document rescan",
  nfc: "NFC chip read",
  liveness: "Liveness selfie",
};

export const REJECT_REASONS = [
  "Document could not be verified",
  "Evidence is inconsistent across checks",
  "Applicant could not complete required checks",
  "Other (see note)",
] as const;

const log = (s: CaseState, now: Date, actor: AuditEntry["actor"], action: string, detail?: string): AuditEntry[] => [
  ...s.audit,
  { at: now.toISOString(), actor, action, ...(detail ? { detail } : {}) },
];

export function initialCase(caseId = "CASE-0001"): CaseState {
  return { caseId, screen: "welcome", doc: null, captures: {}, extra: {}, assessment: null, decision: null, demoCase: null, status: "in_progress", requested: null, rejectReason: null, audit: [] };
}

export function setScreen(s: CaseState, screen: ApplicantScreen): CaseState {
  return { ...s, screen };
}

export function selectDocument(s: CaseState, doc: DocType, now: Date): CaseState {
  return { ...s, doc, audit: log(s, now, "applicant", "Document type selected", DOC_LABEL[doc]) };
}

function reassess(s: CaseState, now: Date): CaseState {
  const assessment = buildAssessment(s.captures, now, s.extra);
  const decision = decide(assessment);
  return { ...s, assessment, decision, audit: log(s, now, "system", "Evidence reassessed", `Risk ${assessment.risk} · next: ${decision.route}`) };
}

export function clearCaptures(s: CaseState): CaseState {
  return { ...s, captures: {} };
}

export function recordCapture(s: CaseState, side: Side, r: CaptureResult, now: Date): CaseState {
  let next: CaseState = { ...s, captures: { ...s.captures, [side]: r }, audit: log(s, now, "applicant", `${side === "front" ? "Front" : "Back"} side captured`) };
  if (side === "back") {
    const fulfilled = next.requested === "recapture";
    next = reassess({ ...next, extra: fulfilled ? next.extra : {}, demoCase: null }, now);
    if (fulfilled) next = { ...next, requested: null, status: "pending_review", audit: log(next, now, "applicant", "Requested evidence provided", CHECK_LABEL.recapture) };
  }
  return next;
}

export function addEvidence(s: CaseState, e: ExtraEvidence, now: Date): CaseState {
  const kind: CheckKind = e.nfc ? "nfc" : "liveness";
  const outcome = e.nfc ?? e.face ?? "";
  let next = reassess({ ...s, extra: { ...s.extra, ...e }, audit: log(s, now, "applicant", `${CHECK_LABEL[kind]} completed`, outcome) }, now);
  if (s.requested === kind) next = { ...next, requested: null, status: "pending_review", audit: log(next, now, "applicant", "Requested evidence provided", CHECK_LABEL[kind]) };
  return next;
}

export function applyDemo(s: CaseState, dc: DemoCase, now: Date): CaseState {
  const sc = DEMO_SCENARIO[dc];
  const base: CaseState = {
    ...s,
    doc: s.doc ?? "swiss-id",
    demoCase: dc,
    captures: { front: simulateCapture("front", sc, now), back: simulateCapture("back", sc, now) },
    extra: {},
    status: "in_progress",
    requested: null,
    rejectReason: null,
    audit: log({ ...s, audit: [] }, now, "system", "Demo scenario loaded", dc),
  };
  return reassess(base, now);
}

/** Called when the applicant reaches the end of the automated flow. Never overrides analyst decisions. */
export function finalizeApplicant(s: CaseState, now: Date): CaseState {
  if (s.status !== "in_progress" || !s.decision) return { ...s, screen: "result" };
  if (s.decision.route === "complete")
    return { ...s, screen: "result", status: "approved", audit: log(s, now, "system", "Verification completed", "All mandatory policy requirements met") };
  if (s.decision.route === "manual_review")
    return { ...s, screen: "result", status: "pending_review", audit: log(s, now, "system", "Sent to manual review", s.decision.trace.at(-1)) };
  return s;
}

export function applicantOutcome(s: CaseState): ApplicantOutcome | null {
  switch (s.status) {
    case "approved": return "complete";
    case "rejected":
    case "evidence_requested": return "unable";
    case "pending_review":
    case "in_review": return "review";
    default: return null;
  }
}

export function approvalCheck(s: CaseState): { ok: boolean; reason: string } {
  if (!s.assessment || !s.decision) return { ok: false, reason: "No assessment available yet." };
  if (s.status === "approved" || s.status === "rejected") return { ok: false, reason: "Case is already closed." };
  if (s.status === "evidence_requested") return { ok: false, reason: "Waiting for requested evidence." };
  const unmet = s.decision.rules.filter((r) => r.mandatory && r.state !== "met");
  if (unmet.length) return { ok: false, reason: `Policy requirements not met: ${unmet.map((r) => r.label).join(", ")}.` };
  if (effectiveSignals(s.assessment.signals).some((x) => x.serious || (x.id.endsWith("camera") && x.state === "failed")))
    return { ok: false, reason: "Unresolved suspicious indicator." };
  return { ok: true, reason: "All mandatory policy requirements met." };
}

export type AnalystAction =
  | { type: "request"; kind: CheckKind }
  | { type: "review" }
  | { type: "approve" }
  | { type: "reject"; reason: string; note: string };

export function analystAct(s: CaseState, a: AnalystAction, now: Date): { state: CaseState; error?: string } {
  if (!s.assessment) return { state: s, error: "No case loaded." };
  if (s.status === "approved" || s.status === "rejected") return { state: s, error: "Case is already closed." };
  switch (a.type) {
    case "request":
      return { state: { ...s, status: "evidence_requested", requested: a.kind, screen: "result", audit: log(s, now, "analyst", "Additional evidence requested", CHECK_LABEL[a.kind]) } };
    case "review":
      return { state: { ...s, status: "in_review", audit: log(s, now, "analyst", "Manual review started") } };
    case "approve": {
      const c = approvalCheck(s);
      if (!c.ok) return { state: s, error: c.reason };
      return { state: { ...s, status: "approved", screen: "result", audit: log(s, now, "analyst", "Approved", c.reason) } };
    }
    case "reject": {
      if (!a.reason) return { state: s, error: "Select a rejection reason." };
      if (a.note.trim().length < 10) return { state: s, error: "Document the reason in at least 10 characters." };
      return { state: { ...s, status: "rejected", requested: null, rejectReason: a.reason, screen: "result", audit: log(s, now, "analyst", "Rejected", `${a.reason} — ${a.note.trim()}`) } };
    }
  }
}

// ---------- Deep links: /?demo=low&screen=check · /analyst?demo=low&status=approved ----------

export interface CaseLink {
  demo?: DemoCase | null;
  screen?: ApplicantScreen | null;
  status?: CaseStatus | null;
  requested?: CheckKind | null;
  reason?: string | null;
}

const SCREENS: readonly string[] = ["welcome", "document", "front", "back", "assessment", "decision", "check", "result"];
const STATUSES: readonly string[] = ["in_progress", "approved", "pending_review", "in_review", "evidence_requested", "rejected"];

const one = (v: unknown) => (typeof v === "string" && v.length ? v : null);

/** Parse address-bar params into a case link. Unknown values are dropped, never trusted. */
export function parseCaseLink(params: Record<string, unknown>): CaseLink {
  const demo = one(params["demo"]);
  const screen = one(params["screen"]);
  const status = one(params["status"]);
  const requested = one(params["requested"]);
  const reason = one(params["reason"]);
  return {
    demo: demo && demo in DEMO_SCENARIO ? (demo as DemoCase) : null,
    screen: screen && SCREENS.includes(screen) ? (screen as ApplicantScreen) : null,
    status: status && STATUSES.includes(status) ? (status as CaseStatus) : null,
    requested: requested && requested in CHECK_LABEL ? (requested as CheckKind) : null,
    reason: reason && (REJECT_REASONS as readonly string[]).includes(reason) ? reason : null,
  };
}

export function caseLinkActive(l: CaseLink) {
  return !!(l.demo || l.screen || l.status || l.requested || l.reason);
}

const routeCheck = (s: CaseState): CheckKind | null => {
  const r = s.decision?.route;
  return r === "nfc" ? "nfc" : r === "liveness" ? "liveness" : r === "recapture" ? "recapture" : null;
};

/**
 * Build the case a link points at. A link can only ever select a synthetic demo scenario —
 * it never carries applicant data, and approval still has to pass the same policy check as the button.
 */
export function applyLink(s: CaseState, l: CaseLink, now: Date): CaseState {
  let next = l.demo ? applyDemo(s, l.demo, now) : s;
  if (!next.assessment || !next.decision) return next;
  const kind = l.requested ?? routeCheck(next);
  const detail = kind ? CHECK_LABEL[kind] : undefined;

  if (l.status === "approved") {
    const c = approvalCheck(next);
    if (c.ok) next = { ...next, status: "approved", audit: log(next, now, "system", "Approved", c.reason) };
  } else if (l.status === "rejected") {
    const reason = l.reason ?? REJECT_REASONS[0];
    next = { ...next, status: "rejected", requested: null, rejectReason: reason, audit: log(next, now, "system", "Rejected", reason) };
  } else if (l.status === "in_review") {
    next = { ...next, status: "in_review", audit: log(next, now, "analyst", "Manual review started") };
  } else if (l.status === "pending_review") {
    next = { ...next, status: "pending_review", audit: log(next, now, "system", "Sent to manual review", next.decision.trace.at(-1)) };
  } else if (l.status === "evidence_requested") {
    next = { ...next, status: "evidence_requested", requested: kind, audit: log(next, now, "analyst", "Additional evidence requested", detail) };
  } else if (l.screen === "result") {
    const f = finalizeApplicant(next, now);
    next = f.status === "in_progress" ? { ...f, status: "evidence_requested", requested: kind, audit: log(f, now, "analyst", "Additional evidence requested", detail) } : f;
  }

  return l.screen ? setScreen(next, l.screen) : next;
}
