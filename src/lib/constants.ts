export const HOSPITAL = "Demo General Hospital, Islamabad, Pakistan";

export const ABO = ["A", "B", "AB", "O"] as const;
export const RH = ["Pos", "Neg"] as const;
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];
export const COMPONENTS = ["Whole Blood", "PRBC", "FFP", "Platelets", "Cryo"] as const;
export type Component = (typeof COMPONENTS)[number];
export const UNIT_STATUSES = ["Available", "Reserved", "Issued", "Expired", "Discarded"] as const;
export const URGENCIES = ["Routine", "Urgent", "Emergency"] as const;
export type Urgency = (typeof URGENCIES)[number];
export const REQUEST_STATUSES = [
  "Pending Approval", "Approved", "Submitted", "Sample Received", "Crossmatch In Progress",
  "Ready for Issue", "Issued", "Cancelled", "Rejected",
] as const;
export const CLOSED_STATUSES = ["Issued", "Cancelled", "Rejected"];

/** Low-stock threshold per group/component tile on the dashboard. */
export const MIN_STOCK = 2;

export type Role = "ward" | "tech" | "incharge";
export const ROLE_LABEL: Record<Role, string> = {
  ward: "Ward Nurse / Doctor",
  tech: "Blood Bank Technologist",
  incharge: "Blood Bank In-charge",
};
