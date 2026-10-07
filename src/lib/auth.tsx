import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type ProfileRole = "ward" | "technologist" | "incharge";
export interface Profile { id: string; full_name: string; email: string; role: ProfileRole }

interface AuthCtx {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const g = globalThis as { __btAuthCtx?: React.Context<AuthCtx | null> };
const Ctx = (g.__btAuthCtx ??= createContext<AuthCtx | null>(null));

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("id, full_name, email, role").eq("id", uid).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Defer Supabase calls out of the auth callback.
        setTimeout(() => { void loadProfile(s?.user.id); router.invalidate(); }, 0);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile, router]);

  const value: AuthCtx = {
    session, profile, loading,
    refreshProfile: () => loadProfile(session?.user.id),
    signOut: async () => { await supabase.auth.signOut(); setProfile(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const a = useContext(Ctx);
  if (!a) throw new Error("AuthProvider missing");
  return a;
}

export const PROFILE_ROLE_LABEL: Record<ProfileRole, string> = {
  ward: "Ward Nurse / Doctor",
  technologist: "Blood Bank Technologist",
  incharge: "Blood Bank In-charge",
};
