import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { BloodGroup, Component } from "./constants";

export type UnitRow = Tables<"blood_units">;
export type PatientRow = Tables<"patients">;
export type WardRow = Tables<"wards">;
export type RequestItemRow = Tables<"request_items">;
export type CrossmatchRow = Tables<"crossmatch_tests">;
export type IssueRow = Tables<"issue_records">;

export type RequestListRow = Tables<"blood_requests"> & {
  patients: Pick<PatientRow, "full_name" | "mr_number" | "abo_group" | "rh_d"> | null;
  wards: Pick<WardRow, "ward_name"> | null;
  request_items: RequestItemRow[];
};
export type RequestDetail = Tables<"blood_requests"> & {
  patients: PatientRow | null;
  wards: WardRow | null;
  request_items: RequestItemRow[];
  crossmatch_tests: (CrossmatchRow & { blood_units: Pick<UnitRow, "unit_number" | "component" | "abo_group" | "rh_d" | "status"> | null })[];
  issue_records: (IssueRow & { blood_units: Pick<UnitRow, "unit_number" | "component"> | null })[];
};

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export const useUnits = () =>
  useQuery({ queryKey: ["units"], queryFn: async () => check(await supabase.from("blood_units").select("*").order("expiry_at")) });
export const usePatients = () =>
  useQuery({ queryKey: ["patients"], queryFn: async () => check(await supabase.from("patients").select("*").order("full_name")) });
export const useWards = () =>
  useQuery({ queryKey: ["wards"], queryFn: async () => check(await supabase.from("wards").select("*").order("ward_name")) });
export const useRequests = () =>
  useQuery({
    queryKey: ["requests"],
    queryFn: async () =>
      check(await supabase.from("blood_requests")
        .select("*, patients(full_name, mr_number, abo_group, rh_d), wards(ward_name), request_items(*)")
        .order("created_at", { ascending: false })) as unknown as RequestListRow[],
  });
export const useRequest = (id: string) =>
  useQuery({
    queryKey: ["requests", id],
    queryFn: async () =>
      check(await supabase.from("blood_requests")
        .select("*, patients(*), wards(*), request_items(*), crossmatch_tests(*, blood_units(unit_number, component, abo_group, rh_d, status)), issue_records(*, blood_units(unit_number, component))")
        .eq("id", id).maybeSingle()) as unknown as RequestDetail | null,
  });
export const useIssues = () =>
  useQuery({ queryKey: ["issues"], queryFn: async () => check(await supabase.from("issue_records").select("*").order("issued_at", { ascending: false })) });

/** Refetch everything after a write so every screen stays in sync. */
export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

// ---------- domain helpers ----------
export const groupOf = (abo?: string | null, rh?: string | null): BloodGroup | null =>
  abo && rh ? (`${abo}${rh === "Pos" ? "+" : "-"}` as BloodGroup) : null;
export const unitGroup = (u: Pick<UnitRow, "abo_group" | "rh_d">) => groupOf(u.abo_group, u.rh_d)!;

export const hoursLeft = (u: Pick<UnitRow, "expiry_at">) => (new Date(u.expiry_at).getTime() - Date.now()) / 3600_000;
export const isExpired = (u: Pick<UnitRow, "expiry_at">) => hoursLeft(u) <= 0;
/** Alert window: platelets 24 h; everything else 72 h. */
export const alertWindow = (u: Pick<UnitRow, "component">) => (u.component === "Platelets" ? 24 : 72);
export const inStock = (u: UnitRow) => u.status === "Available" && !isExpired(u);
export const isExpiring = (u: UnitRow) => inStock(u) && hoursLeft(u) <= alertWindow(u);

export type DisplayUnitStatus = string;
export function displayStatus(u: UnitRow): DisplayUnitStatus {
  if (u.status === "Issued" || u.status === "Discarded" || u.status === "Expired") return u.status;
  if (isExpired(u)) return "Expired";
  if (u.status === "Available" && hoursLeft(u) <= alertWindow(u)) return "Expiring";
  return u.status;
}

const RED: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-"], "O+": ["O+", "O-"], "A-": ["A-", "O-"], "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"], "B+": ["B+", "B-", "O+", "O-"], "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
};
const PLASMA: Record<string, string[]> = { O: ["O", "A", "B", "AB"], A: ["A", "AB"], B: ["B", "AB"], AB: ["AB"] };
export function compatible(patient: BloodGroup, donor: BloodGroup, c: string) {
  if (c === "PRBC" || c === "Whole Blood") return RED[patient].includes(donor);
  return PLASMA[patient.replace(/[+-]/, "")].includes(donor.replace(/[+-]/, ""));
}

const URG: Record<string, number> = { Emergency: 0, Urgent: 1, Routine: 2 };
export const sortRequests = (a: Tables<"blood_requests">, b: Tables<"blood_requests">) =>
  (URG[a.urgency] ?? 3) - (URG[b.urgency] ?? 3) || (a.required_by ?? "").localeCompare(b.required_by ?? "");

