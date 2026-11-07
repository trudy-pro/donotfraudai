import { useState } from "react";
import { ChevronDown, Nfc, RotateCcw, ScanFace, ShieldCheck, UserCheck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Decision, Route, RuleState } from "@/lib/decision";
import type { Assessment, RiskLevel } from "@/lib/assessment";
import { AppShell, BackButton, Eyebrow, PrimaryButton, Progress, SecureNote } from "./ui";

import type { DemoCase } from "@/lib/case";
export type { DemoCase };

const ROUTE_COPY: Record<Route, { title: string; body: string; cta: string; icon: typeof ShieldCheck }> = {
  complete: { title: "No extra steps needed", body: "The evidence from your document is clear and consistent, so we can skip additional checks.", cta: "Finish", icon: ShieldCheck },
  recapture: { title: "We need one additional check to confirm your identity", body: "Part of your document wasn't captured clearly enough. A quick rescan in better light usually solves this.", cta: "Rescan document", icon: RotateCcw },
  nfc: { title: "We need one additional check to confirm your identity", body: "Your document has a secure chip. Holding it to your phone lets us read the details directly from the chip.", cta: "Read the chip", icon: Nfc },
  liveness: { title: "One more step to continue", body: "To keep your account safe, we'll ask you to take a short video selfie. This is a routine check.", cta: "Start selfie check", icon: ScanFace },
  manual_review: { title: "We'll finish this with a specialist", body: "A member of our verification team will review your submission. This is a routine step and you don't need to do anything else right now.", cta: "Continue", icon: UserCheck },
};

const RULE_TONE: Record<RuleState, string> = { met: "text-success", unmet: "text-destructive", missing: "text-warning" };

export function DemoCaseSelector({ value, onChange }: { value: DemoCase | null; onChange: (c: DemoCase) => void }) {
  const opts: { id: DemoCase; label: string }[] = [
    { id: "low", label: "Low" },
    { id: "uncertain", label: "Uncertain · quality" },
    { id: "uncertain_chip", label: "Uncertain · chip" },
    { id: "document_failed", label: "Document failed" },
    { id: "elevated_replay", label: "Elevated · replay" },
    { id: "elevated_injection", label: "Elevated · injection" },
  ];
  return (
    <div>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Demo case</span>
      <div className="mt-1 grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface p-1">
        {opts.map((o) => (
          <button key={o.id} onClick={() => onChange(o.id)} className={cn("rounded-xl px-2 py-1.5 text-[11px] font-semibold transition", value === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RuleInspector({ decision, risk }: { decision: Decision; risk: RiskLevel }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-2 p-4 text-left">
        <Wrench className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Rule inspector · demo only</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-border p-4 font-mono text-[11px]">
          <div className="flex justify-between"><span className="text-muted-foreground">risk</span><span className="text-foreground">{risk}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">route</span><span className="text-foreground">{decision.route}</span></div>
          <ul className="space-y-1">
            {decision.rules.map((r) => (
              <li key={r.id} className="flex justify-between gap-2">
                <span className="text-foreground">{r.mandatory ? "● " : "○ "}{r.label}</span>
                <span className={RULE_TONE[r.state]}>{r.state}</span>
              </li>
            ))}
          </ul>
          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">{decision.trace.map((t) => <li key={t}>{t}</li>)}</ol>
        </div>
      )}
    </div>
  );
}

export function DecisionScreen({ assessment, decision, demoCase, onDemoCase, onBack, onContinue }: {
  assessment: Assessment; decision: Decision; demoCase: DemoCase | null; onDemoCase: (c: DemoCase) => void; onBack: () => void; onContinue: () => void;
}) {
  const c = ROUTE_COPY[decision.route];
  return (
    <AppShell
      header={<><BackButton onClick={onBack} /><div className="ml-4 flex-1"><Progress step={5} total={5} /></div></>}
      footer={<><PrimaryButton onClick={onContinue}>{c.cta}</PrimaryButton><SecureNote>Your result is decided from several pieces of evidence, never a single score.</SecureNote></>}
    >
      <DemoCaseSelector value={demoCase} onChange={onDemoCase} />
      <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary"><c.icon className="h-7 w-7" /></div>
      <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-foreground">{c.title}</h1>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">{c.body}</p>
      <Eyebrow className="mt-8">What happens next</Eyebrow>
      <ol className="mt-3 divide-y divide-border rounded-2xl border border-border">
        {nextSteps(decision.route).map((s, i) => (
          <li key={s} className="flex items-center gap-3 p-4">
            <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
            <span className="text-[15px] text-foreground">{s}</span>
          </li>
        ))}
      </ol>
      <RuleInspector decision={decision} risk={assessment.risk} />
    </AppShell>
  );
}

function nextSteps(r: Route): string[] {
  switch (r) {
    case "complete": return ["Your verification is finished", "You can continue to your account"];
    case "recapture": return ["Rescan your document in even light", "We check the new images automatically"];
    case "nfc": return ["Hold the document flat to the back of your phone", "We read the details stored on the chip"];
    case "liveness": return ["Look at the camera and follow a short prompt", "We confirm it's you in real time"];
    case "manual_review": return ["A specialist reviews your submission", "We'll let you know the outcome"];
  }
}

