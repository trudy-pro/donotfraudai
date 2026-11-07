import { useState } from "react";
import { AlertTriangle, CheckCircle2, Contrast, Focus, RotateCcw, ScanLine, Sun, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GUIDANCE, overallStatus, simulateCapture, type CaptureResult, type Scenario, type Side, type Status } from "@/lib/capture-sim";
import { AppShell, BackButton, Eyebrow, PrimaryButton, Progress, SecureNote } from "./ui";

const statusText: Record<Status, string> = { pass: "text-success", warn: "text-warning", fail: "text-destructive" };
const statusBg: Record<Status, string> = { pass: "bg-success", warn: "bg-warning", fail: "bg-destructive" };

function StatusIcon({ s, className }: { s: Status; className?: string }) {
  const I = s === "pass" ? CheckCircle2 : s === "warn" ? AlertTriangle : XCircle;
  return <I className={cn("h-4 w-4 shrink-0", statusText[s], className)} />;
}

export function ScenarioSwitch({ value, onChange }: { value: Scenario; onChange: (s: Scenario) => void }) {
  const opts: { id: Scenario; label: string }[] = [
    { id: "good", label: "Good" },
    { id: "poor", label: "Poor quality" },
    { id: "suspicious", label: "Suspicious" },
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Demo</span>
      <div className="flex flex-1 rounded-full border border-border bg-surface p-0.5">
        {opts.map((o) => (
          <button key={o.id} onClick={() => onChange(o.id)} className={cn("flex-1 rounded-full px-2 py-1 text-[11px] font-semibold transition", value === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Viewport({ side, scenario, captured }: { side: Side; scenario: Scenario; captured: boolean }) {
  const g = GUIDANCE[scenario];
  const frame = captured ? "border-primary-foreground" : g.alignment === "pass" ? "border-success" : "border-warning";
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-viewport">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,color-mix(in_oklab,var(--primary-foreground)_12%,transparent),transparent_70%)]" />
      <div className={cn("absolute inset-x-6 top-1/2 aspect-[1.586] -translate-y-1/2 rounded-2xl border-2 transition", frame, scenario === "poor" && !captured && "rotate-[-4deg] blur-[1px]")}>
        <div className="absolute inset-3 rounded-xl bg-primary-foreground/10">
          {side === "front" ? (
            <div className="flex h-full gap-3 p-3">
              <div className="h-full w-1/3 rounded-md bg-primary-foreground/20" />
              <div className="flex-1 space-y-2 pt-1">
                {[80, 60, 70, 40].map((w) => <div key={w} className="h-1.5 rounded bg-primary-foreground/25" style={{ width: `${w}%` }} />)}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-end gap-1 p-3 font-mono text-[8px] leading-tight text-primary-foreground/50">
              <span>IDCHE0000000&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</span><span>9001019F3001018CHE&lt;&lt;&lt;</span><span>MUSTER&lt;&lt;ANNA&lt;&lt;&lt;&lt;&lt;&lt;&lt;</span>
            </div>
          )}
        </div>
        {scenario === "poor" && !captured && <div className="absolute right-6 top-3 h-10 w-16 rounded-full bg-primary-foreground/60 blur-xl" />}
        {scenario === "suspicious" && <div className="absolute inset-0 rounded-2xl bg-[repeating-linear-gradient(90deg,color-mix(in_oklab,var(--primary-foreground)_8%,transparent)_0_2px,transparent_2px_5px)]" />}
        {!captured && <ScanLine className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 animate-pulse text-primary-foreground" />}
      </div>
      <div className="absolute inset-x-0 top-4 text-center text-sm font-medium text-primary-foreground">
        {captured ? "Captured" : g.alignment === "pass" ? `Hold steady — ${side} side in frame` : "Align the card with the outline"}
      </div>
      {!captured && (
        <div className="absolute inset-x-3 bottom-3 grid grid-cols-4 gap-1.5">
          {([["alignment", ScanLine, "Align"], ["glare", Sun, "Glare"], ["lighting", Contrast, "Light"], ["sharpness", Focus, "Sharp"]] as const).map(([k, I, l]) => (
            <div key={k} className="flex flex-col items-center gap-1 rounded-xl bg-primary-foreground/10 py-2 text-[10px] font-medium text-primary-foreground">
              <I className="h-4 w-4" />
              <span className="flex items-center gap-1"><span className={cn("h-1.5 w-1.5 rounded-full", statusBg[g[k]])} />{l}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Results({ result }: { result: CaptureResult }) {
  const o = overallStatus(result);
  const title = { pass: "Capture looks genuine", warn: "Capture needs attention", fail: result.scenario === "poor" ? "Image quality too low" : result.checks.every((c) => c.status !== "fail" || c.id === "consistency") ? "Document details don't match" : "Possible presentation attack" }[o];
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2">
        <StatusIcon s={o} className="h-5 w-5" />
        <p className="text-base font-semibold text-foreground">{title}</p>
      </div>
      <Eyebrow className="mt-4">Evidence</Eyebrow>
      <ul className="mt-2 space-y-2">
        {result.checks.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
            <span className={cn("w-1 self-stretch rounded-full", statusBg[c.status])} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{c.label}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{c.detail}</p>
            </div>
            <span className={cn("font-mono text-sm font-medium", statusText[c.status])}>{c.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CaptureScreen({ side, step, total, existing, onBack, onDone }: {
  side: Side; step: number; total: number; existing?: CaptureResult | undefined; onBack: () => void; onDone: (r: CaptureResult) => void;
}) {
  const [scenario, setScenario] = useState<Scenario>(existing?.scenario ?? "good");
  const [result, setResult] = useState<CaptureResult | undefined>(existing);
  const [busy, setBusy] = useState(false);
  const capture = () => {
    setBusy(true);
    setTimeout(() => { setResult(simulateCapture(side, scenario)); setBusy(false); }, 900);
  };
  return (
    <AppShell
      header={<><BackButton onClick={onBack} /><div className="ml-4 flex-1"><Progress step={step} total={total} /></div></>}
      footer={
        <>
          {result ? (
            <div className="flex gap-3">
              <button onClick={() => setResult(undefined)} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-foreground text-base font-semibold text-foreground transition hover:bg-surface">
                <RotateCcw className="h-4 w-4" />Retake
              </button>
              <div className="flex-1"><PrimaryButton onClick={() => onDone(result)}>Continue</PrimaryButton></div>
            </div>
          ) : (
            <PrimaryButton disabled={busy} onClick={capture}>{busy ? "Analysing…" : "Capture"}</PrimaryButton>
          )}
          <SecureNote>Simulated capture. No camera is used and no document is processed.</SecureNote>
        </>
      }
    >
      <ScenarioSwitch value={scenario} onChange={(s) => { setScenario(s); setResult(undefined); }} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">{side === "front" ? "Scan the front" : "Now turn it over"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{side === "front" ? "Place the photo side inside the outline." : "Scan the back with the machine-readable zone."}</p>
      <div className="mt-4"><Viewport side={side} scenario={scenario} captured={!!result} /></div>
      {result && <Results result={result} />}
    </AppShell>
  );
}
