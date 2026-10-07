import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/bt/ConfirmDialog";
import { RoleGate } from "@/components/bt/AppShell";
import { PageHeader, FormSection, Field } from "@/components/bt/ui";
import { useStore, nowIso } from "@/lib/store";
import { COMPONENTS, NOW, type Component, type Urgency } from "@/lib/mock-data";
import { seo } from "@/lib/seo";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/requests/new")({
  head: () => seo("New blood request", "Raise a new blood component request for a patient."),
  component: () => <RoleGate roles={["ward"]}><NewRequest /></RoleGate>,
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter patient name").max(80),
  relation: z.string().trim().min(2, "Enter father/husband name").max(80),
  mrNo: z.string().trim().regex(/^DGH-\d{4}-\d{6}$/, "Format must be DGH-YYYY-NNNNNN"),
  age: z.coerce.number({ invalid_type_error: "Enter age" }).int("Whole number").min(0, "0–120").max(120, "0–120"),
  gender: z.enum(["Male", "Female", "Other"], { errorMap: () => ({ message: "Select gender" }) }),
  bed: z.string().trim().min(1, "Enter bed").max(20),
  indication: z.string().trim().min(3, "Enter indication").max(300),
  hb: z.union([z.literal(""), z.coerce.number().min(1, "1–25").max(25, "1–25")]),
  plt: z.union([z.literal(""), z.coerce.number().min(0, "0–2000").max(2000, "0–2000")]),
  requiredBy: z.string().min(1, "Select date and time"),
  doctor: z.string().trim().min(3, "Enter doctor name").max(80),
});

type Form = Record<keyof z.infer<typeof schema>, string>;
const empty: Form = { name: "", relation: "", mrNo: "", age: "", gender: "", bed: "", indication: "", hb: "", plt: "", requiredBy: format(NOW + 4 * 3600_000, "yyyy-MM-dd'T'HH:mm"), doctor: "" };

