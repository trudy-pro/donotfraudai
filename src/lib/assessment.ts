// Deterministic mock assessment built from stored capture results. Synthetic only.
import type { CaptureResult, Check, Side } from "./capture-sim";

export type SignalState = "passed" | "warning" | "failed" | "inconclusive" | "not_performed";
export type EvidenceCategory = "document" | "quality" | "physical" | "screen" | "chip" | "face";
export type CaptureCategory = "document" | "quality" | "physical" | "screen";
export type NfcOutcome = "authenticated" | "unreadable" | "inconclusive" | "mismatch";
export type FaceOutcome = "passed" | "inconclusive" | "unable";
export interface ExtraEvidence {
  nfc?: NfcOutcome;
  face?: FaceOutcome;
}
export type RiskLevel = "low" | "uncertain" | "elevated";

export interface EvidenceSignal {
  id: string;
  category: EvidenceCategory;
  side: Side;
  label: string;
  state: SignalState;
  /** Applicant-friendly explanation; never exposes thresholds. */
  explanation: string;
  /** True when a failure indicates possible fraud rather than a quality issue. */
  serious: boolean;
  /** Where the evidence came from (analyst view). */
  provenance: string;
  /** Technical observation from the simulated model (analyst view). */
  detail?: string;
  /** Simulated quality measure 0–100; only set where a quality measure is meaningful. */
  measure?: number;
}

export interface Assessment {
  risk: RiskLevel;
  signals: EvidenceSignal[];
  reasons: string[];
  createdAt: string;
}

export const CATEGORIES: { id: CaptureCategory; label: string }[] = [
  { id: "document", label: "Document information" },
  { id: "quality", label: "Capture quality" },
  { id: "physical", label: "Physical document evidence" },
  { id: "screen", label: "Screen-presentation indicators" },
];

const CHECK_TO_CATEGORY: Record<Check["id"], CaptureCategory> = {
  consistency: "document",
  quality: "quality",
  presence: "physical",
  screen: "screen",
  camera: "screen",
};

const COPY: Record<CaptureCategory, Record<SignalState, string>> = {
  document: {
    passed: "Document details are consistent.",
    warning: "Some document details could not be read clearly.",
    failed: "Document details do not match each other.",
    inconclusive: "Details could not be compared because the image was unclear.",
    not_performed: "This side was not captured.",
  },
  quality: {
    passed: "The image is sharp and well lit.",
    warning: "The image is usable but not ideal.",
    failed: "The image is blurry, too dark or has glare.",
    inconclusive: "Image quality could not be determined.",
    not_performed: "This side was not captured.",
  },
  physical: {
    passed: "A real physical card was detected.",
    warning: "Physical card evidence was weak.",
    failed: "We could not confirm a real physical card.",
    inconclusive: "Not enough image detail to confirm a physical card.",
    not_performed: "This side was not captured.",
  },
  screen: {
    passed: "No signs of a photo shown on a screen.",
    warning: "Possible screen reflections were noticed.",
    failed: "The image appears to be replayed from a screen.",
    inconclusive: "Screen indicators could not be checked.",
    not_performed: "This side was not captured.",
  },
};

const CAMERA_COPY: Record<SignalState, string> = {
  passed: "The images came directly from your camera.",
  warning: "The camera signal looked unusual.",
  failed: "The images may not have come directly from a camera.",
  inconclusive: "Camera integrity could not be checked.",
  not_performed: "This side was not captured.",
};

const LABELS: Record<CaptureCategory, string> = {
  document: "Document consistency",
  quality: "Image quality",
  physical: "Physical presence",
  screen: "Screen replay",
};

