// All data is fictional. "Today" is fixed at 2 Oct 2026, 12:00 PKT.
export const NOW = new Date("2026-10-02T12:00:00+05:00").getTime();
const H = 3600_000;
const D = 24 * H;
export const iso = (t: number) => new Date(t).toISOString();

export const HOSPITAL = "Demo General Hospital, Islamabad, Pakistan";

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];
export const COMPONENTS = ["Whole Blood", "PRBC", "FFP", "Platelets", "Cryo"] as const;
export type Component = (typeof COMPONENTS)[number];

export const WARDS = [
  "Gynae & Obs",
  "Surgical Ward 2",
  "Medical ICU",
  "Emergency",
  "Thalassaemia Day Care",
  "Orthopaedics",
  "Cardiac Surgery",
  "Paediatrics",
];

export type Role = "ward" | "tech" | "incharge";
export const ROLE_LABEL: Record<Role, string> = {
  ward: "Ward Nurse / Doctor",
  tech: "Blood Bank Technologist",
  incharge: "Blood Bank In-charge",
};

export type UnitStatus = "Available" | "Reserved" | "Issued" | "Discarded";
export interface TimelineEntry { at: string; by: string; text: string }
export interface Unit {
  id: string;
  component: Component;
  group: BloodGroup;
  volume: number;
  collectedAt: string;
  expiresAt: string;
  location: string;
  status: UnitStatus;
  reservedFor?: string;
  prioritised?: boolean;
  discardReason?: string;
  timeline: TimelineEntry[];
}

const LOC: Record<Component, string> = {
  "Whole Blood": "Blood Fridge 1 - Shelf A",
  PRBC: "Blood Fridge 1 - Shelf B",
  FFP: "Plasma Freezer 1",
  Platelets: "Platelet Agitator",
  Cryo: "Plasma Freezer 1",
};
const VOL: Record<Component, number> = { "Whole Blood": 450, PRBC: 280, FFP: 220, Platelets: 60, Cryo: 20 };
const SHELF: Record<Component, number> = { "Whole Blood": 35, PRBC: 42, FFP: 365, Platelets: 5, Cryo: 365 };

// [unit suffix, component, group, expiry offset in hours from NOW, status?, reservedFor?]
type Seed = [number, Component, BloodGroup, number, UnitStatus?, string?];
const seeds: Seed[] = [
  [4471, "PRBC", "O+", 30 * 24],
  [4472, "PRBC", "O+", 12 * 24],
  [4473, "PRBC", "O+", 48],
  [4474, "PRBC", "A+", 20 * 24],
  [4475, "PRBC", "A+", 60],
  [4476, "PRBC", "B+", 25 * 24],
  [4477, "PRBC", "B+", 9 * 24, "Reserved", "REQ-2026-0146"],
  [4478, "PRBC", "B+", 33 * 24],
  [4479, "PRBC", "AB+", 18 * 24],
  [4480, "PRBC", "O-", 6 * 24],
  [4481, "PRBC", "O-", 28 * 24],
  [4482, "PRBC", "A-", 15 * 24],
  [4483, "PRBC", "B-", 22 * 24],
  [4484, "PRBC", "AB-", 40 * 24],
  [4485, "PRBC", "O+", -26],
  [4486, "PRBC", "A+", -50],
  [4487, "PRBC", "B+", 4 * 24, "Reserved", "REQ-2026-0148"],
  [4488, "PRBC", "B+", 26 * 24, "Reserved", "REQ-2026-0148"],
  [4489, "Whole Blood", "O+", 14 * 24],
  [4490, "Whole Blood", "B+", 70],
  [4491, "Whole Blood", "A+", 21 * 24],
  [4492, "FFP", "A+", 220 * 24],
  [4493, "FFP", "B+", 250 * 24],
  [4494, "FFP", "O+", 180 * 24],
  [4495, "FFP", "AB+", 300 * 24],
  [4496, "FFP", "O+", 210 * 24],
  [4497, "FFP", "AB-", 270 * 24],
  [4498, "Platelets", "O+", 10],
  [4499, "Platelets", "A+", 20],
  [4500, "Platelets", "B+", 3 * 24],
  [4501, "Platelets", "O+", -6],
  [4502, "Platelets", "AB+", 2 * 24],
  [4503, "Cryo", "A+", 200 * 24],
  [4504, "Cryo", "O+", 240 * 24],
  [4505, "Cryo", "B+", 260 * 24],
  [4506, "PRBC", "A+", 35 * 24, "Issued"],
  [4507, "PRBC", "O+", 16 * 24, "Issued"],
  [4508, "FFP", "B-", 190 * 24],
  [4509, "PRBC", "O+", 6 * 24 + 5],
  [4510, "PRBC", "A+", 5 * 24],
];

