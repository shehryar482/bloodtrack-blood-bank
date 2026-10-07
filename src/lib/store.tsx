import type React from "react";
import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "./auth";
import { ROLE_LABEL, type Role } from "./constants";

interface Store {
  role: Role | null;
  user: string;
  /** Name and role, used to record who approved or received something. */
  actor: string;
}

// Kept on globalThis so a hot reload of this file reuses the same context.
const g = globalThis as { __btStoreCtx?: React.Context<Store | null> };
const Ctx = (g.__btStoreCtx ??= createContext<Store | null>(null));

const PROFILE_TO_ROLE: Record<string, Role> = { ward: "ward", technologist: "tech", incharge: "incharge" };

/** Identity only; all operational data comes from the database via src/lib/db.ts. */
export function StoreProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const role: Role | null = profile ? PROFILE_TO_ROLE[profile.role] ?? null : null;
  const name = profile?.full_name ?? "";
  const value: Store = { role, user: name, actor: role ? `${name} (${ROLE_LABEL[role]})` : "" };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider missing");
  return s;
}
