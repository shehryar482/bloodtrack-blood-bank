import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/bt/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/signin")({
  head: () => seo("Sign in", "Sign in to BloodTrack to manage blood requests and stock."),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setError(/email not confirmed/i.test(error.message) ? "Please confirm your email address first." : "Incorrect email or password");
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthCard title="Sign in" subtitle="Welcome back to BloodTrack." footer={<>New here? <Link to="/signup" className="font-medium text-brand hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
        {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="brand" className="w-full" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</Button>
      </form>
    </AuthCard>
  );
}