export const initialUnits: Unit[] = seeds.map(([n, component, group, expH, status = "Available", reservedFor]) => {
  const expires = NOW + expH * H;
  const collected = expires - SHELF[component] * D;
  const id = `DGH-26-${String(n).padStart(5, "0")}`;
  const timeline: TimelineEntry[] = [
    { at: iso(collected), by: "Saima Batool", text: "Collected from donor and tested" },
    { at: iso(collected + 6 * H), by: "Saima Batool", text: `Stored in ${LOC[component]}` },
  ];
  if (status === "Reserved") timeline.push({ at: iso(NOW - 5 * H), by: "Imran Khan", text: `Crossmatched compatible and reserved for ${reservedFor}` });
  if (status === "Issued") timeline.push({ at: iso(NOW - 26 * H), by: "Imran Khan", text: "Issued to ward" });
  return {
    id,
    component,
    group,
    volume: VOL[component],
    collectedAt: iso(collected),
    expiresAt: iso(expires),
    location: LOC[component],
    status,
    reservedFor,
    timeline,
  };
});

export interface Patient { name: string; relation: string; mrNo: string; age: number; gender: "Male" | "Female" | "Other" }

export type RequestStatus =
  | "Pending Approval"
  | "Approved"
  | "Approved (verbal, awaiting confirmation)"
  | "Submitted"
  | "Sample Received"
  | "Crossmatch In Progress"
  | "Ready for Issue"
  | "Issued"
  | "Cancelled"
  | "Rejected";
export type Urgency = "Routine" | "Urgent" | "Emergency";

export interface RequestItem { component: Component; units: number }
export interface Crossmatch { unitId: string; result: "Compatible" | "Incompatible"; at: string; by: string }
export interface BloodRequest {
  id: string;
  patient: Patient;
  ward: string;
  bed: string;
  indication: string;
  hb?: number;
  plt?: number;
  items: RequestItem[];
  urgency: Urgency;
  requiredBy: string;
  doctor: string;
  status: RequestStatus;
  createdAt: string;
  uncrossmatched?: boolean;
  emergencyReason?: string;
  patientGroup?: BloodGroup;
  antibodyScreen?: "Negative" | "Positive" | "Not done";
  crossmatches: Crossmatch[];
  issuedUnits: string[];
  approval?: { type: "formal" | "verbal"; by: string; at: string };
  rejectReason?: string;
  log: TimelineEntry[];
}

export const PATIENTS: Patient[] = [
  { name: "Shazia Bibi", relation: "W/o Tariq Mehmood", mrNo: "DGH-2026-018734", age: 29, gender: "Female" },
  { name: "Muhammad Aslam", relation: "S/o Ghulam Rasool", mrNo: "DGH-2026-017221", age: 58, gender: "Male" },
  { name: "Ayesha Noor", relation: "D/o Naveed Akhtar", mrNo: "DGH-2026-018990", age: 34, gender: "Female" },
  { name: "Bilal Ahmed", relation: "S/o Shahid Ahmed", mrNo: "DGH-2026-011208", age: 7, gender: "Male" },
  { name: "Unknown Male RTA", relation: "Unknown", mrNo: "DGH-2026-019102", age: 30, gender: "Male" },
  { name: "Rukhsana Parveen", relation: "W/o Javed Iqbal", mrNo: "DGH-2026-016540", age: 46, gender: "Female" },
  { name: "Zahid Hussain", relation: "S/o Manzoor Hussain", mrNo: "DGH-2026-015873", age: 63, gender: "Male" },
  { name: "Fatima Zahra", relation: "D/o Asif Raza", mrNo: "DGH-2026-018112", age: 11, gender: "Female" },
  { name: "Kamran Ali", relation: "S/o Liaquat Ali", mrNo: "DGH-2026-014409", age: 41, gender: "Male" },
  { name: "Nasreen Akhtar", relation: "W/o Abdul Ghafoor", mrNo: "DGH-2026-017765", age: 52, gender: "Female" },
  { name: "Usman Tariq", relation: "S/o Tariq Javed", mrNo: "DGH-2026-018301", age: 24, gender: "Male" },
  { name: "Sadia Rehman", relation: "W/o Faisal Rehman", mrNo: "DGH-2026-018845", age: 31, gender: "Female" },
];

const P = (i: number) => PATIENTS[i];
const log = (hAgo: number, by: string, text: string): TimelineEntry => ({ at: iso(NOW - hAgo * H), by, text });

