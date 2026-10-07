import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, FieldError } from "@/components/bt/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/signup")({
  head: () => seo("Create your account", "Sign up for BloodTrack to manage blood requests and stock."),
  component: SignUp,
});

type Errors = Partial<Record<"name" | "email" | "password" | "confirm", string>>;

function validate(name: string, email: string, password: string, confirm: string): Errors {
  const e: Errors = {};
  if (name.trim().length < 3) e.name = "Name must be at least 3 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Enter a valid email address.";
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) e.password = "Use at least 8 characters with a letter and a number.";
  if (confirm !== password || !confirm) e.confirm = "Passwords do not match.";
  return e;
}

function SignUp() {
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(""); setInfo("");
    const errs = validate(f.name, f.email, f.password, f.confirm);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: { data: { full_name: f.name.trim() }, emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setBusy(false);
    if (error) {
      setFormError(/already registered|already exists/i.test(error.message) ? "This email is already registered." : error.message);
      return;
    }
    if (data.user && data.user.identities?.length === 0) {
      setFormError("This email is already registered.");
      return;
    }
    if (data.session) {
      toast.success("Account created. Welcome to BloodTrack!");
      navigate({ to: "/dashboard" });
    } else {
      setInfo("Account created. Check your email to confirm your address, then sign in.");
    }
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <AuthCard title="Create your account" subtitle="Get started with BloodTrack." footer={<>Already have an account? <Link to="/signin" className="font-medium text-brand hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" value={f.name} onChange={set("name")} autoComplete="name" /><FieldError msg={errors.name} /></div>
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={f.email} onChange={set("email")} autoComplete="email" /><FieldError msg={errors.email} /></div>
        <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={f.password} onChange={set("password")} autoComplete="new-password" /><FieldError msg={errors.password} /></div>
        <div className="space-y-1.5"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" type="password" value={f.confirm} onChange={set("confirm")} autoComplete="new-password" /><FieldError msg={errors.confirm} /></div>
        {formError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
        {info && <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">{info}</p>}
        <Button type="submit" variant="brand" className="w-full" disabled={busy}>{busy ? "Creating account..." : "Create account"}</Button>
      </form>
    </AuthCard>
  );
}
