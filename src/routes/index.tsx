import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, FileCheck2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/bt/AuthLayout";
import { HOSPITAL } from "@/lib/mock-data";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seo("Hospital blood bank requests and stock", "BloodTrack keeps blood requests, stock and expiry alerts for your hospital blood bank in one place."),
  component: Landing,
});

const FEATURES = [
  { icon: Activity, title: "Live stock and expiry alerts", desc: "See every unit by group and component, with warnings before units expire." },
  { icon: FileCheck2, title: "Requests without paper slips", desc: "Wards raise requests online and follow them from sample to issue." },
  { icon: ShieldCheck, title: "Emergency approval trail", desc: "Every emergency approval is recorded with who approved it and when." },
];

function Landing() {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/signin">Sign In</Link></Button>
            <Button asChild variant="brand"><Link to="/signup">Get Started</Link></Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Blood requests and stock for your hospital blood bank, in one place</h1>
          <p className="mt-4 text-muted-foreground">Built for wards, technologists and blood bank in-charges.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg" variant="brand"><Link to="/signup">Get Started</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/signin">Sign In</Link></Button>
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm">
              <f.icon className="h-6 w-6 text-brand" />
              <h2 className="mt-3 font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © 2026 BloodTrack · {HOSPITAL}
      </footer>
    </div>
  );
}
