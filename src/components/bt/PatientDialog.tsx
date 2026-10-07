import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./ui";
import { supabase } from "@/integrations/supabase/client";
import { useRefresh, type PatientRow } from "@/lib/db";
import { ABO, RH } from "@/lib/constants";

const blank = { mr_number: "", full_name: "", father_or_husband_name: "", gender: "", date_of_birth: "", abo_group: "", rh_d: "" };
type F = typeof blank;

/** Add (patient = null) or edit a patient. Calls onSaved with the saved row. */
export function PatientDialog({ open, patient, initialMr, onClose, onSaved }: {
  open: boolean; patient: PatientRow | null; initialMr?: string; onClose: () => void; onSaved?: (p: PatientRow) => void;
}) {
  const refresh = useRefresh();
  const [f, setF] = useState<F>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setF(patient ? {
      mr_number: patient.mr_number, full_name: patient.full_name, father_or_husband_name: patient.father_or_husband_name ?? "",
      gender: patient.gender ?? "", date_of_birth: patient.date_of_birth ?? "", abo_group: patient.abo_group ?? "", rh_d: patient.rh_d ?? "",
    } : { ...blank, mr_number: initialMr ?? "" });
  }, [open, patient, initialMr]);

  const set = (k: keyof F) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  const save = async () => {
    const e: Record<string, string> = {};
    if (f.mr_number.trim().length < 3) e.mr_number = "Enter MR number";
    if (f.full_name.trim().length < 2) e.full_name = "Enter patient name";
    if (f.date_of_birth && new Date(f.date_of_birth) > new Date()) e.date_of_birth = "Cannot be in the future";
    if (!!f.abo_group !== !!f.rh_d) e.rh_d = "Select both ABO and Rh, or neither";
    setErrors(e);
    if (Object.keys(e).length) return;
    const row = {
      mr_number: f.mr_number.trim(), full_name: f.full_name.trim(),
      father_or_husband_name: f.father_or_husband_name.trim() || null, gender: f.gender || null,
      date_of_birth: f.date_of_birth || null, abo_group: f.abo_group || null, rh_d: f.rh_d || null,
    };
    setSaving(true);
    const res = patient
      ? await supabase.from("patients").update(row).eq("id", patient.id).select().single()
      : await supabase.from("patients").insert(row).select().single();
    setSaving(false);
    if (res.error) { toast.error(res.error.code === "23505" ? "A patient with this MR number already exists" : res.error.message); return; }
    toast.success(patient ? "Patient updated" : "Patient added");
    refresh();
    onSaved?.(res.data);
    onClose();
  };

  const sel = (k: "gender" | "abo_group" | "rh_d", opts: readonly string[]) => (
    <Select value={f[k]} onValueChange={set(k)}>
      <SelectTrigger aria-invalid={!!errors[k]}><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{patient ? "Edit patient" : "Add patient"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Patient name" error={errors.full_name}><Input value={f.full_name} onChange={(e) => set("full_name")(e.target.value)} maxLength={80} /></Field>
          <Field label="MR no." error={errors.mr_number}><Input value={f.mr_number} onChange={(e) => set("mr_number")(e.target.value)} maxLength={30} placeholder="DGH-2026-000000" /></Field>
          <Field label="Father / husband name" full><Input value={f.father_or_husband_name} onChange={(e) => set("father_or_husband_name")(e.target.value)} maxLength={80} /></Field>
          <Field label="Gender">{sel("gender", ["Male", "Female", "Other"])}</Field>
          <Field label="Date of birth" error={errors.date_of_birth}><Input type="date" value={f.date_of_birth} onChange={(e) => set("date_of_birth")(e.target.value)} /></Field>
          <Field label="ABO group">{sel("abo_group", ABO)}</Field>
          <Field label="Rh D" error={errors.rh_d}>{sel("rh_d", RH)}</Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save patient"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
