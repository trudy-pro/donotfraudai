import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, CreditCard, FileBadge, Fingerprint, ScanLine, ShieldCheck } from "lucide-react";
import { CaptureScreen } from "@/components/attest/capture";
import { AssessmentScreen } from "@/components/attest/assessment";
import { FaceScreen, NfcScreen } from "@/components/attest/verification";
import { DecisionScreen } from "@/components/attest/decision";
import { ResultScreen } from "@/components/attest/result";
import { DemoBar } from "@/components/attest/demo-bar";
import { useCase, updateCase } from "@/lib/case-store";
import { addEvidence, applyDemo, applyLink, caseLinkActive, clearCaptures, finalizeApplicant, parseCaseLink, recordCapture, selectDocument, setScreen, type ApplicantScreen, type CaseState, type DocType } from "@/lib/case";
import { AppShell, BrandLogo, BackButton, Eyebrow, OptionCard, PrimaryButton, Progress, SecureBadge, SecureNote } from "@/components/attest/ui";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => parseCaseLink(search),
  head: () => ({
    meta: [
      { title: "Dont Fraud AI — Verify your identity securely" },
      { name: "description", content: "Dont Fraud AI: evidence-based, mobile-first identity verification prototype for Swiss documents." },
      { property: "og:title", content: "Dont Fraud AI — Verify your identity securely" },
      { property: "og:description", content: "Evidence-based, mobile-first identity verification for Swiss documents." },
    ],
  }),
  component: Index,
});


const DOCUMENTS: { id: DocType; title: string; subtitle: string; icon: React.ReactNode }[] = [
  { id: "swiss-id", title: "Swiss identity card", subtitle: "Identitätskarte · Carte d'identité · Carta d'identità", icon: <CreditCard className="h-5 w-5" /> },
  { id: "residence-permit", title: "Swiss residence permit", subtitle: "Ausländerausweis · Titre de séjour · Permesso di soggiorno", icon: <FileBadge className="h-5 w-5" /> },
  { id: "passport", title: "Passport", subtitle: "Any ICAO-compliant passport with chip", icon: <BookOpen className="h-5 w-5" /> },
];

function Index() {
  const c = useCase();
  const link = useSearch({ from: "/" });
  const linkKey = `${link.demo}|${link.screen}|${link.status}|${link.requested}|${link.reason}`;
  const go = (screen: ApplicantScreen) => updateCase((s) => setScreen(s, screen));
  const { screen, assessment, decision } = c;
  const shell = (node: React.ReactNode) => <><DemoBar active="applicant" />{node}</>;

  useEffect(() => {
    if (caseLinkActive(link)) updateCase((s, n) => applyLink(s, link, n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkKey]);

  if (screen === "welcome") return shell(<Welcome onStart={() => go("document")} />);
  if (screen === "document")
    return shell(<DocumentSelect selected={c.doc} onSelect={(d) => updateCase((s, n) => selectDocument(s, d, n))} onBack={() => go("welcome")} onContinue={() => go("front")} />);
  if (screen === "front" || screen === "back") {
    const side = screen;
    return shell(
      <CaptureScreen
        key={side}
        side={side}
        step={side === "front" ? 2 : 3}
        total={5}
        existing={c.captures[side]}
        onBack={() => go(side === "front" ? "document" : "front")}
        onDone={(r) => updateCase((s, n) => setScreen(recordCapture(s, side, r, n), side === "front" ? "back" : "assessment"))}
      />,
    );
  }
  if (screen === "result") return shell(<ResultScreen />);
  if (!assessment || !decision) return shell(<Welcome onStart={() => go("document")} />);
  if (screen === "assessment")
    return shell(<AssessmentScreen key={assessment.createdAt} assessment={assessment} onBack={() => go("back")} onContinue={() => go("decision")} />);
  if (screen === "decision")
    return shell(
      <DecisionScreen
        assessment={assessment}
        decision={decision}
        demoCase={c.demoCase}
        onDemoCase={(dc) => updateCase((s, n) => applyDemo(s, dc, n))}
        onBack={() => go("assessment")}
        onContinue={() =>
          updateCase((s, n) => {
            const r = s.decision?.route;
            if (r === "recapture") return setScreen(clearCaptures(s), "front");
            if (r === "nfc" || r === "liveness") return setScreen(s, "check");
            return finalizeApplicant(s, n);
          })
        }
      />,
    );
  // screen === "check": analyst-requested check takes precedence over the adaptive route.
  const kind = c.requested ?? (decision.route === "nfc" || decision.route === "liveness" ? decision.route : null);
  const after = (s: CaseState, n: Date) =>
    s.status === "pending_review" || s.decision?.route === "complete" || s.decision?.route === "manual_review" ? finalizeApplicant(s, n) : setScreen(s, "decision");
  if (kind === "nfc") return shell(<NfcScreen onBack={() => go(c.requested ? "result" : "decision")} onResult={(nfc) => updateCase((s, n) => after(addEvidence(s, { nfc }, n), n))} />);
  if (kind === "liveness")
    return shell(<FaceScreen seed={c.captures.front?.capturedAt ?? c.caseId} onBack={() => go(c.requested ? "result" : "decision")} onResult={(face) => updateCase((s, n) => after(addEvidence(s, { face }, n), n))} />);
  return shell(<ResultScreen />);
}

function Welcome({ onStart }: { onStart: () => void }) {
  const steps = [
    { icon: <ScanLine className="h-4 w-4" />, text: "Scan your document" },
    { icon: <Fingerprint className="h-4 w-4" />, text: "Read the chip & take a selfie" },
    { icon: <ShieldCheck className="h-4 w-4" />, text: "See the evidence behind the result" },
  ];
  return (
    <AppShell
      header={<><BrandLogo /><SecureBadge /></>}
      footer={<><PrimaryButton onClick={onStart}>Start verification</PrimaryButton><SecureNote>Encrypted end-to-end. Your data is used only for this verification.</SecureNote></>}
    >
      <div className="pt-8">
        <Eyebrow>Identity verification</Eyebrow>
        <h1 className="mt-3 text-[2.5rem] font-bold leading-[1.05] tracking-tight text-foreground">Verify your identity securely</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          It takes about two minutes. We check your document, its chip and your face — and show you exactly which evidence was used.
        </p>
        <Eyebrow className="mt-10">How it works</Eyebrow>
        <ol className="mt-3 divide-y divide-border rounded-2xl border border-border">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-4 p-4">
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-primary">{s.icon}</span>
              <span className="text-[15px] font-medium text-foreground">{s.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </AppShell>
  );
}

function DocumentSelect({ selected, onSelect, onBack, onContinue }: { selected: DocType | null; onSelect: (d: DocType) => void; onBack: () => void; onContinue: () => void }) {
  return (
    <AppShell
      header={<><BackButton onClick={onBack} /><div className="ml-4 flex-1"><Progress step={1} total={5} /></div></>}
      footer={
        <>
          <PrimaryButton disabled={!selected} onClick={onContinue}>Continue</PrimaryButton>
          <SecureNote>Checks run on your device and in a secure session. Results are visible to you and the verification team only.</SecureNote>
        </>
      }
    >
      <div className="pt-4">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground">Choose your document</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">Scan both sides of your card. If it has a chip, tap it to your phone. That's it.</p>
        <Eyebrow className="mt-8">Your document</Eyebrow>
        <div role="radiogroup" aria-label="Your document" className="mt-3 space-y-3">
          {DOCUMENTS.map((d) => (
            <OptionCard key={d.id} {...d} selected={selected === d.id} onSelect={() => onSelect(d.id)} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
