import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const fmt = (s: string) => format(new Date(s), "dd MMM yyyy, HH:mm");
export const fmtDate = (s: string) => format(new Date(s), "dd MMM yyyy")
/** "expires in X h" / "expired". */
export const expiresIn = (h: number) => (h <= 0 ? "expired" : `expires in ${Math.max(1, Math.round(h))} h`);;

const TONE = {
  success: "bg-success-soft text-success border-success/20",
  info: "bg-info-soft text-info border-info/20",
  issued: "bg-issued-soft text-issued border-issued/20",
  warning: "bg-warning-soft text-warning border-warning/30",
  orange: "bg-orange-soft text-orange border-orange/25",
  neutral: "bg-neutral-soft text-neutral border-neutral/20",
  brand: "bg-brand text-primary-foreground border-brand",
} as const;
export type Tone = keyof typeof TONE;

const AUTO: Record<string, Tone> = {
  Available: "success", Reserved: "info", Issued: "issued", Expiring: "warning", Expired: "neutral", Discarded: "neutral",
  Emergency: "brand", Urgent: "orange", Routine: "neutral",
  "Pending Approval": "orange", "Approved (verbal, awaiting confirmation)": "orange", Approved: "success",
  Submitted: "neutral", "Sample Received": "info", "Crossmatch In Progress": "info", "Ready for Issue": "success",
  Cancelled: "neutral", Rejected: "neutral", Active: "success", Inactive: "neutral",
  Compatible: "success", Incompatible: "brand", Prioritised: "warning",
};

export function StatusBadge({ label, tone, className }: { label: string; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", TONE[tone ?? AUTO[label] ?? "neutral"], className)}>
      {label}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon, tone, to }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; tone?: "warning" | "brand"; to?: string }) {
  const body = (
    <div className={cn("h-full rounded-xl border bg-card p-4 shadow-sm transition-colors",
      tone === "warning" && "border-warning/40 bg-warning-soft",
      tone === "brand" && "border-brand/30 bg-brand-soft",
      to && "hover:border-foreground/20")}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>{icon}
      </div>
      <div className={cn("mt-2 text-3xl font-semibold", tone === "brand" && "text-brand")}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground" />
      <h3 className="mt-3 font-medium">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, description, backTo = "/dashboard", backLabel = "Back to dashboard" }: { title: string; description?: string; backTo?: string; backLabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border bg-card px-6 py-14 text-center">
      <AlertTriangle className="h-10 w-10 text-brand" />
      <h3 className="mt-3 text-lg font-medium">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      <Button asChild variant="outline" className="mt-5"><Link to={backTo}>{backLabel}</Link></Button>
    </div>
  );
}

export function Field({ label, error, children, full }: { label: string; error?: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={cn("space-y-1.5", full && "sm:col-span-2")}>
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-brand">{error}</p>}
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

export function Timeline({ items }: { items: { at: string; by: string; text: string }[] }) {
  return (
    <ol className="space-y-4 border-l pl-4">
      {[...items].reverse().map((t, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
          <p className="text-sm">{t.text}</p>
          <p className="text-xs text-muted-foreground">{fmt(t.at)} · {t.by}</p>
        </li>
      ))}
    </ol>
  );
}