export const initialRequests: BloodRequest[] = [
  {
    id: "REQ-2026-0152", patient: P(4), ward: "Emergency", bed: "Resus 2", indication: "Road traffic accident, haemorrhagic shock",
    hb: 5.8, items: [{ component: "PRBC", units: 2 }], urgency: "Emergency", requiredBy: iso(NOW + 0.25 * H),
    doctor: "Dr. Hina Qureshi", status: "Pending Approval", createdAt: iso(NOW - 0.3 * H), uncrossmatched: true,
    emergencyReason: "Massive bleeding, BP 70/40, no time for crossmatch", crossmatches: [], issuedUnits: [],
    log: [log(0.3, "Dr. Hina Qureshi", "Emergency uncrossmatched request submitted")],
  },
  {
    id: "REQ-2026-0151", patient: P(0), ward: "Gynae & Obs", bed: "Labour 4", indication: "Postpartum haemorrhage",
    hb: 7.1, items: [{ component: "PRBC", units: 2 }, { component: "FFP", units: 2 }], urgency: "Urgent", requiredBy: iso(NOW + 2 * H),
    doctor: "Dr. Saba Malik", status: "Sample Received", createdAt: iso(NOW - 1.5 * H), crossmatches: [], issuedUnits: [],
    log: [log(1.5, "Staff Nurse Rubina Akhtar", "Request submitted"), log(1, "Imran Khan", "Sample received")],
  },
  {
    id: "REQ-2026-0150", patient: P(3), ward: "Thalassaemia Day Care", bed: "Chair 6", indication: "Beta thalassaemia major, routine transfusion",
    hb: 6.9, items: [{ component: "PRBC", units: 1 }], urgency: "Routine", requiredBy: iso(NOW + 26 * H),
    doctor: "Dr. Amna Javed", status: "Submitted", createdAt: iso(NOW - 3 * H), crossmatches: [], issuedUnits: [],
    log: [log(3, "Staff Nurse Rubina Akhtar", "Request submitted")],
  },
  {
    id: "REQ-2026-0149", patient: P(1), ward: "Surgical Ward 2", bed: "Bed 14", indication: "Pre-op for laparotomy",
    hb: 9.2, items: [{ component: "PRBC", units: 2 }], urgency: "Routine", requiredBy: iso(NOW + 20 * H),
    doctor: "Dr. Usman Farooq", status: "Crossmatch In Progress", createdAt: iso(NOW - 6 * H), patientGroup: "A+", antibodyScreen: "Negative",
    crossmatches: [], issuedUnits: [],
    log: [log(6, "Staff Nurse Rubina Akhtar", "Request submitted"), log(5, "Saima Batool", "Sample received"), log(4, "Saima Batool", "Grouping A+, antibody screen negative")],
  },
  {
    id: "REQ-2026-0148", patient: P(2), ward: "Medical ICU", bed: "ICU 3", indication: "Upper GI bleed",
    hb: 6.4, items: [{ component: "PRBC", units: 2 }], urgency: "Urgent", requiredBy: iso(NOW + 1 * H),
    doctor: "Dr. Kashif Raza", status: "Ready for Issue", createdAt: iso(NOW - 8 * H), patientGroup: "B+", antibodyScreen: "Negative",
    crossmatches: [
      { unitId: "DGH-26-04487", result: "Compatible", at: iso(NOW - 5 * H), by: "Imran Khan" },
      { unitId: "DGH-26-04488", result: "Compatible", at: iso(NOW - 5 * H), by: "Imran Khan" },
    ],
    issuedUnits: [],
    log: [log(8, "Staff Nurse Rubina Akhtar", "Request submitted"), log(7, "Imran Khan", "Sample received"), log(5, "Imran Khan", "2 units crossmatched compatible, ready for issue")],
  },
  {
    id: "REQ-2026-0147", patient: P(5), ward: "Orthopaedics", bed: "Bed 7", indication: "Hip replacement",
    items: [{ component: "PRBC", units: 1 }], urgency: "Routine", requiredBy: iso(NOW - 20 * H),
    doctor: "Dr. Adeel Shah", status: "Issued", createdAt: iso(NOW - 30 * H), patientGroup: "A+", antibodyScreen: "Negative",
    crossmatches: [{ unitId: "DGH-26-04506", result: "Compatible", at: iso(NOW - 28 * H), by: "Saima Batool" }],
    issuedUnits: ["DGH-26-04506"],
    log: [log(30, "Staff Nurse Rubina Akhtar", "Request submitted"), log(28, "Saima Batool", "Crossmatch compatible"), log(26, "Imran Khan", "Issued DGH-26-04506 to Nurse Saba")],
  },
  {
    id: "REQ-2026-0146", patient: P(6), ward: "Cardiac Surgery", bed: "CICU 1", indication: "CABG",
    hb: 10.1, items: [{ component: "PRBC", units: 1 }, { component: "Platelets", units: 1 }], urgency: "Urgent", requiredBy: iso(NOW + 4 * H),
    doctor: "Dr. Imtiaz Bhatti", status: "Ready for Issue", createdAt: iso(NOW - 10 * H), patientGroup: "B+", antibodyScreen: "Negative",
    crossmatches: [{ unitId: "DGH-26-04477", result: "Compatible", at: iso(NOW - 5 * H), by: "Imran Khan" }], issuedUnits: [],
    log: [log(10, "Staff Nurse Rubina Akhtar", "Request submitted"), log(5, "Imran Khan", "Crossmatch compatible")],
  },
  {
    id: "REQ-2026-0145", patient: P(7), ward: "Paediatrics", bed: "Bed 22", indication: "Dengue with thrombocytopenia",
    plt: 12, items: [{ component: "Platelets", units: 2 }], urgency: "Urgent", requiredBy: iso(NOW + 3 * H),
    doctor: "Dr. Mehwish Anwar", status: "Submitted", createdAt: iso(NOW - 0.8 * H), crossmatches: [], issuedUnits: [],
    log: [log(0.8, "Staff Nurse Rubina Akhtar", "Request submitted")],
  },
  {
    id: "REQ-2026-0144", patient: P(8), ward: "Surgical Ward 2", bed: "Bed 3", indication: "Elective hernia repair",
    items: [{ component: "PRBC", units: 1 }], urgency: "Routine", requiredBy: iso(NOW - 48 * H),
    doctor: "Dr. Usman Farooq", status: "Cancelled", createdAt: iso(NOW - 72 * H), crossmatches: [], issuedUnits: [],
    log: [log(72, "Staff Nurse Rubina Akhtar", "Request submitted"), log(50, "Dr. Usman Farooq", "Cancelled: surgery postponed")],
  },
  {
    id: "REQ-2026-0143", patient: P(9), ward: "Medical ICU", bed: "ICU 6", indication: "Chronic kidney disease, anaemia",
    hb: 7.5, items: [{ component: "PRBC", units: 1 }], urgency: "Routine", requiredBy: iso(NOW - 30 * H),
    doctor: "Dr. Kashif Raza", status: "Issued", createdAt: iso(NOW - 40 * H), patientGroup: "O+", antibodyScreen: "Negative",
    crossmatches: [{ unitId: "DGH-26-04507", result: "Compatible", at: iso(NOW - 30 * H), by: "Imran Khan" }], issuedUnits: ["DGH-26-04507"],
    log: [log(40, "Staff Nurse Rubina Akhtar", "Request submitted"), log(27, "Imran Khan", "Issued DGH-26-04507")],
  },
];

