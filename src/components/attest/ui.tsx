import type { ReactNode } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
        <div className="flex h-4 w-6 items-center gap-0.5 rounded-sm border-2 border-primary-foreground px-0.5">
          <span className="h-1.5 w-1.5 rounded-[1px] bg-destructive" />
          <span className="h-0.5 flex-1 bg-primary-foreground" />
        </div>
      </div>
      <span className="text-xl font-semibold tracking-tight text-foreground">Dont Fraud AI</span>
    </div>
  );
}

export function SecureBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      Secure session
    </span>
  );
}

export function AppShell({ header, children, footer }: { header: ReactNode; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background sm:my-8 sm:min-h-[calc(100vh-4rem)] sm:rounded-3xl sm:border sm:border-border">
        <header className="flex items-center justify-between px-6 pt-6 pb-4">{header}</header>
        <main className="flex-1 px-6 pb-6">{children}</main>
        <footer className="sticky bottom-0 border-t border-border bg-background px-6 pt-4 pb-6 sm:rounded-b-3xl">{footer}</footer>
      </div>
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground", className)}>{children}</p>;
}

export function PrimaryButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="h-14 w-full rounded-2xl border-2 border-foreground bg-background text-base font-semibold text-foreground transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {children}
    </button>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-surface">
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

export function SecureNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {children}
    </p>
  );
}

export function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-3" aria-label={`Step ${step} of ${total}`}>
      <div className="flex flex-1 gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full", i < step ? "bg-primary" : "bg-border")} />
        ))}
      </div>
      <span className="font-mono text-xs text-muted-foreground">{step}/{total}</span>
    </div>
  );
}

export function OptionCard({ title, subtitle, icon, selected, onSelect }: { title: string; subtitle: string; icon: ReactNode; selected: boolean; onSelect: () => void }) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-2 border-primary bg-accent/40 p-[15px]" : "border-border hover:border-muted-foreground/40",
      )}
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", selected ? "bg-primary text-primary-foreground" : "bg-surface text-foreground")}>{icon}</span>
      <span className="flex-1">
        <span className="block text-base font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{subtitle}</span>
      </span>
      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-primary" : "border-muted-foreground/40")}>
        {selected && <span className="h-3 w-3 rounded-full bg-primary" />}
      </span>
    </button>
  );
}
