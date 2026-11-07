import { AlertTriangle, CheckCircle2, HelpCircle, MinusCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseStatus } from "@/lib/case";
import type { RiskLevel, SignalState } from "@/lib/assessment";

export const SIGNAL_STATE: Record<SignalState, { label: string; icon: typeof CheckCircle2; text: string; bar: string }> = {
  passed: { label: "Passed", icon: CheckCircle2, text: "text-success", bar: "bg-success" },
  warning: { label: "Warning", icon: AlertTriangle, text: "text-warning", bar: "bg-warning" },
  failed: { label: "Failed", icon: XCircle, text: "text-destructive", bar: "bg-destructive" },
  inconclusive: { label: "Inconclusive", icon: HelpCircle, text: "text-muted-foreground", bar: "bg-muted-foreground" },
  not_performed: { label: "Not performed", icon: MinusCircle, text: "text-muted-foreground", bar: "bg-border" },
};

export function SignalBadge({ state }: { state: SignalState }) {
  const s = SIGNAL_STATE[state];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", s.text)}>
      <s.icon className="h-3.5 w-3.5" />
      {s.label}
    </span>
  );
}

const STATUS: Record<CaseStatus, { label: string; tone: string }> = {
  in_progress: { label: "In progress", tone: "border-border text-muted-foreground" },
  approved: { label: "Approved", tone: "border-success/40 text-success" },
  pending_review: { label: "Pending review", tone: "border-warning/40 text-warning" },
  in_review: { label: "In review", tone: "border-primary/40 text-primary" },
  evidence_requested: { label: "Evidence requested", tone: "border-warning/40 text-warning" },
  rejected: { label: "Rejected", tone: "border-destructive/40 text-destructive" },
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  const s = STATUS[status];
  return <span className={cn("rounded-full border bg-background px-2.5 py-0.5 text-[11px] font-semibold", s.tone)}>{s.label}</span>;
}

const RISK: Record<RiskLevel, { label: string; tone: string }> = {
  low: { label: "Low", tone: "border-success/40 bg-success/5 text-success" },
  uncertain: { label: "Uncertain", tone: "border-warning/40 bg-warning/5 text-warning" },
  elevated: { label: "Elevated", tone: "border-destructive/40 bg-destructive/5 text-destructive" },
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const r = RISK[risk];
  return <span className={cn("rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider", r.tone)}>{r.label} risk</span>;
}
