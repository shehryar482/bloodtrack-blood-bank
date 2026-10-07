import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Droplet, Stethoscope, FlaskConical, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { ROLE_LABEL, HOSPITAL, CURRENT_USER, type Role } from "@/lib/mock-data";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => seo("Choose your role", "Select a mock role to explore the BloodTrack blood bank prototype."),
  component: RoleSelect,
});

const CARDS: { role: Role; icon: typeof Droplet; desc: string }[] = [
  { role: "ward", icon: Stethoscope, desc: "Raise blood requests and track them for your ward." },
  { role: "tech", icon: FlaskConical, desc: "Process samples, crossmatch, manage stock and issue units." },
  { role: "incharge", icon: ShieldCheck, desc: "Approve emergencies, oversee stock, reports and settings." },
];

function RoleSelect() {
  const { setRole, settings, role: current, ward: currentWard } = useStore();
  const [role, setR] = useState<Role | null>(current);
  const [ward, setWard] = useState(currentWard);
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-primary-foreground"><Droplet /></span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">BloodTrack</h1>
        <p className="mt-1 text-muted-foreground">{HOSPITAL}</p>
        <p className="mt-6 text-sm text-muted-foreground">Choose a role to continue. No login required in this prototype.</p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {CARDS.map((c) => (
          <button
            key={c.role}
            onClick={() => setR(c.role)}
            className={cn("relative rounded-xl border bg-card p-5 text-left shadow-sm transition-all hover:border-foreground/30",
              role === c.role && "border-brand ring-2 ring-brand/20")}
          >
            {role === c.role && <Check className="absolute right-4 top-4 h-4 w-4 text-brand" />}
            <c.icon className="h-6 w-6 text-brand" />
            <h2 className="mt-3 font-semibold">{ROLE_LABEL[c.role]}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            <p className="mt-3 text-xs text-muted-foreground">As {CURRENT_USER[c.role]}</p>
          </button>
        ))}
      </div>
      {role === "ward" && (
        <div className="mx-auto mt-6 max-w-xs space-y-1.5">
          <label className="text-sm font-medium">Ward</label>
          <Select value={ward} onValueChange={setWard}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{settings.wards.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div className="mt-8 flex justify-center">
        <Button size="lg" variant="brand" disabled={!role} onClick={() => { if (role) { setRole(role, ward); navigate({ to: "/dashboard" }); } }}>
          Continue
        </Button>
      </div>
    </div>
  );
}
