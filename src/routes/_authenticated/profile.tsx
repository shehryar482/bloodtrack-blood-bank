import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/bt/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, PROFILE_ROLE_LABEL } from "@/lib/auth";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => seo("Your profile", "View and update your BloodTrack profile."),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (profile) setName(profile.full_name); }, [profile]);

  if (!profile) return <p className="text-sm text-muted-foreground">Loading profile...</p>;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) { setError("Name must be at least 3 characters."); return; }
    setError(""); setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", profile!.id);
    setBusy(false);
    if (error) { toast.error(`Could not save: ${error.message}`); return; }
    await refreshProfile();
    toast.success("Profile updated.");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
      <form onSubmit={save} className="mt-6 space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} /><FieldError msg={error} /></div>
        <div className="space-y-1.5"><Label>Email</Label><p className="text-sm">{profile.email}</p></div>
        <div className="space-y-1.5"><Label>Role</Label><p className="text-sm">{PROFILE_ROLE_LABEL[profile.role]}</p><p className="text-xs text-muted-foreground">Only the blood bank in-charge can change roles.</p></div>
        <Button type="submit" variant="brand" disabled={busy}>{busy ? "Saving..." : "Save changes"}</Button>
      </form>
    </div>
  );
}