export function buildSignals(captures: Partial<Record<Side, CaptureResult>>): EvidenceSignal[] {
  const out: EvidenceSignal[] = [];
  for (const side of ["front", "back"] as const) {
    const cap = captures[side];
    const qualityFailed = cap?.checks.some((c) => c.id === "quality" && c.status === "fail") ?? false;
    for (const cat of CATEGORIES) {
      const checks = cap?.checks.filter((c) => CHECK_TO_CATEGORY[c.id] === cat.id) ?? [];
      if (checks.length === 0) {
        out.push({ id: `${side}-${cat.id}`, category: cat.id, side, label: LABELS[cat.id], state: "not_performed", explanation: COPY[cat.id].not_performed, serious: false, provenance: `No ${side} capture recorded` });
        continue;
      }
      for (const check of checks) {
        let state: SignalState;
        if (check.status === "pass") state = "passed";
        else if (check.status === "warn") state = qualityFailed && cat.id !== "quality" ? "inconclusive" : "warning";
        else state = "failed";
        const isCam = check.id === "camera";
        const serious = state === "failed" && (cat.id === "screen" || cat.id === "physical");
        out.push({
          id: isCam ? `${side}-camera` : `${side}-${cat.id}`,
          category: cat.id,
          side,
          label: isCam ? "Camera integrity" : LABELS[cat.id],
          state,
          explanation: isCam ? CAMERA_COPY[state] : COPY[cat.id][state],
          serious,
          provenance: `${side === "front" ? "Front" : "Back"} document capture · simulated capture model · ${cap?.capturedAt ?? ""}`,
          detail: check.detail,
          ...(cat.id === "quality" ? { measure: check.score } : {}),
        });
      }
    }
  }
  return out;
}

export function extraSignals(e: ExtraEvidence, at = ""): EvidenceSignal[] {
  const out: EvidenceSignal[] = [];
  if (e.nfc) {
    const map = {
      authenticated: ["passed", "The chip data was read and its signature confirmed."],
      unreadable: ["not_performed", "The chip could not be read with this device."],
      inconclusive: ["inconclusive", "The chip read was incomplete."],
    } as const;
    const [state, explanation] = e.nfc === "mismatch" ? (["failed", "The chip data doesn't match the printed document details."] as const) : map[e.nfc];
    out.push({ id: "chip", category: "chip", side: "back", label: "Chip authentication", state, explanation, serious: e.nfc === "mismatch", provenance: `Simulated NFC chip read · ${at}` });
  }
  if (e.face) {
    const map = {
      passed: ["passed", "A live person holding the physical card was confirmed."],
      inconclusive: ["inconclusive", "The selfie check didn't give a clear result."],
      unable: ["not_performed", "The selfie check couldn't be completed."],
    } as const;
    const [state, explanation] = map[e.face];
    out.push({ id: "face", category: "face", side: "front", label: "Liveness", state, explanation, serious: false, provenance: `Simulated liveness selfie with head-turn challenge · ${at}` });
  }
  return out;
}

/** Signals that still count after additional checks: a verified chip supersedes document
 *  consistency; a passed liveness-with-card supersedes physical/screen capture signals. */
export function effectiveSignals(signals: EvidenceSignal[]): EvidenceSignal[] {
  const chipOk = signals.some((s) => s.category === "chip" && s.state === "passed");
  const faceOk = signals.some((s) => s.category === "face" && s.state === "passed");
  return signals.filter(
    (s) => !(chipOk && s.category === "document") && !(faceOk && (s.category === "physical" || (s.category === "screen" && s.id.endsWith("screen")))),
  );
}

export function assessRisk(signals: EvidenceSignal[]): RiskLevel {
  const eff = effectiveSignals(signals);
  if (eff.some((s) => s.serious)) return "elevated";
  if (eff.some((s) => s.state !== "passed")) return "uncertain";
  return "low";
}

export function buildAssessment(captures: Partial<Record<Side, CaptureResult>>, now = new Date(), extra: ExtraEvidence = {}): Assessment {
  const signals = [...buildSignals(captures), ...extraSignals(extra, now.toISOString())];
  const risk = assessRisk(signals);
  const reasons = effectiveSignals(signals)
    .filter((s) => s.state !== "passed")
    .map((s) => (s.category === "chip" || s.category === "face" ? s.explanation : `${s.side === "front" ? "Front" : "Back"}: ${s.explanation}`));
  return { risk, signals, reasons, createdAt: now.toISOString() };
}
