import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, FormSection, Field } from "@/components/bt/ui";
import { PatientDialog } from "@/components/bt/PatientDialog";
import { usePatients, useWards, useRefresh, groupOf, nextRequestCode, type PatientRow } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { COMPONENTS, URGENCIES, type Component, type Urgency } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/requests/new")({
  head: () => seo("New blood request", "Raise a new blood component request for a patient."),
  component: NewRequest,
});

function NewRequest() {
  const navigate = useNavigate();
  const refresh = useRefresh();
  const { data: patients = [] } = usePatients();
  const { data: wards = [] } = useWards();
  const [mrQuery, setMrQuery] = useState("");
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [addPatient, setAddPatient] = useState(false);
  const [wardId, setWardId] = useState("");
  const [bed, setBed] = useState("");
  const [doctor, setDoctor] = useState("");
  const [indication, setIndication] = useState("");
  const [requiredBy, setRequiredBy] = useState(() => format(Date.now() + 4 * 3600_000, "yyyy-MM-dd'T'HH:mm"));
  const [urgency, setUrgency] = useState<Urgency>("Routine");
  const [uncross, setUncross] = useState(false);
  const [items, setItems] = useState<{ component: Component; qty: number }[]>([{ component: "PRBC", qty: 1 }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const matches = useMemo(() => {
    const s = mrQuery.trim().toLowerCase();
    if (!s) return [];
    return patients.filter((p) => p.mr_number.toLowerCase().includes(s) || p.full_name.toLowerCase().includes(s)).slice(0, 6);
  }, [patients, mrQuery]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!patient) e.patient = "Pick or add a patient";
    if (!wardId) e.ward = "Select a ward";
    if (doctor.trim().length < 3) e.doctor = "Enter doctor name";
    if (indication.trim().length < 3) e.indication = "Enter indication";
    if (items.length === 0) e.items = "Add at least one component";
    else if (items.some((i) => !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 10)) e.items = "Quantity must be 1–10";
    else if (new Set(items.map((i) => i.component)).size !== items.length) e.items = "Each component only once";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate() || !patient) return;
    setSaving(true);
    try {
      const isUncross = urgency === "Emergency" && uncross;
      let code = await nextRequestCode();
      let res = await insertRequest(code);
      if (res.error?.code === "23505") { code = await nextRequestCode(); res = await insertRequest(code); }
      if (res.error) throw new Error(res.error.message);
      const reqId = res.data.id;
      const { error } = await supabase.from("request_items").insert(items.map((i) => ({ request_id: reqId, component: i.component, quantity_requested: i.qty })));
      if (error) { await supabase.from("blood_requests").delete().eq("id", reqId); throw new Error(error.message); }
      await refresh();
      toast.success(`Request ${code} saved`, { description: isUncross ? "Awaiting In-charge approval" : undefined });
      navigate({ to: "/requests/$requestId", params: { requestId: reqId } });
    } catch (e) {
      toast.error("Could not save request", { description: (e as Error).message });
    } finally { setSaving(false); }

    function insertRequest(request_code: string) {
      const isUncross = urgency === "Emergency" && uncross;
      return supabase.from("blood_requests").insert({
        request_code, patient_id: patient!.id, ward_id: wardId, requesting_doctor: doctor.trim(),
        bed_no: bed.trim() || null, indication: indication.trim(), urgency, is_uncrossmatched: isUncross,
        required_by: requiredBy ? new Date(requiredBy).toISOString() : null,
        status: isUncross ? "Pending Approval" : "Submitted",
      }).select("id").single();
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New blood request" />
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="font-semibold">Patient</h2>
          {patient ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-secondary/40 p-3">
              <div>
                <div className="font-medium">{patient.full_name} <span className="text-muted-foreground">· {patient.mr_number}</span></div>
                <div className="text-xs text-muted-foreground">
                  {[patient.father_or_husband_name, patient.gender, groupOf(patient.abo_group, patient.rh_d)].filter(Boolean).join(" · ") || "No other details"}
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setPatient(null)}>Change</Button>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Search by MR no. or name" value={mrQuery} onChange={(e) => setMrQuery(e.target.value)} maxLength={60} aria-invalid={!!errors.patient} />
                <Button type="button" variant="outline" onClick={() => setAddPatient(true)}><Plus className="h-4 w-4" /> New patient</Button>
              </div>
              {matches.length > 0 && (
                <div className="divide-y rounded-lg border">
                  {matches.map((p) => (
                    <button key={p.id} type="button" onClick={() => { setPatient(p); setErrors((e) => ({ ...e, patient: "" })); }} className="flex w-full justify-between gap-3 p-2.5 text-left text-sm hover:bg-secondary/50">
                      <span className="font-medium">{p.full_name}</span><span className="text-muted-foreground">{p.mr_number}</span>
                    </button>
                  ))}
                </div>
              )}
              {mrQuery.trim() && matches.length === 0 && <p className="text-sm text-muted-foreground">No patient found. Add a new one.</p>}
              {errors.patient && <p className="text-xs text-brand">{errors.patient}</p>}
            </div>
          )}
        </section>

        <FormSection title="Location and clinical details">
          <Field label="Ward" error={errors.ward}>
            <Select value={wardId} onValueChange={(v) => { setWardId(v); setErrors((e) => ({ ...e, ward: "" })); }}>
              <SelectTrigger aria-invalid={!!errors.ward}><SelectValue placeholder={wards.length ? "Select ward" : "No wards yet — add them in Settings"} /></SelectTrigger>
              <SelectContent>{wards.map((w) => <SelectItem key={w.id} value={w.id}>{w.ward_name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Bed"><Input value={bed} onChange={(e) => setBed(e.target.value)} maxLength={20} /></Field>
          <Field label="Indication" error={errors.indication} full>
            <Textarea value={indication} maxLength={300} onChange={(e) => setIndication(e.target.value)} aria-invalid={!!errors.indication} />
          </Field>
          <Field label="Requesting doctor" error={errors.doctor}><Input value={doctor} onChange={(e) => setDoctor(e.target.value)} maxLength={80} placeholder="Dr. ..." /></Field>
          <Field label="Required by"><Input type="datetime-local" value={requiredBy} onChange={(e) => setRequiredBy(e.target.value)} /></Field>
          <Field label="Urgency">
            <Select value={urgency} onValueChange={(v) => { setUrgency(v as Urgency); if (v !== "Emergency") setUncross(false); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{URGENCIES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {urgency === "Emergency" && (
            <label className="flex items-center justify-between gap-3 self-end rounded-lg border border-brand/30 bg-brand-soft p-3">
              <span className="text-sm font-medium">Uncrossmatched (needs In-charge approval)</span>
              <Switch checked={uncross} onCheckedChange={setUncross} />
            </label>
          )}
        </FormSection>

        <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Components</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { component: COMPONENTS.find((c) => !items.some((i) => i.component === c)) ?? "FFP", qty: 1 }])}><Plus className="h-4 w-4" /> Add</Button>
          </div>
          <div className="mt-4 space-y-3">
            {items.map((it, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Component</label>
                  <Select value={it.component} onValueChange={(v) => setItems(items.map((x, j) => (j === i ? { ...x, component: v as Component } : x)))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COMPONENTS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Units</label>
                  <Input type="number" min={1} max={10} value={it.qty} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} />
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove component" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {errors.items && <p className="text-xs text-brand">{errors.items}</p>}
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/requests" })}>Cancel</Button>
          <Button type="submit" variant="brand" disabled={saving}>{saving ? "Saving..." : "Save request"}</Button>
        </div>
      </form>
      <PatientDialog open={addPatient} patient={null} initialMr={mrQuery.trim()} onClose={() => setAddPatient(false)} onSaved={(p) => { setPatient(p); setErrors((e) => ({ ...e, patient: "" })); }} />
    </div>
  );
}
