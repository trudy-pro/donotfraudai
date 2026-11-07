// Demo-only adaptive onboarding policy. Deterministic; synthetic data only.
import { effectiveSignals, type Assessment, type EvidenceSignal } from "./assessment";

export type Route = "complete" | "recapture" | "nfc" | "liveness" | "manual_review";
export type RuleState = "met" | "unmet" | "missing";

export interface RuleResult {
  id: string;
  label: string;
  mandatory: boolean;
  state: RuleState;
}

export interface Decision {
  route: Route;
  rules: RuleResult[];
  /** Internal rationale for the demo rule inspector. */
  trace: string[];
}

type Pred = (s: EvidenceSignal) => boolean;

function rule(id: string, label: string, signals: EvidenceSignal[], pick: Pred, mandatory = true): RuleResult {
  const rel = signals.filter(pick);
  // Missing evidence never counts as passed.
  const state: RuleState =
    rel.length === 0 || rel.some((s) => s.state === "not_performed")
      ? "missing"
      : rel.every((s) => s.state === "passed")
        ? "met"
        : "unmet";
  return { id, label, mandatory, state };
}

function captured(side: "front" | "back", label: string, signals: EvidenceSignal[]): RuleResult {
  const rel = signals.filter((x) => x.side === side && x.category !== "chip" && x.category !== "face");
  const ok = rel.length > 0 && rel.every((x) => x.state !== "not_performed");
  return { id: side, label, mandatory: true, state: ok ? "met" : "missing" };
}

const isCamera: Pred = (x) => x.id.endsWith("camera");

export function evaluateRules(a: Assessment): RuleResult[] {
  const s = a.signals;
  const chip = s.find((x) => x.category === "chip");
  const face = s.find((x) => x.category === "face");
  const met = (id: string, label: string): RuleResult => ({ id, label, mandatory: true, state: "met" });
  const rules: RuleResult[] = [
    captured("front", "Front side captured", s),
    captured("back", "Back side captured", s),
    rule("quality", "Image quality sufficient on both sides", s, (x) => x.category === "quality"),
    chip?.state === "passed" ? met("document", "Document details consistent (via chip)") : rule("document", "Document details consistent", s, (x) => x.category === "document"),
    face?.state === "passed" ? met("physical", "Physical card confirmed (via liveness)") : rule("physical", "Physical card confirmed", s, (x) => x.category === "physical"),
    face?.state === "passed" ? met("screen", "No screen replay (via liveness)") : rule("screen", "No screen replay", s, (x) => x.category === "screen" && !isCamera(x)),
    rule("camera", "Camera stream integrity", s, isCamera),
  ];
  if (chip) rules.push(rule("chip", "Chip authenticated", s, (x) => x.category === "chip", false));
  if (face) rules.push(rule("face", "Liveness with card", s, (x) => x.category === "face", false));
  return rules;
}

export function decide(a: Assessment): Decision {
  const rules = evaluateRules(a);
  const trace: string[] = [`Assessment risk: ${a.risk}`];
  const eff = effectiveSignals(a.signals);
  const chip = a.signals.find((s) => s.category === "chip");
  const face = a.signals.find((s) => s.category === "face");

  if (a.signals.some((s) => isCamera(s) && s.state === "failed")) {
    trace.push("Camera integrity failed → manual review (no automatic rejection)");
    return { route: "manual_review", rules, trace };
  }
  if (chip?.state === "failed") {
    trace.push("Chip data contradicts printed document → manual review (no automatic rejection)");
    return { route: "manual_review", rules, trace };
  }
  if (eff.some((s) => s.serious)) {
    if (face) {
      trace.push(`Liveness ${face.state} → manual review`);
      return { route: "manual_review", rules, trace };
    }
    trace.push("Physical / screen indicator failed → liveness check");
    return { route: "liveness", rules, trace };
  }

  const allMet = rules.every((r) => !r.mandatory || r.state === "met");
  if (a.risk === "low" && allMet) {
    trace.push("All mandatory rules met → skip extra challenges");
    return { route: "complete", rules, trace };
  }
  if (a.risk === "low") trace.push("Low risk label but mandatory rules unmet → not auto-approved");

  const needsRecapture = rules.some((r) => (r.id === "front" || r.id === "back" || r.id === "quality") && r.state !== "met");
  if (needsRecapture) {
    trace.push("Missing side or insufficient quality → recapture");
    return { route: "recapture", rules, trace };
  }
  if (chip) {
    trace.push(`Chip ${chip.state} → manual review (device limits are not fraud signals)`);
    return { route: "manual_review", rules, trace };
  }
  trace.push("Capture usable but evidence incomplete → NFC chip read");
  return { route: "nfc", rules, trace };
}

/** Reproducible head-turn challenge derived from a session seed. */
export function challengeSequence(seed: string): ("left" | "right" | "up")[] {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const perms: ("left" | "right" | "up")[][] = [
    ["left", "right", "up"], ["right", "left", "up"], ["up", "left", "right"],
    ["left", "up", "right"], ["right", "up", "left"], ["up", "right", "left"],
  ];
  return perms[h % perms.length] ?? ["left", "right", "up"];
}
