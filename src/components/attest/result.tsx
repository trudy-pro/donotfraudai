import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { applicantOutcome, CHECK_LABEL, setScreen, clearCaptures } from "@/lib/case";
import { resetCase, updateCase, useCase } from "@/lib/case-store";
import { AppShell, BrandLogo, Eyebrow, PrimaryButton, SecondaryButton, SecureNote } from "./ui";

export function ResultScreen() {
  const c = useCase();
  const outcome = applicantOutcome(c);
  const restart = () => resetCase();

  const footer = (primary: React.ReactNode, secondary?: React.ReactNode) => (
    <>
      <div className="space-y-3">{primary}{secondary}</div>
      <SecureNote>Synthetic demo. No identity data was processed.</SecureNote>
    </>
  );

  if (outcome === "complete")
    return (
      <AppShell header={<BrandLogo />} footer={footer(<PrimaryButton onClick={restart}>Start a new verification</PrimaryButton>, <Link to="/analyst" className="block"><SecondaryButton>View case as analyst</SecondaryButton></Link>)}>
        <Hero icon={<CheckCircle2 className="h-14 w-14 text-success" />} title="Verification complete" body="Thanks — your identity was confirmed from the evidence you provided." />
        <Steps items={["Your verification is finished", "You can now continue to your account", "You'll receive a confirmation for your records"]} />
      </AppShell>
    );

  if (outcome === "unable") {
    const req = c.requested;
    const provide = () =>
      updateCase((s) => (req === "recapture" ? setScreen(clearCaptures(s), "front") : setScreen(s, "check")));
    return (
      <AppShell
        header={<BrandLogo />}
        footer={req ? footer(<PrimaryButton onClick={provide}>Provide {CHECK_LABEL[req].toLowerCase()}</PrimaryButton>, <SecondaryButton onClick={restart}>Start over</SecondaryButton>) : footer(<PrimaryButton onClick={restart}>Start over</PrimaryButton>)}
      >
        <Hero
          icon={<RotateCcw className="h-14 w-14 text-warning" />}
          title="Unable to complete yet"
          body={req ? `We need one more piece of evidence to finish: ${CHECK_LABEL[req].toLowerCase()}. It only takes a minute.` : "We couldn't complete your verification with the evidence provided. You can start over with a different document."}
        />
        <Steps items={req ? ["Follow the guided step", "We reassess your evidence automatically", "A specialist completes the review"] : ["Choose a valid identity document", "Capture it in even light", "Complete any additional checks"]} />
      </AppShell>
    );
  }

  return (
    <AppShell header={<BrandLogo />} footer={footer(<PrimaryButton onClick={() => updateCase((s) => ({ ...s }))}>Check status</PrimaryButton>, <SecondaryButton onClick={restart}>Back to start</SecondaryButton>)}>
      <Hero icon={<Clock className="h-14 w-14 text-primary" />} title="Additional review needed" body="A specialist will look at your submission. This is a routine step — you don't need to do anything right now." />
      <Steps items={["A specialist reviews your evidence", "If anything else is needed, we'll ask you here", "We'll let you know the outcome"]} />
      <p className="mt-4 text-center text-xs text-muted-foreground" aria-live="polite">Current status: {c.status === "in_review" ? "being reviewed" : "waiting for a specialist"}</p>
    </AppShell>
  );
}

function Hero({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center pt-12 text-center" role="status">
      {icon}
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <>
      <Eyebrow className="mt-10">Next steps</Eyebrow>
      <ol className="mt-3 divide-y divide-border rounded-2xl border border-border">
        {items.map((t, i) => (
          <li key={t} className="flex items-center gap-3 p-4"><span className="font-mono text-xs text-muted-foreground">0{i + 1}</span><span className="text-[15px] text-foreground">{t}</span></li>
        ))}
      </ol>
    </>
  );
}
