import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Droplet } from "lucide-react";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-primary-foreground"><Droplet className="h-4 w-4" /></span>
      <span className="font-semibold">BloodTrack</span>
    </Link>
  );
}

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col items-center justify-center px-4 py-12">
      <Logo />
      <div className="mt-6 w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{footer}</p>
    </div>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}
