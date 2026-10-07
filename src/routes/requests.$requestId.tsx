import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/bt/ConfirmDialog";
import { PageHeader, StatusBadge, ErrorState, InfoRow, Timeline, fmt } from "@/components/bt/ui";
import { useStore, nowIso, compatible, isExpired, isReady } from "@/lib/store";
import { BLOOD_GROUPS, type BloodGroup, type BloodRequest, type RequestStatus } from "@/lib/mock-data";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/requests/$requestId")({
  head: ({ params }) => seo(`Request ${params.requestId}`, "Blood request details, crossmatch results and activity log."),
  component: RequestDetail,
});

const FLOW: RequestStatus[] = ["Submitted", "Sample Received", "Crossmatch In Progress", "Ready for Issue", "Issued"];

function RequestDetail() {
  const { requestId } = Route.useParams();
  const { requests, role, ward } = useStore();
  const r = requests.find((x) => x.id === requestId);
  if (!r || (role === "ward" && r.ward !== ward)) {
    return <ErrorState title="Request not found" description={`No request "${requestId}" is visible to you.`} backTo="/requests" backLabel="Back to requests" />;
  }
  const lab = role === "tech" || role === "incharge";
  const flow: RequestStatus[] = r.uncrossmatched ? ["Pending Approval", "Approved", "Issued"] : FLOW;
  const idx = flow.findIndex((s) => r.status.startsWith(s));

  return (
    <div>
      <Link to="/requests" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Requests</Link>
      <PageHeader title={r.id} description={`${r.patient.name} · ${r.ward}`} actions={<><StatusBadge label={r.urgency} className="text-sm" /><StatusBadge label={r.status} className="text-sm" /></>} />

      <ol className="mb-6 flex flex-wrap gap-2">
        {flow.map((s, i) => (
          <li key={s} className={`rounded-full border px-3 py-1 text-xs ${i <= idx ? "border-success/30 bg-success-soft text-success" : "text-muted-foreground"}`}>{i + 1}. {s}</li>
        ))}
        {(r.status === "Cancelled" || r.status === "Rejected") && <li className="rounded-full border bg-neutral-soft px-3 py-1 text-xs text-neutral">{r.status}{r.rejectReason ? `: ${r.rejectReason}` : ""}</li>}
      </ol>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Patient and request</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow label="Patient" value={r.patient.name} />
              <InfoRow label="Father / husband" value={r.patient.relation} />
              <InfoRow label="MR no." value={r.patient.mrNo} />
              <InfoRow label="Age / gender" value={`${r.patient.age} · ${r.patient.gender}`} />
              <InfoRow label="Ward / bed" value={`${r.ward} · ${r.bed}`} />
              <InfoRow label="Doctor" value={r.doctor} />
              <InfoRow label="Indication" value={r.indication} />
              <InfoRow label="Hb / platelets" value={`${r.hb ?? "—"} g/dL · ${r.plt ?? "—"} ×10⁹/L`} />
              <InfoRow label="Required by" value={fmt(r.requiredBy)} />
              <InfoRow label="Patient group" value={r.patientGroup ?? "Not yet grouped"} />
              <InfoRow label="Antibody screen" value={r.antibodyScreen ?? "—"} />
              {r.approval && <InfoRow label="Approval" value={`${r.approval.type === "verbal" ? "Verbal" : "Formal"} · ${r.approval.by} · ${fmt(r.approval.at)}`} />}
            </dl>
            {r.uncrossmatched && <p className="mt-4 rounded-lg bg-brand-soft p-3 text-sm text-brand"><b>Uncrossmatched emergency release.</b> Reason: {r.emergencyReason}</p>}
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">Items</h2>
            <ul className="divide-y text-sm">
              {r.items.map((i) => {
                const reserved = r.crossmatches.filter((c) => c.result === "Compatible").length;
                return <li key={i.component} className="flex justify-between py-2"><span>{i.component}</span><span>{i.units} unit(s){(i.component === "PRBC" || i.component === "Whole Blood") && !r.uncrossmatched ? ` · ${reserved} crossmatched` : ""}</span></li>;
              })}
            </ul>
            {r.issuedUnits.length > 0 && <p className="mt-3 text-sm">Issued units: {r.issuedUnits.join(", ")}</p>}
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">Crossmatch</h2>
            {r.crossmatches.length === 0 ? <p className="text-sm text-muted-foreground">{r.uncrossmatched ? "Crossmatch pending (emergency release)." : "No crossmatch recorded yet."}</p> : (
              <ul className="divide-y text-sm">
                {r.crossmatches.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link to="/inventory/$unitId" params={{ unitId: c.unitId }} className="font-medium underline-offset-2 hover:underline">{c.unitId}</Link>
                    <span className="text-xs text-muted-foreground">{fmt(c.at)} · {c.by}</span>
                    <StatusBadge label={c.result} />
                  </li>
                ))}
              </ul>
            )}
            {lab && r.status === "Crossmatch In Progress" && <CrossmatchForm r={r} />}
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Activity log</h2>
            <Timeline items={r.log} />
          </section>
        </div>
        <Actions r={r} />
      </div>
    </div>
  );
}