export interface StaffUser { id: string; name: string; role: Role; ward?: string; active: boolean }
export const initialUsers: StaffUser[] = [
  { id: "u1", name: "Staff Nurse Rubina Akhtar", role: "ward", ward: "Gynae & Obs", active: true },
  { id: "u2", name: "Dr. Hina Qureshi (Emergency MO)", role: "ward", ward: "Emergency", active: true },
  { id: "u3", name: "Imran Khan", role: "tech", active: true },
  { id: "u4", name: "Saima Batool", role: "tech", active: true },
  { id: "u5", name: "Dr. Farah Siddiqui", role: "incharge", active: true },
];

export const CURRENT_USER: Record<Role, string> = {
  ward: "Staff Nurse Rubina Akhtar",
  tech: "Imran Khan",
  incharge: "Dr. Farah Siddiqui",
};

// Fictional historical figures for reports
export const MONTHS = ["2026-07", "2026-08", "2026-09", "2026-10"];
export const MONTH_LABEL: Record<string, string> = { "2026-07": "July 2026", "2026-08": "August 2026", "2026-09": "September 2026", "2026-10": "October 2026" };
export const EXPIRED_BY_MONTH: Record<string, Record<Component, number>> = {
  "2026-07": { "Whole Blood": 2, PRBC: 5, FFP: 1, Platelets: 9, Cryo: 0 },
  "2026-08": { "Whole Blood": 1, PRBC: 3, FFP: 0, Platelets: 7, Cryo: 1 },
  "2026-09": { "Whole Blood": 3, PRBC: 4, FFP: 2, Platelets: 11, Cryo: 0 },
  "2026-10": { "Whole Blood": 0, PRBC: 2, FFP: 0, Platelets: 1, Cryo: 0 },
};
export const CT_BY_MONTH: Record<string, Record<string, [number, number]>> = Object.fromEntries(
  MONTHS.map((m, mi) => [
    m,
    Object.fromEntries(WARDS.map((w, wi) => [w, [10 + ((wi * 7 + mi * 3) % 15), 4 + ((wi * 3 + mi) % 8)] as [number, number]])),
  ]),
);