/** Next code like REQ-2026-0001, per user and year. */
export async function nextRequestCode() {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;
  const { data, error } = await supabase.from("blood_requests").select("request_code").like("request_code", `${prefix}%`);
  if (error) throw new Error(error.message);
  const max = (data ?? []).reduce((m, r) => Math.max(m, Number(r.request_code.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

// ---------- sample data ----------
const H = 3600_000;
const SHELF: Record<Component, number> = { "Whole Blood": 35, PRBC: 42, FFP: 365, Platelets: 5, Cryo: 365 };
const VOL: Record<Component, number> = { "Whole Blood": 450, PRBC: 280, FFP: 220, Platelets: 60, Cryo: 20 };
const LOC: Record<Component, string> = {
  "Whole Blood": "Blood Fridge 1 - Shelf A", PRBC: "Blood Fridge 1 - Shelf B", FFP: "Plasma Freezer 1",
  Platelets: "Platelet Agitator", Cryo: "Plasma Freezer 1",
};

/** Inserts fictional wards, patients and units for the signed-in user only. */
export async function loadSampleData() {
  const wards = [
    ["Gynae & Obs", "GYN", "2101"], ["Surgical Ward 2", "SW2", "2204"], ["Medical ICU", "MICU", "2310"],
    ["Emergency", "ER", "2001"], ["Thalassaemia Day Care", "THAL", "2412"], ["Orthopaedics", "ORTH", "2505"],
    ["Cardiac Surgery", "CS", "2608"], ["Paediatrics", "PAED", "2703"],
  ].map(([ward_name, ward_code, extension_no]) => ({ ward_name, ward_code, extension_no }));
  const patients = [
    ["DGH-2026-018734", "Shazia Bibi", "Tariq Mehmood", "Female", "1997-03-14", "B", "Pos"],
    ["DGH-2026-017221", "Muhammad Aslam", "Ghulam Rasool", "Male", "1968-07-02", "A", "Pos"],
    ["DGH-2026-018990", "Ayesha Noor", "Naveed Akhtar", "Female", "1992-11-21", "O", "Pos"],
    ["DGH-2026-011208", "Bilal Ahmed", "Shahid Ahmed", "Male", "2019-05-09", "B", "Neg"],
    ["DGH-2026-016540", "Rukhsana Parveen", "Javed Iqbal", "Female", "1980-01-30", "AB", "Pos"],
    ["DGH-2026-015873", "Zahid Hussain", "Manzoor Hussain", "Male", "1963-09-17", "O", "Neg"],
  ].map(([mr_number, full_name, father_or_husband_name, gender, date_of_birth, abo_group, rh_d]) =>
    ({ mr_number, full_name, father_or_husband_name, gender, date_of_birth, abo_group, rh_d }));
  // [component, abo, rh, hours until expiry]
  const seeds: [Component, string, string, number][] = [
    ["PRBC", "O", "Pos", 30 * 24], ["PRBC", "O", "Pos", 12 * 24], ["PRBC", "O", "Pos", 48],
    ["PRBC", "A", "Pos", 20 * 24], ["PRBC", "A", "Pos", 60], ["PRBC", "B", "Pos", 25 * 24],
    ["PRBC", "B", "Pos", 18], ["PRBC", "O", "Neg", 6 * 24], ["PRBC", "AB", "Pos", 18 * 24],
    ["PRBC", "A", "Neg", -26], ["Whole Blood", "O", "Pos", 14 * 24], ["Whole Blood", "B", "Pos", 66],
    ["FFP", "A", "Pos", 220 * 24], ["FFP", "O", "Pos", 180 * 24], ["FFP", "AB", "Pos", 300 * 24],
    ["Platelets", "O", "Pos", 10], ["Platelets", "A", "Pos", 20], ["Platelets", "B", "Pos", -6],
    ["Cryo", "O", "Pos", 240 * 24], ["PRBC", "B", "Neg", -50],
  ];
  const now = Date.now();
  const yy = String(new Date().getFullYear()).slice(2);
  const units = seeds.map(([component, abo_group, rh_d, h], i) => {
    const expiry = now + h * H;
    return {
      unit_number: `DGH-${yy}-${String(4471 + i).padStart(5, "0")}`,
      component, abo_group, rh_d, volume_ml: VOL[component],
      collection_date: new Date(expiry - SHELF[component] * 24 * H).toISOString().slice(0, 10),
      expiry_at: new Date(expiry).toISOString(),
      storage_location: LOC[component],
      status: "Available",
    };
  });
  for (const [table, rows] of [["wards", wards], ["patients", patients], ["blood_units", units]] as const) {
    const { error } = await supabase.from(table).insert(rows as never);
    if (error) throw new Error(error.message);
  }
}