function Actions({ r }: { r: BloodRequest }) {
  const { role, user, actor, updateRequest } = useStore();
  const [group, setGroup] = useState<BloodGroup | "">("");
  const [ab, setAb] = useState<"Negative" | "Positive" | "Not done" | "">("");
  const [approver, setApprover] = useState("Dr. Farah Siddiqui");
  const [time, setTime] = useState("12:00");
  const lab = role === "tech" || role === "incharge";
  const done = ["Issued", "Cancelled", "Rejected"].includes(r.status);
  const who = `${r.id} for ${r.patient.name}, ${r.patient.mrNo}`;
  const push = (status: RequestStatus, text: string, extra: Partial<BloodRequest> = {}) =>
    updateRequest(r.id, (x) => ({ ...x, ...extra, status, log: [...x.log, { at: nowIso(), by: actor, text }] }));

  return (
    <section className="h-fit space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="font-semibold">Actions</h2>
      {done && <p className="text-sm text-muted-foreground">This request is {r.status.toLowerCase()}.</p>}

      {lab && r.status === "Submitted" && (
        <ConfirmDialog trigger={<Button className="w-full">Mark sample received</Button>} title={`Mark sample received for ${who}?`} description="Confirm the patient sample has arrived and labels match the request. Status: Submitted → Sample Received."
          onConfirm={() => { push("Sample Received", "Sample received"); toast.success("Sample received"); }} />
      )}

      {lab && r.status === "Sample Received" && (
        <div className="space-y-3">
          <label className="text-sm font-medium">Patient ABO/Rh</label>
          <Select value={group} onValueChange={(v) => setGroup(v as BloodGroup)}>
            <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
            <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
          <label className="text-sm font-medium">Antibody screen</label>
          <Select value={ab} onValueChange={(v) => setAb(v as typeof ab)}>
            <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
            <SelectContent>{["Negative", "Positive", "Not done"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
          <ConfirmDialog trigger={<Button className="w-full" disabled={!group || !ab}>Save grouping</Button>} title={`Save grouping for ${who}?`} description={`ABO/Rh ${group}, antibody screen ${ab}. Request moves to Crossmatch In Progress.`}
            onConfirm={() => { push("Crossmatch In Progress", `Grouping ${group}, antibody screen ${ab}`, { patientGroup: group as BloodGroup, antibodyScreen: ab as "Negative" }); toast.success("Grouping recorded"); }} />
        </div>
      )}

      {r.status === "Pending Approval" && role === "incharge" && (
        <div className="space-y-2">
          <ConfirmDialog trigger={<Button variant="brand" className="w-full">Approve emergency release</Button>} title={`Approve uncrossmatched release of ${r.items.map((i) => `${i.units}× O-neg ${i.component}`).join(", ")} for ${who}?`} description="O-negative PRBC may be issued before crossmatch."
            onConfirm={() => { push("Approved", "Emergency release approved", { approval: { type: "formal", by: actor, at: nowIso() } }); toast.success("Emergency release approved"); }} />
        </div>
      )}
      {(r.status === "Approved (verbal, awaiting confirmation)") && role === "incharge" && (
        <ConfirmDialog trigger={<Button className="w-full">Confirm verbal approval</Button>} title={`Confirm verbal approval by ${r.approval?.by ?? "—"} for ${who}?`} onConfirm={() => { push("Approved", "Verbal approval confirmed", { approval: { type: "formal", by: actor, at: nowIso() } }); toast.success("Approval confirmed"); }} />
      )}
      {r.status === "Pending Approval" && role === "tech" && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Log verbal approval</p>
          <Input value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="Approver" maxLength={80} />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <ConfirmDialog trigger={<Button className="w-full" disabled={approver.trim().length < 3 || !time}>Log verbal approval</Button>} title={`Log verbal approval for ${who}?`} description={`Approved verbally by ${approver} at ${time}. Shown as awaiting In-charge confirmation.`}
            onConfirm={() => { push("Approved (verbal, awaiting confirmation)", `Verbal approval by ${approver} at ${time} logged`, { approval: { type: "verbal", by: approver.trim(), at: nowIso() } }); toast.success("Verbal approval logged"); }} />
        </div>
      )}

      {lab && isReady(r) && role === "tech" && <Button asChild variant="brand" className="w-full"><Link to="/issue" search={{ request: r.id }}>Go to issue</Link></Button>}

      {role === "incharge" && !done && (
        <ConfirmDialog trigger={<Button variant="outline" className="w-full">Reject request</Button>} title={`Reject ${who}?`} description={`Current status: ${r.status}.`} destructive requireReason reasonLabel="Rejection reason" confirmLabel="Reject"
          onConfirm={(reason) => { push("Rejected", `Rejected: ${reason}`, { rejectReason: reason }); toast.success(`${r.id} rejected`); }} />
      )}
      {role === "ward" && !done && (
        <ConfirmDialog trigger={<Button variant="outline" className="w-full">Cancel request</Button>} title={`Cancel ${who}?`} description={`Current status: ${r.status}.`} requireReason reasonLabel="Cancellation reason" confirmLabel="Cancel request"
          onConfirm={(reason) => { push("Cancelled", `Cancelled: ${reason}`, { rejectReason: reason }); toast.success(`${r.id} cancelled`); }} />
      )}
      {role === "ward" && !done && <p className="text-xs text-muted-foreground">The blood bank will update this request as it progresses.</p>}
    </section>
  );
}

function CrossmatchForm({ r }: { r: BloodRequest }) {
  const { units, user, actor, updateRequest, updateUnit } = useStore();
  const [unitId, setUnitId] = useState("");
  const [result, setResult] = useState<"Compatible" | "Incompatible" | "">("");
  const red = r.items.find((i) => i.component === "PRBC" || i.component === "Whole Blood");
  const needed = red?.units ?? 0;
  const tested = new Set(r.crossmatches.map((c) => c.unitId));
  const candidates = units
    .filter((u) => u.status === "Available" && !isExpired(u) && !tested.has(u.id) && r.items.some((i) => i.component === u.component) && r.patientGroup && compatible(r.patientGroup, u.group, u.component))
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  const compatibleCount = r.crossmatches.filter((c) => c.result === "Compatible").length;

  return (
    <div className="mt-4 space-y-3 rounded-lg border p-3">
      <p className="text-sm font-medium">Record crossmatch ({compatibleCount}/{needed || "—"} compatible)</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={unitId} onValueChange={setUnitId}>
          <SelectTrigger><SelectValue placeholder={candidates.length ? "Select unit" : "No compatible units"} /></SelectTrigger>
          <SelectContent>{candidates.map((u) => <SelectItem key={u.id} value={u.id}>{u.id} · {u.group} {u.component}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={result} onValueChange={(v) => setResult(v as typeof result)}>
          <SelectTrigger><SelectValue placeholder="Result" /></SelectTrigger>
          <SelectContent><SelectItem value="Compatible">Compatible</SelectItem><SelectItem value="Incompatible">Incompatible</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        <ConfirmDialog trigger={<Button size="sm" disabled={!unitId || !result}>Save crossmatch</Button>} title={`Record crossmatch ${result} for unit ${unitId} against ${r.id} (${r.patient.name}, ${r.patient.mrNo})?`} description={result === "Compatible" ? "The unit will be reserved for this request." : undefined}
          onConfirm={() => {
            const ok = result === "Compatible";
            const nowCount = compatibleCount + (ok ? 1 : 0);
            const ready = ok && nowCount >= needed;
            updateRequest(r.id, (x) => ({ ...x, status: ready ? "Ready for Issue" : x.status, crossmatches: [...x.crossmatches, { unitId, result: result as "Compatible", at: nowIso(), by: actor }],
              log: [...x.log, { at: nowIso(), by: actor, text: `Crossmatch ${unitId}: ${result}` }, ...(ready ? [{ at: nowIso(), by: actor, text: "Ready for issue" }] : [])] }));
            if (ok) updateUnit(unitId, (u) => ({ ...u, status: "Reserved", reservedFor: r.id, timeline: [...u.timeline, { at: nowIso(), by: actor, text: `Crossmatched compatible, reserved for ${r.id}` }] }));
            toast.success(`Crossmatch recorded${ready ? " · request ready for issue" : ""}`);
            setUnitId(""); setResult("");
          }} />
        {compatibleCount > 0 && (
          <ConfirmDialog trigger={<Button size="sm" variant="outline">Mark ready for issue</Button>} title={`Mark ${r.id} (${r.patient.name}, ${r.patient.mrNo}) ready for issue?`}
            onConfirm={() => { updateRequest(r.id, (x) => ({ ...x, status: "Ready for Issue", log: [...x.log, { at: nowIso(), by: actor, text: "Ready for issue" }] })); toast.success("Ready for issue"); }} />
        )}
      </div>
    </div>
  );
}
