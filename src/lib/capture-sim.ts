// Synthetic, deterministic capture simulation. No real camera or document processing.
export type Scenario = "good" | "poor" | "suspicious" | "injection" | "mrz" | "tampered";
export type Side = "front" | "back";
export type Status = "pass" | "warn" | "fail";

export interface Check {
  id: "presence" | "screen" | "quality" | "consistency" | "camera";
  label: string;
  detail: string;
  status: Status;
  score: number;
}

export interface Guidance {
  alignment: Status;
  glare: Status;
  lighting: Status;
  sharpness: Status;
}

export interface CaptureResult {
  side: Side;
  scenario: Scenario;
  capturedAt: string;
  checks: Check[];
}

export const GUIDANCE: Record<Scenario, Guidance> = {
  good: { alignment: "pass", glare: "pass", lighting: "pass", sharpness: "pass" },
  poor: { alignment: "warn", glare: "fail", lighting: "warn", sharpness: "fail" },
  suspicious: { alignment: "pass", glare: "pass", lighting: "pass", sharpness: "pass" },
  injection: { alignment: "pass", glare: "pass", lighting: "pass", sharpness: "pass" },
  mrz: { alignment: "pass", glare: "pass", lighting: "pass", sharpness: "pass" },
  tampered: { alignment: "pass", glare: "pass", lighting: "pass", sharpness: "pass" },
};

const TABLE: Record<Exclude<Scenario, "mrz" | "tampered">, Record<Side, Omit<Check, "label">[]>> = {
  good: {
    front: [
      { id: "presence", status: "pass", score: 96, detail: "Card edges and 3D parallax detected" },
      { id: "screen", status: "pass", score: 98, detail: "No moiré or pixel grid found" },
      { id: "quality", status: "pass", score: 92, detail: "Sharp · no glare · even light" },
      { id: "consistency", status: "pass", score: 95, detail: "Layout matches selected document type" },
      { id: "camera", status: "pass", score: 97, detail: "Hardware camera stream verified" },
    ],
    back: [
      { id: "presence", status: "pass", score: 95, detail: "Same physical card, flipped" },
      { id: "screen", status: "pass", score: 97, detail: "No moiré or pixel grid found" },
      { id: "quality", status: "pass", score: 90, detail: "MRZ fully legible" },
      { id: "consistency", status: "pass", score: 94, detail: "MRZ matches front-side fields" },
      { id: "camera", status: "pass", score: 97, detail: "Hardware camera stream verified" },
    ],
  },
  poor: {
    front: [
      { id: "presence", status: "pass", score: 81, detail: "Card edges partly detected" },
      { id: "screen", status: "pass", score: 90, detail: "No moiré or pixel grid found" },
      { id: "quality", status: "fail", score: 38, detail: "Motion blur · glare over photo" },
      { id: "consistency", status: "warn", score: 62, detail: "Some fields unreadable" },
      { id: "camera", status: "pass", score: 95, detail: "Hardware camera stream verified" },
    ],
    back: [
      { id: "presence", status: "pass", score: 78, detail: "Card edges partly detected" },
      { id: "screen", status: "pass", score: 89, detail: "No moiré or pixel grid found" },
      { id: "quality", status: "fail", score: 41, detail: "MRZ out of focus · low light" },
      { id: "consistency", status: "warn", score: 55, detail: "MRZ checksum could not be read" },
      { id: "camera", status: "pass", score: 95, detail: "Hardware camera stream verified" },
    ],
  },
  suspicious: {
    front: [
      { id: "presence", status: "fail", score: 22, detail: "Flat surface, no card parallax" },
      { id: "screen", status: "fail", score: 12, detail: "Moiré pattern & screen bezel reflection" },
      { id: "quality", status: "pass", score: 88, detail: "Sharp · no glare" },
      { id: "consistency", status: "warn", score: 58, detail: "Hologram response missing" },
      { id: "camera", status: "pass", score: 93, detail: "Hardware camera stream verified" },
    ],
    back: [
      { id: "presence", status: "fail", score: 19, detail: "Flat surface, no card parallax" },
      { id: "screen", status: "fail", score: 10, detail: "Refresh-rate flicker detected" },
      { id: "quality", status: "pass", score: 86, detail: "MRZ legible" },
      { id: "consistency", status: "fail", score: 31, detail: "MRZ checksum mismatch with front" },
      { id: "camera", status: "pass", score: 93, detail: "Hardware camera stream verified" },
    ],
  },
  injection: {
    front: [
      { id: "presence", status: "pass", score: 90, detail: "Card edges detected" },
      { id: "screen", status: "pass", score: 92, detail: "No moiré or pixel grid found" },
      { id: "quality", status: "pass", score: 94, detail: "Unusually uniform noise profile" },
      { id: "consistency", status: "pass", score: 91, detail: "Layout matches selected document type" },
      { id: "camera", status: "fail", score: 8, detail: "Virtual camera / injected stream detected" },
    ],
    back: [
      { id: "presence", status: "pass", score: 89, detail: "Card edges detected" },
      { id: "screen", status: "pass", score: 91, detail: "No moiré or pixel grid found" },
      { id: "quality", status: "pass", score: 93, detail: "MRZ legible" },
      { id: "consistency", status: "pass", score: 90, detail: "MRZ matches front-side fields" },
      { id: "camera", status: "fail", score: 6, detail: "Frame timing inconsistent with sensor" },
    ],
  },
};

const LABELS: Record<Check["id"], string> = {
  presence: "Physical document presence",
  screen: "Screen presentation",
  quality: "Image quality",
  consistency: "Document consistency",
  camera: "Camera integrity",
};

// "mrz": good capture, but the machine-readable zone could not be fully cross-checked.
function rows(scenario: Scenario, side: Side): Omit<Check, "label">[] {
  if (scenario === "tampered")
    return TABLE.good[side].map((c) =>
      c.id === "consistency"
        ? { ...c, status: "fail" as const, score: 18, detail: side === "front" ? "Font and photo area don't match the document template" : "MRZ checksum mismatch with printed fields" }
        : c,
    );
  if (scenario !== "mrz") return TABLE[scenario as Exclude<Scenario, "mrz" | "tampered">][side];
  return TABLE.good[side].map((c) =>
    side === "back" && c.id === "consistency" ? { ...c, status: "warn" as const, score: 64, detail: "MRZ partly covered by laminate reflection" } : c,
  );
}

export function simulateCapture(side: Side, scenario: Scenario, now = new Date()): CaptureResult {
  return {
    side,
    scenario,
    capturedAt: now.toISOString(),
    checks: rows(scenario, side).map((c) => ({ ...c, label: LABELS[c.id] })),
  };
}

export function overallStatus(r: CaptureResult): Status {
  if (r.checks.some((c) => c.status === "fail")) return "fail";
  if (r.checks.some((c) => c.status === "warn")) return "warn";
  return "pass";
}
