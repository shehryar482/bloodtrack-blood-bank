import type React from "react";
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  initialRequests, initialUnits, initialUsers, NOW, WARDS, COMPONENTS, CURRENT_USER, ROLE_LABEL,
  type BloodRequest, type Unit, type Role, type StaffUser, type Component, type BloodGroup,
} from "./mock-data";

export interface Settings {
  minStock: Record<Component, number>;
  redCellWindowH: number;
  plateletWindowH: number;
  wards: string[];
}

interface Store {
  role: Role | null;
  ward: string;
  user: string;
  /** Name and role, used for activity log entries. */
  actor: string;
  setRole: (r: Role, ward?: string) => void;
  units: Unit[];
  requests: BloodRequest[];
  users: StaffUser[];
  settings: Settings;
  updateUnit: (id: string, fn: (u: Unit) => Unit) => void;
  updateRequest: (id: string, fn: (r: BloodRequest) => BloodRequest) => void;
  addRequest: (r: BloodRequest) => void;
  nextRequestId: () => string;
  setUsers: (u: StaffUser[]) => void;
  setSettings: (s: Settings) => void;
}

// Kept on globalThis so a hot reload of this file reuses the same context.
const g = globalThis as { __btStoreCtx?: React.Context<Store | null> };
const Ctx = (g.__btStoreCtx ??= createContext<Store | null>(null));

const PROFILE_TO_ROLE: Record<string, Role> = { ward: "ward", technologist: "tech", incharge: "incharge" };

export function StoreProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  // Role comes from the signed-in user's profile, not a mock switcher.
  const role: Role | null = profile ? PROFILE_TO_ROLE[profile.role] ?? null : null;
  const name = profile?.full_name ?? "";
  const [ward, setWard] = useState(WARDS[0]);
  const [units, setUnits] = useState(initialUnits);
  const [requests, setRequests] = useState(initialRequests);
  const [users, setUsers] = useState(initialUsers);
  const [settings, setSettings] = useState<Settings>({
    minStock: Object.fromEntries(COMPONENTS.map((c) => [c, 2])) as Record<Component, number>,
    redCellWindowH: 72,
    plateletWindowH: 24,
    wards: WARDS,
  });

  const value: Store = {
    role, ward,
    user: name,
    actor: role ? `${name} (${ROLE_LABEL[role]})` : "",
    setRole: (_r, w) => { if (w) setWard(w); },
    units, requests, users, settings,
    updateUnit: (id, fn) => setUnits((us) => us.map((u) => (u.id === id ? fn(u) : u))),
    updateRequest: (id, fn) => setRequests((rs) => rs.map((r) => (r.id === id ? fn(r) : r))),
    addRequest: (r) => setRequests((rs) => [r, ...rs]),
    nextRequestId: () => {
      const max = Math.max(...requests.map((r) => Number(r.id.split("-")[2])));
      return `REQ-2026-${String(max + 1).padStart(4, "0")}`;
    },
    setUsers, setSettings,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider missing");
  return s;
}

export const nowIso = () => new Date(NOW).toISOString();
export const hoursLeft = (u: Unit) => (new Date(u.expiresAt).getTime() - NOW) / 3600_000;
export const isExpired = (u: Unit) => hoursLeft(u) <= 0;

export type DisplayUnitStatus = Unit["status"] | "Expired" | "Expiring";
export function displayStatus(u: Unit, s?: Settings): DisplayUnitStatus {
  if (u.status === "Issued" || u.status === "Discarded") return u.status;
  if (isExpired(u)) return "Expired";
  if (u.status === "Available" && hoursLeft(u) <= alertWindow(u, s)) return "Expiring";
  return u.status;
}
/** Alert window: platelets 24h; red cells, whole blood, FFP and Cryo 72h (configurable). */
export const alertWindow = (u: Unit, s?: Settings) => u.component === "Platelets" ? (s?.plateletWindowH ?? 24) : (s?.redCellWindowH ?? 72);
export const isExpiring = (u: Unit, s?: Settings) => inStock(u) && hoursLeft(u) <= alertWindow(u, s);

/** In stock = usable for issue (Available, not expired). */
export const inStock = (u: Unit) => u.status === "Available" && !isExpired(u);

const RED: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-"], "O+": ["O+", "O-"], "A-": ["A-", "O-"], "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"], "B+": ["B+", "B-", "O+", "O-"], "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
};
const PLASMA: Record<string, string[]> = { O: ["O", "A", "B", "AB"], A: ["A", "AB"], B: ["B", "AB"], AB: ["AB"] };
export function compatible(patient: BloodGroup, donor: BloodGroup, c: Component) {
  if (c === "PRBC" || c === "Whole Blood") return RED[patient].includes(donor);
  return PLASMA[patient.replace(/[+-]/, "")].includes(donor.replace(/[+-]/, ""));
}

export const ACTIVE_STATUSES = ["Pending Approval", "Approved (verbal, awaiting confirmation)", "Submitted", "Sample Received", "Crossmatch In Progress"];
export const isReady = (r: BloodRequest) =>
  r.status === "Ready for Issue" || (r.uncrossmatched && (r.status === "Approved" || r.status === "Approved (verbal, awaiting confirmation)"));

const URG = { Emergency: 0, Urgent: 1, Routine: 2 };
export const sortRequests = (a: BloodRequest, b: BloodRequest) =>
  URG[a.urgency] - URG[b.urgency] || a.requiredBy.localeCompare(b.requiredBy);