function NewRequest() {
  const { ward, addRequest, nextRequestId, user, actor } = useStore();
  const navigate = useNavigate();
  const [f, setF] = useState<Form>(empty);
  const [items, setItems] = useState<{ component: Component; units: number }[]>([{ component: "PRBC", units: 1 }]);
  const [urgency, setUrgency] = useState<Urgency>("Routine");
  const [uncross, setUncross] = useState(false);
  const [reason, setReason] = useState("");
  const [responsible, setResponsible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof Form) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  const validate = () => {
    const e: Record<string, string> = {};
    const r = schema.safeParse(f);
    if (!r.success) r.error.issues.forEach((i) => { e[i.path[0] as string] ??= i.message; });
    if (items.length === 0) e.items = "Add at least one component";
    if (items.some((i) => !i.units || i.units < 1 || i.units > 10)) e.items = "Units must be 1–10";
    if (new Set(items.map((i) => i.component)).size !== items.length) e.items = "Each component only once";
    if (urgency === "Emergency" && uncross) {
      if (reason.trim().length < 5) e.reason = "Give a reason for emergency release";
      if (!responsible) e.responsible = "You must accept responsibility";
      if (items.some((i) => i.component !== "PRBC")) e.items = "Uncrossmatched release is PRBC (O-negative) only";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    const id = nextRequestId();
    const isUncross = urgency === "Emergency" && uncross;
    addRequest({
      id,
      patient: { name: f.name.trim(), relation: f.relation.trim(), mrNo: f.mrNo.trim(), age: Number(f.age), gender: f.gender as "Male" },
      ward, bed: f.bed.trim(), indication: f.indication.trim(),
      hb: f.hb ? Number(f.hb) : undefined, plt: f.plt ? Number(f.plt) : undefined,
      items, urgency, requiredBy: new Date(f.requiredBy).toISOString(), doctor: f.doctor.trim(),
      status: isUncross ? "Pending Approval" : "Submitted",
      createdAt: nowIso(), uncrossmatched: isUncross, emergencyReason: isUncross ? reason.trim() : undefined,
      crossmatches: [], issuedUnits: [],
      log: [{ at: nowIso(), by: actor, text: isUncross ? "Emergency uncrossmatched request submitted" : "Request submitted" }],
    });
    toast.success(`Request ${id} submitted`, { description: isUncross ? "Awaiting In-charge approval" : "Blood bank has been notified" });
    navigate({ to: "/requests/$requestId", params: { requestId: id } });
  };

  const inp = (k: keyof Form, props: React.ComponentProps<typeof Input> = {}) => (
    <Input value={f[k]} onChange={(e) => set(k)(e.target.value)} aria-invalid={!!errors[k]} {...props} />
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New blood request" description={`Ward: ${ward}`} />
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <FormSection title="Patient">
          <Field label="Patient name" error={errors.name}>{inp("name", { maxLength: 80 })}</Field>
          <Field label="Father / husband name" error={errors.relation}>{inp("relation", { maxLength: 80 })}</Field>
          <Field label="MR no." error={errors.mrNo}>{inp("mrNo", { placeholder: "DGH-2026-000000", maxLength: 15 })}</Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Age" error={errors.age}>{inp("age", { type: "number", min: 0, max: 120 })}</Field>
            <Field label="Gender" error={errors.gender}>
              <Select value={f.gender} onValueChange={set("gender")}>
                <SelectTrigger aria-invalid={!!errors.gender}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["Male", "Female", "Other"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Ward"><Input value={ward} disabled /></Field>
          <Field label="Bed" error={errors.bed}>{inp("bed", { maxLength: 20 })}</Field>
        </FormSection>

        <FormSection title="Clinical details">
          <Field label="Indication" error={errors.indication} full>
            <Textarea value={f.indication} maxLength={300} onChange={(e) => set("indication")(e.target.value)} aria-invalid={!!errors.indication} />
          </Field>
          <Field label="Hb (g/dL) — optional" error={errors.hb}>{inp("hb", { type: "number", step: "0.1" })}</Field>
          <Field label="Platelet count (×10⁹/L) — optional" error={errors.plt}>{inp("plt", { type: "number" })}</Field>
        </FormSection>

        <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Components</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { component: COMPONENTS.find((c) => !items.some((i) => i.component === c)) ?? "FFP", units: 1 }])}><Plus className="h-4 w-4" /> Add</Button>
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
                  <Input type="number" min={1} max={10} value={it.units} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, units: Number(e.target.value) } : x)))} />
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove component" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {errors.items && <p className="text-xs text-brand">{errors.items}</p>}
          </div>
        </section>

        <FormSection title="Urgency and authorisation">
          <Field label="Urgency">
            <Select value={urgency} onValueChange={(v) => { setUrgency(v as Urgency); if (v !== "Emergency") setUncross(false); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Routine", "Urgent", "Emergency"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Required by" error={errors.requiredBy}>{inp("requiredBy", { type: "datetime-local" })}</Field>
          <Field label="Requesting doctor" error={errors.doctor} full>{inp("doctor", { maxLength: 80, placeholder: "Dr. ..." })}</Field>
          {urgency === "Emergency" && (
            <div className="space-y-4 rounded-lg border border-brand/30 bg-brand-soft p-4 sm:col-span-2">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Uncrossmatched (emergency release)</span>
                <Switch checked={uncross} onCheckedChange={setUncross} />
              </label>
              {uncross && (
                <>
                  <Field label="Reason for emergency release" error={errors.reason}>
                    <Textarea value={reason} maxLength={300} onChange={(e) => { setReason(e.target.value); setErrors((x) => ({ ...x, reason: "" })); }} />
                  </Field>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox checked={responsible} onCheckedChange={(v) => { setResponsible(!!v); setErrors((x) => ({ ...x, responsible: "" })); }} className="mt-0.5" />
                    I accept clinical responsibility for transfusing uncrossmatched O-negative blood.
                  </label>
                  {errors.responsible && <p className="text-xs text-brand">{errors.responsible}</p>}
                </>
              )}
            </div>
          )}
        </FormSection>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: "/requests" })}>Cancel</Button>
          {/* Validate first; the dialog only opens when valid. */}
          <ValidatedSubmit validate={validate} onConfirm={submit} urgency={urgency} name={f.name} />
        </div>
      </form>
    </div>
  );
}

function ValidatedSubmit({ validate, onConfirm, urgency, name }: { validate: () => boolean; onConfirm: () => void; urgency: Urgency; name: string }) {
  const [ok, setOk] = useState(false);
  if (!ok) {
    return <Button type="button" variant="brand" onClick={() => { if (validate()) setOk(true); else toast.error("Please fix the highlighted fields"); }}>Review &amp; submit</Button>;
  }
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOk(false)}>Edit</Button>
      <ConfirmDialog
        trigger={<Button type="button" variant="brand">Submit request</Button>}
        title="Submit this blood request?"
        description={`${urgency} request for ${name}. The blood bank will be notified immediately.`}
        confirmLabel="Submit"
        onConfirm={() => { if (validate()) onConfirm(); else setOk(false); }}
      />
    </>
  );
}
