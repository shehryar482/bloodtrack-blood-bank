import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/bt/ConfirmDialog";
import { PageHeader, StatusBadge, InfoRow, ErrorState, EmptyState, Field, fmt } from "@/components/bt/ui";
import { useRequest, useUnits, useRefresh, groupOf, unitGroup, inStock, compatible } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { URGENCIES, CLOSED_STATUSES } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/requests/$requestId")({
  head: () => seo("Request details", "Blood request details, items, crossmatch and issue."),
  component: RequestPage,
});

function RequestPage() {
  const { requestId } = Route.useParams();
  const { data: r, isLoading, error } = useRequest(requestId);
  const refresh = useRefresh();
  const [bed, setBed] = useState("");
  const [urgency, setUrgency] = useState("Routine");
  const [indication, setIndication] = useState("");

  useEffect(() => {
    if (r) { setBed(r.bed_no ?? ""); setUrgency(r.urgency); setIndication(r.indication); }
  }, [r]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <ErrorState title="Could not load request" description={error.message} backTo="/requests" backLabel="Back to requests" />;
  if (!r) return <ErrorState title="Request not found" backTo="/requests" backLabel="Back to requests" />;

  const dirty = bed !== (r.bed_no ?? "") || urgency !== r.urgency || indication !== r.indication;
  const saveEdits = async () => {
    if (indication.trim().length < 3) { toast.error("Indication must be at least 3 characters"); return; }
    const { error } = await supabase.from("blood_requests").update({ bed_no: bed.trim() || null, urgency, indication: indication.trim() }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Request updated"); refresh();
  };
  const archive = async (reason: string) => {
    const { error } = await supabase.from("blood_requests").update({ is_archived: true, archive_reason: reason }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${r.request_code} archived`); refresh();
  };
  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("request_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Item removed"); refresh();
  };
  const p = r.patients;
  const pGroup = groupOf(p?.abo_group, p?.rh_d);
  const open = !CLOSED_STATUSES.includes(r.status) && !r.is_archived;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/requests"><ArrowLeft className="h-4 w-4" /> Requests</Link></Button>
        <PageHeader
          title={r.request_code}
          description={`Created ${fmt(r.created_at)}`}
          actions={<>
            <StatusBadge label={r.urgency} /><StatusBadge label={r.status} />{r.is_archived && <StatusBadge label="Archived" />}
            {r.status === "Ready for Issue" && !r.is_archived && <Button asChild size="sm" variant="brand"><Link to="/issue" search={{ request: r.id }}>Issue</Link></Button>}
            {!r.is_archived && (
              <ConfirmDialog trigger={<Button size="sm" variant="outline">Archive</Button>} title={`Archive ${r.request_code}?`}
                description="Archived requests are hidden from the list unless you turn on Show archived." requireReason reasonLabel="Archive reason" confirmLabel="Archive" destructive onConfirm={archive} />
            )}
          </>}
        />
        {r.is_archived && r.archive_reason && <p className="text-sm text-muted-foreground">Archive reason: {r.archive_reason}</p>}
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoRow label="Patient" value={p?.full_name} />
          <InfoRow label="MR no." value={p?.mr_number} />
          <InfoRow label="Patient group" value={pGroup ?? "Not grouped"} />
          <InfoRow label="Ward" value={r.wards?.ward_name ?? "—"} />
          <InfoRow label="Doctor" value={r.requesting_doctor} />
          <InfoRow label="Required by" value={r.required_by ? fmt(r.required_by) : "—"} />
          {r.is_uncrossmatched && <InfoRow label="Uncrossmatched" value="Yes" />}
          {r.approved_by && <InfoRow label="Approved by" value={`${r.approved_by} (${r.approval_mode ?? ""})`} />}
        </dl>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Edit details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bed"><Input value={bed} onChange={(e) => setBed(e.target.value)} maxLength={20} /></Field>
          <Field label="Urgency">
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{URGENCIES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Indication" full><Textarea value={indication} onChange={(e) => setIndication(e.target.value)} maxLength={300} /></Field>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="brand" disabled={!dirty} onClick={saveEdits}>Save changes</Button></div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Requested items</h2>
        {r.request_items.length === 0 ? <p className="text-sm text-muted-foreground">No items.</p> : (
          <div className="divide-y">
            {r.request_items.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span><span className="font-medium">{i.component}</span> · {i.quantity_requested} requested · {i.quantity_issued} issued</span>
                <ConfirmDialog trigger={<Button size="icon" variant="ghost" aria-label="Delete item"><Trash2 className="h-4 w-4" /></Button>}
                  title={`Delete ${i.quantity_requested}× ${i.component} from ${r.request_code}?`} destructive confirmLabel="Delete" onConfirm={() => deleteItem(i.id)} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Crossmatch tests</h2>
        {r.crossmatch_tests.length === 0 ? <p className="text-sm text-muted-foreground">No crossmatch tests yet.</p> : (
          <div className="divide-y">
            {r.crossmatch_tests.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-medium">{c.blood_units?.unit_number}</span>
                  <span className="text-muted-foreground"> · {c.blood_units && unitGroup(c.blood_units)} {c.blood_units?.component} · screen {c.antibody_screen} · {fmt(c.tested_at)}</span>
                </span>
                <StatusBadge label={c.result} />
              </div>
            ))}
          </div>
        )}
        {open && <CrossmatchForm requestId={r.id} patientGroup={pGroup} components={r.request_items.map((i) => i.component)} />}
      </section>

      {r.issue_records.length > 0 && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Issued units</h2>
          <div className="divide-y">
            {r.issue_records.map((i) => (
              <div key={i.id} className="py-2 text-sm"><span className="font-medium">{i.blood_units?.unit_number}</span> <span className="text-muted-foreground">· {i.blood_units?.component} · received by {i.received_by} · {fmt(i.issued_at)}</span></div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CrossmatchForm({ requestId, patientGroup, components }: { requestId: string; patientGroup: ReturnType<typeof groupOf>; components: string[] }) {
  const { data: units = [] } = useUnits();
  const refresh = useRefresh();
  const [unitId, setUnitId] = useState("");
  const [screen, setScreen] = useState("Negative");
  const [result, setResult] = useState("Compatible");
  const [saving, setSaving] = useState(false);

  const candidates = units.filter((u) => inStock(u) && (components.length === 0 || components.includes(u.component)))
    .filter((u) => !patientGroup || compatible(patientGroup, unitGroup(u), u.component));

  const save = async () => {
    if (!unitId) { toast.error("Choose a unit"); return; }
    setSaving(true);
    const { error } = await supabase.from("crossmatch_tests").insert({
      request_id: requestId, unit_id: unitId, antibody_screen: screen, result,
      patient_abo: patientGroup ? patientGroup.replace(/[+-]/, "") : null,
      patient_rh: patientGroup ? (patientGroup.endsWith("+") ? "Pos" : "Neg") : null,
    });
    if (error) { setSaving(false); toast.error(error.message); return; }
    if (result === "Compatible") {
      await supabase.from("blood_units").update({ status: "Reserved" }).eq("id", unitId);
      await supabase.from("blood_requests").update({ status: "Ready for Issue" }).eq("id", requestId);
    } else {
      await supabase.from("blood_requests").update({ status: "Crossmatch In Progress" }).eq("id", requestId);
    }
    setSaving(false); setUnitId("");
    toast.success(result === "Compatible" ? "Compatible — unit reserved" : "Incompatible result saved");
    refresh();
  };

  return (
    <div className="mt-4 rounded-lg border bg-secondary/30 p-4">
      <h3 className="mb-3 text-sm font-semibold">Record crossmatch</h3>
      {candidates.length === 0 ? <EmptyState title="No suitable available units" description="Only available, unexpired, ABO-compatible units for the requested components are listed." /> : (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger><SelectValue placeholder="Choose unit" /></SelectTrigger>
              <SelectContent>{candidates.map((u) => <SelectItem key={u.id} value={u.id}>{u.unit_number} · {unitGroup(u)} {u.component}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Select value={screen} onValueChange={setScreen}>
            <SelectTrigger aria-label="Antibody screen"><SelectValue /></SelectTrigger>
            <SelectContent>{["Negative", "Positive", "Not done"].map((s) => <SelectItem key={s} value={s}>Screen: {s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={result} onValueChange={setResult}>
            <SelectTrigger aria-label="Result"><SelectValue /></SelectTrigger>
            <SelectContent>{["Compatible", "Incompatible"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <div className="sm:col-span-4 flex justify-end"><Button variant="brand" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save crossmatch"}</Button></div>
        </div>
      )}
    </div>
  );
}
