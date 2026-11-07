import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, CheckCircle2, HelpCircle, Info, Lightbulb, Nfc, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FaceOutcome, NfcOutcome } from "@/lib/assessment";
import { challengeSequence } from "@/lib/decision";
import { AppShell, BackButton, Eyebrow, PrimaryButton, SecondaryButton, SecureNote } from "./ui";

function DemoOutcome<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Demo</span>
      <div className="flex flex-1 rounded-full border border-border bg-surface p-0.5">
        {options.map((o) => (
          <button key={o.id} onClick={() => onChange(o.id)} aria-pressed={value === o.id} className={cn("flex-1 rounded-full px-2 py-1 text-[11px] font-semibold transition", value === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function useTimedRun(duration: number, onEnd: () => void) {
  const [progress, setProgress] = useState<number | null>(null);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    if (progress === null || progress >= 100) return;
    const t = setTimeout(() => {
      const next = Math.min(100, progress + 100 / (duration / 100));
      setProgress(next);
      if (next >= 100) end.current();
    }, 100);
    return () => clearTimeout(t);
  }, [progress, duration]);
  return { progress, start: () => setProgress(0), reset: () => setProgress(null) };
}

function ResultPanel({ tone, title, body }: { tone: "success" | "neutral"; title: string; body: string }) {
  const Icon = tone === "success" ? CheckCircle2 : HelpCircle;
  return (
    <div role="status" className={cn("mt-6 flex items-start gap-3 rounded-2xl border p-4", tone === "success" ? "border-success/30 bg-success/5" : "border-border bg-surface")}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tone === "success" ? "text-success" : "text-muted-foreground")} />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

/* ---------------------------------- NFC ---------------------------------- */

const NFC_RESULT: Record<NfcOutcome, { tone: "success" | "neutral"; title: string; body: string }> = {
  authenticated: { tone: "success", title: "Chip authenticated", body: "We read the details stored on your document's chip and confirmed they are genuine." },
  unreadable: { tone: "neutral", title: "We couldn't read the chip", body: "This often happens with some phone models, thick cases or if the document moved. It doesn't mean anything is wrong with your document." },
  mismatch: { tone: "neutral", title: "We couldn't confirm your document", body: "The chip was read, but we need a specialist to check the details. You don't need to do anything else right now." },
  inconclusive: { tone: "neutral", title: "The chip read was incomplete", body: "Only part of the chip could be read. You can try again, or continue another way." },
};

function NfcIllustration({ reading }: { reading: boolean }) {
  return (
    <div className="relative mx-auto flex h-56 w-full items-center justify-center rounded-3xl bg-surface" aria-hidden>
      <div className="absolute bottom-10 h-24 w-40 rounded-xl border-2 border-border bg-background">
        <div className="absolute left-3 top-3 h-8 w-10 rounded-md bg-accent" />
        <div className="absolute right-4 top-1/2 h-6 w-8 -translate-y-1/2 rounded border-2 border-primary/50" />
      </div>
      <div className={cn("absolute top-6 flex h-36 w-20 flex-col items-center justify-center rounded-2xl border-2 border-foreground bg-background transition-transform duration-700", reading ? "translate-x-10 translate-y-4" : "translate-x-16")}>
        <Smartphone className="h-6 w-6 text-muted-foreground" />
        {reading && <Nfc className="mt-2 h-6 w-6 animate-pulse text-primary" />}
      </div>
    </div>
  );
}

export function NfcScreen({ onBack, onResult }: { onBack: () => void; onResult: (o: NfcOutcome) => void }) {
  const [demo, setDemo] = useState<NfcOutcome>("authenticated");
  const [result, setResult] = useState<NfcOutcome | null>(null);
  const run = useTimedRun(3000, () => setResult(demo));
  const reading = run.progress !== null && result === null;
  const retry = () => { setResult(null); run.reset(); };

  return (
    <AppShell
      header={<><BackButton onClick={onBack} /><Eyebrow>Additional check</Eyebrow></>}
      footer={
        <>
          {result === null && (
            <div className="space-y-3">
              <PrimaryButton disabled={reading} onClick={run.start}>{reading ? "Reading chip…" : "Start reading"}</PrimaryButton>
              {!reading && <SecondaryButton onClick={() => onResult("unreadable")}>My phone can't read chips</SecondaryButton>}
            </div>
          )}
          {result === "authenticated" && <PrimaryButton onClick={() => onResult(result)}>Continue</PrimaryButton>}
          {result === "mismatch" && <PrimaryButton onClick={() => onResult(result)}>Continue</PrimaryButton>}
          {result && result !== "authenticated" && result !== "mismatch" && (
            <div className="space-y-3">
              <PrimaryButton onClick={retry}>Try again</PrimaryButton>
              <SecondaryButton onClick={() => onResult(result)}>Use another method</SecondaryButton>
            </div>
          )}
          <SecureNote>Simulated. No NFC hardware is accessed and no chip data is read.</SecureNote>
        </>
      }
    >
      <DemoOutcome value={demo} onChange={(v) => { setDemo(v); retry(); }} options={[{ id: "authenticated", label: "Authenticated" }, { id: "unreadable", label: "Could not read" }, { id: "inconclusive", label: "Inconclusive" }, { id: "mismatch", label: "Mismatch" }]} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Read your document's chip</h1>
      <p className="mt-1 text-sm text-muted-foreground">This confirms your details directly from the secure chip.</p>
      <div className="mt-5"><NfcIllustration reading={reading} /></div>

      {reading && (
        <div className="mt-5" aria-live="polite">
          <div className="flex justify-between text-sm"><span className="font-medium text-foreground">Keep still…</span><span className="font-mono text-muted-foreground">{Math.round(run.progress ?? 0)}%</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={Math.round(run.progress ?? 0)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary transition-all" style={{ width: `${run.progress}%` }} />
          </div>
        </div>
      )}

      {result ? (
        <ResultPanel {...NFC_RESULT[result]} />
      ) : (
        !reading && (
          <ol className="mt-5 divide-y divide-border rounded-2xl border border-border">
            {["Remove your phone case if it's thick", "Place the document flat on a table", "Rest the top of your phone's back on the document", "Hold still until reading finishes"].map((t, i) => (
              <li key={t} className="flex items-center gap-3 p-3.5"><span className="font-mono text-xs text-muted-foreground">0{i + 1}</span><span className="text-[15px] text-foreground">{t}</span></li>
            ))}
          </ol>
        )
      )}
    </AppShell>
  );
}

/* ---------------------------------- Face --------------------------------- */

const FACE_RESULT: Record<FaceOutcome, { tone: "success" | "neutral"; title: string; body: string }> = {
  passed: { tone: "success", title: "Selfie check complete", body: "We confirmed a live person holding the physical document." },
  inconclusive: { tone: "neutral", title: "We didn't get a clear result", body: "Lighting or movement can affect this check. You can try again, or a specialist can complete it for you." },
  unable: { tone: "neutral", title: "The selfie check couldn't be completed", body: "That's okay — some devices or situations make this hard. A specialist can complete your verification instead." },
};

const DIR = { left: { label: "Turn your head left", icon: ArrowLeft }, right: { label: "Turn your head right", icon: ArrowRight }, up: { label: "Look up slightly", icon: ArrowUp } } as const;

export function FaceScreen({ seed, onBack, onResult }: { seed: string; onBack: () => void; onResult: (o: FaceOutcome) => void }) {
  const sequence = challengeSequence(seed);
  const [demo, setDemo] = useState<FaceOutcome>("passed");
  const [extraTime, setExtraTime] = useState(false);
  const [result, setResult] = useState<FaceOutcome | null>(null);
  const run = useTimedRun((extraTime ? 3000 : 1500) * sequence.length, () => setResult(demo));
  const active = run.progress !== null && result === null;
  const stepIdx = active ? Math.min(sequence.length - 1, Math.floor(((run.progress ?? 0) / 100) * sequence.length)) : -1;
  const retry = () => { setResult(null); run.reset(); };
  const curDir = stepIdx >= 0 ? sequence[stepIdx] : undefined;
  const cur = curDir ? DIR[curDir] : null;

  return (
    <AppShell
      header={<><BackButton onClick={onBack} /><Eyebrow>Additional check</Eyebrow></>}
      footer={
        <>
          {result === null && (
            <div className="space-y-3">
              <PrimaryButton disabled={active} onClick={run.start}>{active ? "Follow the prompts…" : "Start selfie check"}</PrimaryButton>
              {!active && <SecondaryButton onClick={() => onResult("unable")}>Continue with a specialist</SecondaryButton>}
            </div>
          )}
          {result === "passed" && <PrimaryButton onClick={() => onResult(result)}>Continue</PrimaryButton>}
          {result && result !== "passed" && (
            <div className="space-y-3">
              <PrimaryButton onClick={retry}>Try again</PrimaryButton>
              <SecondaryButton onClick={() => onResult(result)}>Continue with a specialist</SecondaryButton>
            </div>
          )}
          <SecureNote>Simulated. No camera is accessed and no biometric data is processed.</SecureNote>
        </>
      }
    >
      <DemoOutcome value={demo} onChange={(v) => { setDemo(v); retry(); }} options={[{ id: "passed", label: "Passed" }, { id: "inconclusive", label: "Inconclusive" }, { id: "unable", label: "Unable" }]} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Take a short selfie</h1>
      <p className="mt-1 text-sm text-muted-foreground">Hold your document next to your face and follow three simple movements.</p>

      <div className="relative mt-5 aspect-[4/5] overflow-hidden rounded-3xl bg-viewport">
        <div className={cn("absolute left-1/2 top-[44%] h-[62%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[3px] transition-colors", result === "passed" ? "border-success" : active ? "border-primary-foreground" : "border-primary-foreground/50")} />
        <div className="absolute bottom-[14%] right-[8%] h-12 w-20 rounded-md border-2 border-dashed border-primary-foreground/50" aria-hidden />
        <div className="absolute inset-x-0 top-4 flex items-center justify-center gap-2 text-sm font-medium text-primary-foreground" aria-live="polite">
          {cur ? <><cur.icon className="h-5 w-5" />{cur.label}</> : result ? (result === "passed" ? "Done" : "Paused") : <><Lightbulb className="h-4 w-4" />Face a light source and centre your face</>}
        </div>
        {active && (
          <div className="absolute inset-x-6 bottom-4 flex gap-1.5">
            {sequence.map((s, i) => <span key={s} className={cn("h-1 flex-1 rounded-full", i <= stepIdx ? "bg-primary-foreground" : "bg-primary-foreground/25")} />)}
          </div>
        )}
      </div>

      {result ? (
        <ResultPanel {...FACE_RESULT[result]} />
      ) : (
        <>
          <ol className="mt-4 flex gap-2" aria-label="Movement sequence">
            {sequence.map((s, i) => {
              const D = DIR[s];
              return (
                <li key={s} className={cn("flex flex-1 flex-col items-center gap-1 rounded-xl border p-2 text-center text-[11px]", i === stepIdx ? "border-primary bg-accent text-foreground" : "border-border text-muted-foreground")}>
                  <D.icon className="h-4 w-4" />{D.label.replace("Turn your head ", "").replace("Look up slightly", "up")}
                </li>
              );
            })}
          </ol>
          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-border p-3.5 text-sm text-foreground">
            <input type="checkbox" checked={extraTime} disabled={active} onChange={(e) => setExtraTime(e.target.checked)} className="h-4 w-4 accent-primary" />
            Give me more time for each movement
          </label>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />If you can't do this check, you can continue with a specialist instead.</p>
        </>
      )}
    </AppShell>
  );
}
