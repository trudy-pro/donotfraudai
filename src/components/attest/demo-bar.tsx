import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useCase } from "@/lib/case-store";
import { StatusBadge } from "./status";

export function DemoBar({ active }: { active: "applicant" | "analyst" }) {
  const c = useCase();
  const tab = (on: boolean) => cn("rounded-full px-3 py-1 text-xs font-semibold transition", on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground");
  return (
    <nav aria-label="Demo views" className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">Demo</span>
        <div className="flex rounded-full border border-border bg-background p-0.5">
          <Link to="/" className={tab(active === "applicant")}>Applicant</Link>
          <Link to="/analyst" className={tab(active === "analyst")}>Analyst</Link>
        </div>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{c.caseId}</span>
        <StatusBadge status={c.status} />
      </div>
    </nav>
  );
}
