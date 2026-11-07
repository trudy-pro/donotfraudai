import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Ban, CheckCheck, FileSearch, History, Inbox, ScanFace, Nfc, Camera, IdCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { effectiveSignals, type EvidenceSignal } from "@/lib/assessment";
import { analystAct, applyDemo, applyLink, approvalCheck, caseLinkActive, CHECK_LABEL, DOC_LABEL, parseCaseLink, REJECT_REASONS, type AnalystAction, type CheckKind } from "@/lib/case";
import { updateCase, useCase, getCase } from "@/lib/case-store";
import { DemoBar } from "@/components/attest/demo-bar";
import { DemoCaseSelector } from "@/components/attest/decision";
import { RiskBadge, SignalBadge, SIGNAL_STATE, StatusBadge } from "@/components/attest/status";

export const Route = createFileRoute("/analyst")({
  validateSearch: (search: Record<string, unknown>) => parseCaseLink(search),
  head: () => ({
    meta: [
      { title: "Analyst case detail — Dont Fraud AI" },
      { name: "description", content: "Demo analyst view: verification evidence, assessment and review actions for a synthetic case." },
      { property: "og:title", content: "Analyst case detail — Dont Fraud AI" },
      { property: "og:description", content: "Demo analyst view with evidence, assessment and review actions." },
    ],
  }),
  component: Analyst,
});

const ROUTE_LABEL = { complete: "Complete — no extra checks", recapture: "Request document rescan", nfc: "Request NFC chip read", liveness: "Request liveness selfie", manual_review: "Manual review" } as const;

const GROUPS: { id: string; label: string; icon: typeof IdCard; pick: (s: EvidenceSignal) => boolean; empty: string }[] = [
  { id: "document", label: "Document", icon: IdCard, pick: (s) => s.category === "document" || s.category === "physical", empty: "No document evidence captured." },
  { id: "biometric", label: "Biometric", icon: ScanFace, pick: (s) => s.category === "face", empty: "Not requested by the adaptive policy for this case." },
  { id: "nfc", label: "NFC", icon: Nfc, pick: (s) => s.category === "chip", empty: "Not requested by the adaptive policy for this case." },
  { id: "device", label: "Device / Capture", icon: Camera, pick: (s) => s.category === "quality" || s.category === "screen", empty: "No capture evidence recorded." },
];

