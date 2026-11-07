import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, CircleDashed, HelpCircle, Loader2, MinusCircle, ShieldAlert, ShieldCheck, ShieldQuestion, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, type Assessment, type EvidenceSignal, type RiskLevel, type SignalState } from "@/lib/assessment";
import { AppShell, BackButton, Eyebrow, PrimaryButton, Progress, SecureNote } from "./ui";

const STATE: Record<SignalState, { label: string; icon: typeof CheckCircle2; text: string }> = {
  passed: { label: "Passed", icon: CheckCircle2, text: "text-success" },
  warning: { label: "Warning", icon: AlertTriangle, text: "text-warning" },
  failed: { label: "Failed", icon: XCircle, text: "text-destructive" },
  inconclusive: { label: "Inconclusive", icon: HelpCircle, text: "text-muted-foreground" },
  not_performed: { label: "Not performed", icon: MinusCircle, text: "text-muted-foreground" },
};

const RISK: Record<RiskLevel, { title: string; body: string; icon: typeof ShieldCheck; tone: string; badge: string }> = {
  low: { title: "Your document looks good", body: "We found enough consistent evidence from your document.", icon: ShieldCheck, tone: "border-success/30 bg-success/5 text-success", badge: "Low risk" },
  uncertain: { title: "We need a clearer capture", body: "Some evidence was missing or unclear. You may be asked to scan again.", icon: ShieldQuestion, tone: "border-warning/30 bg-warning/5 text-warning", badge: "Uncertain" },
  elevated: { title: "We need to take a closer look", body: "Something in the capture needs a manual check. A member of our team may review it.", icon: ShieldAlert, tone: "border-destructive/30 bg-destructive/5 text-destructive", badge: "Elevated risk" },
};

function worst(signals: EvidenceSignal[]): SignalState {
  const order: SignalState[] = ["failed", "warning", "inconclusive", "not_performed", "passed"];
  return order.find((o) => signals.some((s) => s.state === o)) ?? "passed";
}

function SignalRow({ s }: { s: EvidenceSignal }) {
  const st = STATE[s.state];
  return (
    <li className="flex items-start gap-3 py-2">
      <st.icon className={cn("mt-0.5 h-4 w-4 shrink-0", st.text)} />
      <div className="flex-1">
        <p className="text-sm text-foreground">{s.explanation}</p>
        <p className="font-mono text-[11px] text-muted-foreground">{s.side} · {s.label}</p>
      </div>
      <span className={cn("text-xs font-semibold", st.text)}>{st.label}</span>
    </li>
  );
}

function CategoryCard({ id, label, signals, phase }: { id: string; label: string; signals: EvidenceSignal[]; phase: "pending" | "running" | "done" }) {
  const [open, setOpen] = useState(false);
  const w = worst(signals);
  const st = STATE[w];
  return (
    <div className="rounded-2xl border border-border">
      <button disabled={phase !== "done"} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={`cat-${id}`} className="flex w-full items-center gap-3 p-4 text-left">
        {phase === "pending" ? <CircleDashed className="h-5 w-5 text-border" /> : phase === "running" ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <st.icon className={cn("h-5 w-5", st.text)} />}
        <span className={cn("flex-1 text-[15px] font-semibold", phase === "pending" ? "text-muted-foreground" : "text-foreground")}>{label}</span>
        {phase === "done" && <><span className={cn("text-xs font-semibold", st.text)}>{st.label}</span><ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")} /></>}
        {phase === "running" && <span className="text-xs text-muted-foreground">Checking…</span>}
      </button>
      {open && <ul id={`cat-${id}`} className="divide-y divide-border border-t border-border px-4">{signals.map((s) => <SignalRow key={s.id} s={s} />)}</ul>}
    </div>
  );
}

export function AssessmentScreen({ assessment, onBack, onContinue }: { assessment: Assessment; onBack: () => void; onContinue: () => void }) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (done >= CATEGORIES.length) return;
    const t = setTimeout(() => setDone((d) => d + 1), 700);
    return () => clearTimeout(t);
  }, [done]);
  const finished = done >= CATEGORIES.length;
  const r = RISK[assessment.risk];
  const [why, setWhy] = useState(false);
  return (
    <AppShell
      header={<><BackButton onClick={onBack} /><div className="ml-4 flex-1"><Progress step={4} total={5} /></div></>}
      footer={<><PrimaryButton disabled={!finished} onClick={onContinue}>Continue</PrimaryButton><SecureNote>Simulated assessment from synthetic capture signals.</SecureNote></>}
    >
      <h1 className="pt-4 text-3xl font-bold leading-tight tracking-tight text-foreground">Checking your identity document</h1>
      <p className="mt-2 text-muted-foreground">{finished ? "All checks complete. Tap a section to see the evidence." : "This only takes a moment."}</p>

      {finished && (
        <div className={cn("mt-6 rounded-2xl border p-4", r.tone)}>
          <div className="flex items-start gap-3">
            <r.icon className="h-6 w-6 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-foreground">{r.title}</p>
                <span className="rounded-full border border-current px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{r.badge}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
              {assessment.reasons.length > 0 && (
                <>
                  <button onClick={() => setWhy(!why)} aria-expanded={why} className="mt-3 flex items-center gap-1 text-sm font-semibold text-foreground">
                    Why am I seeing this? <ChevronDown className={cn("h-4 w-4 transition", why && "rotate-180")} />
                  </button>
                  {why && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{assessment.reasons.map((x) => <li key={x}>{x}</li>)}</ul>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Eyebrow className="mt-8">Evidence</Eyebrow>
      <div className="mt-3 space-y-3">
        {CATEGORIES.map((c, i) => (
          <CategoryCard key={c.id} id={c.id} label={c.label} signals={assessment.signals.filter((s) => s.category === c.id)} phase={i < done ? "done" : i === done ? "running" : "pending"} />
        ))}
      </div>
    </AppShell>
  );
}