function Card({ title, icon: Icon, children, aside }: { title: string; icon?: typeof IdCard; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-5 py-3">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <div className="ml-auto">{aside}</div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SignalItem({ s, superseded }: { s: EvidenceSignal; superseded: boolean }) {
  return (
    <li className={cn("flex gap-3 py-3", superseded && "opacity-60")}>
      <span className={cn("w-1 shrink-0 rounded-full", SIGNAL_STATE[s.state].bar)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm font-semibold text-foreground">{s.label}</p>
          {s.category !== "chip" && s.category !== "face" && <span className="font-mono text-[11px] uppercase text-muted-foreground">{s.side}</span>}
          {superseded && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">superseded by follow-up check</span>}
          <span className="ml-auto"><SignalBadge state={s.state} /></span>
        </div>
        <p className="mt-1 text-sm text-foreground">{s.explanation}</p>
        {s.detail && <p className="mt-0.5 text-xs text-muted-foreground">Observation: {s.detail}</p>}
        {s.measure !== undefined && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Simulated quality measure</span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-border"><div className={cn("h-full", SIGNAL_STATE[s.state].bar)} style={{ width: `${s.measure}%` }} /></div>
            <span className="font-mono text-[11px] text-muted-foreground">{s.measure}/100</span>
          </div>
        )}
        <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">Source: {s.provenance}</p>
      </div>
    </li>
  );
}

function Analyst() {
  const c = useCase();
  const link = useSearch({ from: "/analyst" });
  const linkKey = `${link.demo}|${link.screen}|${link.status}|${link.requested}|${link.reason}`;
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<CheckKind>("nfc");
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (caseLinkActive(link)) updateCase((s, n) => applyLink(s, link, n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkKey]);

  const act = (a: AnalystAction) => {
    const res = analystAct(getCase(), a, new Date());
    setError(res.error ?? null);
    if (!res.error) {
      updateCase(() => res.state);
      setRejecting(false);
      setNote("");
    }
  };

  if (!c.assessment || !c.decision) {
    return (
      <>
        <DemoBar active="analyst" />
        <main className="mx-auto max-w-xl px-6 py-24 text-center">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">No case to review yet</h1>
          <p className="mt-2 text-muted-foreground">Complete the applicant flow, or load a synthetic demo scenario.</p>
          <div className="mx-auto mt-6 max-w-md text-left"><DemoCaseSelector value={null} onChange={(dc) => updateCase((s, n) => applyDemo(s, dc, n))} /></div>
          <Link to="/" className="mt-6 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">Go to applicant flow</Link>
        </main>
      </>
    );
  }

  const a = c.assessment;
  const d = c.decision;
  const eff = new Set(effectiveSignals(a.signals).map((s) => s.id));
  const contributing = a.signals.filter((s) => eff.has(s.id) && (s.state === "failed" || s.state === "warning"));
  const missingRules = d.rules.filter((r) => r.mandatory && r.state === "missing");
  const unclear = a.signals.filter((s) => eff.has(s.id) && (s.state === "inconclusive" || s.state === "not_performed"));
  const approval = approvalCheck(c);
  const closed = c.status === "approved" || c.status === "rejected";

  return (
    <>
      <DemoBar active="analyst" />
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{c.caseId} · {c.doc ? DOC_LABEL[c.doc] : "—"}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Case evidence</h1>
          </div>
          <div className="ml-auto w-full max-w-xl"><DemoCaseSelector value={c.demoCase} onChange={(dc) => { setError(null); updateCase((s, n) => applyDemo(s, dc, n)); }} /></div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-6">
            {GROUPS.map((g) => {
              const items = a.signals.filter(g.pick);
              return (
                <Card key={g.id} title={g.label} icon={g.icon} aside={<span className="text-xs text-muted-foreground">{items.length} signal{items.length === 1 ? "" : "s"}</span>}>
                  {items.length ? (
                    <ul className="-my-3 divide-y divide-border">{items.map((s) => <SignalItem key={s.id} s={s} superseded={!eff.has(s.id)} />)}</ul>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">{g.empty}</p>
                      <SignalBadge state="not_performed" />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-16 lg:self-start">
            <Card title="Assessment" icon={FileSearch} aside={<StatusBadge status={c.status} />}>
              <RiskBadge risk={a.risk} />
              <h3 className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Contributing evidence</h3>
              {contributing.length ? (
                <ul className="mt-2 space-y-1.5 text-sm">{contributing.map((s) => <li key={s.id} className="flex justify-between gap-2"><span className="text-foreground">{s.label}{s.category === "chip" || s.category === "face" ? "" : ` (${s.side})`}</span><SignalBadge state={s.state} /></li>)}</ul>
              ) : <p className="mt-2 text-sm text-muted-foreground">No warnings or failures in the current evidence.</p>}
              <h3 className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Missing or unclear evidence</h3>
              {missingRules.length || unclear.length ? (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {missingRules.map((r) => <li key={r.id} className="flex justify-between gap-2"><span className="text-foreground">{r.label}</span><span className="text-xs font-semibold text-warning">Missing</span></li>)}
                  {unclear.map((s) => <li key={s.id} className="flex justify-between gap-2"><span className="text-foreground">{s.label}</span><SignalBadge state={s.state} /></li>)}
                </ul>
              ) : <p className="mt-2 text-sm text-muted-foreground">None.</p>}
              <h3 className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Recommended next action</h3>
              <p className="mt-2 text-sm font-semibold text-foreground">{ROUTE_LABEL[d.route]}</p>
              <p className="mt-1 text-xs text-muted-foreground">{d.trace.at(-1)}</p>
              <h3 className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Policy requirements</h3>
              <ul className="mt-2 space-y-1 text-xs">
                {d.rules.map((r) => <li key={r.id} className="flex justify-between gap-2"><span className="text-foreground">{r.label}{r.mandatory ? "" : " (optional)"}</span><span className={r.state === "met" ? "font-semibold text-success" : r.state === "missing" ? "font-semibold text-warning" : "font-semibold text-destructive"}>{r.state}</span></li>)}
              </ul>
            </Card>

            <Card title="Actions">
              {error && <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
              {closed ? (
                <p className="text-sm text-muted-foreground">This case is closed ({c.status}). Load a scenario or start a new verification to continue.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <select aria-label="Evidence to request" value={kind} onChange={(e) => setKind(e.target.value as CheckKind)} className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground">
                      {(Object.keys(CHECK_LABEL) as CheckKind[]).map((k) => <option key={k} value={k}>{CHECK_LABEL[k]}</option>)}
                    </select>
                    <button onClick={() => act({ type: "request", kind })} className="h-10 rounded-xl border border-foreground px-3 text-sm font-semibold text-foreground hover:bg-surface">Request additional evidence</button>
                  </div>
                  <button onClick={() => act({ type: "review" })} disabled={c.status === "in_review"} className="h-10 w-full rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-surface disabled:text-muted-foreground">
                    {c.status === "in_review" ? "Manual review in progress" : "Start manual review"}
                  </button>
                  <div>
                    <button onClick={() => act({ type: "approve" })} disabled={!approval.ok} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground">
                      <CheckCheck className="h-4 w-4" />Approve
                    </button>
                    <p className="mt-1.5 text-xs text-muted-foreground">{approval.reason}</p>
                  </div>
                  {rejecting ? (
                    <div className="space-y-2 rounded-xl border border-destructive/30 p-3">
                      <select aria-label="Rejection reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                        <option value="">Select a reason…</option>
                        {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <textarea aria-label="Rejection note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Document the evidence behind this decision" className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground" />
                      <div className="flex gap-2">
                        <button onClick={() => { setRejecting(false); setError(null); }} className="h-10 flex-1 rounded-lg border border-border text-sm font-semibold text-foreground">Cancel</button>
                        <button onClick={() => act({ type: "reject", reason, note })} className="h-10 flex-1 rounded-lg bg-destructive text-sm font-semibold text-destructive-foreground">Confirm rejection</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setRejecting(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 text-sm font-semibold text-destructive hover:bg-destructive/5">
                      <Ban className="h-4 w-4" />Reject…
                    </button>
                  )}
                </div>
              )}
            </Card>

            <Card title="Audit history" icon={History} aside={<span className="text-[10px] text-muted-foreground">mock</span>}>
              <ol className="max-h-80 space-y-3 overflow-auto">
                {[...c.audit].reverse().map((e, i) => (
                  <li key={i} className="text-xs">
                    <div className="flex justify-between gap-2"><span className="font-semibold text-foreground">{e.action}</span><span className="font-mono text-muted-foreground">{e.at.slice(11, 19)}</span></div>
                    <p className="text-muted-foreground"><span className="uppercase">{e.actor}</span>{e.detail ? ` · ${e.detail}` : ""}</p>
                  </li>
                ))}
              </ol>
            </Card>
          </aside>
        </div>
      </main>
    </>
  );
}
