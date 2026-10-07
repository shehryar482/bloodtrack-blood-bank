import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/bt/ConfirmDialog";
import { RoleGate } from "@/components/bt/AppShell";
import { PageHeader, StatusBadge, EmptyState, ErrorState, Field, fmt, expiresIn } from "@/components/bt/ui";
import { useStore, isReady, isExpired, compatible, nowIso, sortRequests, hoursLeft } from "@/lib/store";
import type { Unit } from "@/lib/mock-data";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/issue")({
  validateSearch: z.object({ request: z.string().optional() }),
  head: () => seo("Issue blood", "Issue crossmatched or emergency units with bedside-style double checks."),
  component: () => <RoleGate roles={["tech"]}><IssuePage /></RoleGate>,
});

interface Slip { reqId: string; patient: string; mrNo: string; ward: string; units: string[]; receiver: string; by: string; at: string; uncross: boolean }

function IssuePage() {
  const search = Route.useSearch();
  const { requests, units, user, actor, updateRequest, updateUnit } = useStore();
  const ready = requests.filter(isReady).sort(sortRequests);
  const [reqId, setReqId] = useState(search.request && ready.some((r) => r.id === search.request) ? search.request : "");
  const [selected, setSelected] = useState<string[]>([]);
  const [mr, setMr] = useState("");
  const [typed, setTyped] = useState("");
  const [receiver, setReceiver] = useState("");
  const [slip, setSlip] = useState<Slip | null>(null);
  const r = ready.find((x) => x.id === reqId);

  const candidates = useMemo(() => {
    if (!r) return [] as Unit[];
    const list = r.uncrossmatched
      ? units.filter((u) => u.group === "O-" && u.component === "PRBC" && u.status === "Available")
      : units.filter((u) => u.reservedFor === r.id && u.status === "Reserved").concat(
          units.filter((u) => u.status === "Available" && r.patientGroup && r.items.some((i) => i.component === u.component && i.component !== "PRBC" && i.component !== "Whole Blood") && compatible(r.patientGroup, u.group, u.component)),
        );
    return list.sort((a, b) => Number(!!b.prioritised) - Number(!!a.prioritised) || a.expiresAt.localeCompare(b.expiresAt));
  }, [r, units]);
  const suggested = candidates.find((u) => !isExpired(u))?.id;
  const needed = r ? r.items.reduce((s, i) => s + (r.uncrossmatched ? (i.component === "PRBC" ? i.units : 0) : i.units), 0) : 0;

  const typedIds = typed.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
  const errors: string[] = [];
  if (r) {
    if (selected.length === 0) errors.push("Select at least one unit.");
    if (mr && mr.trim() !== r.patient.mrNo) errors.push("MR no. does not match the patient — cannot issue.");
    if (typed && (typedIds.length !== selected.length || !selected.every((s) => typedIds.includes(s)))) errors.push("Typed unit no. does not match the selected unit(s) — cannot issue.");
  }
  const selectedUnits = units.filter((u) => selected.includes(u.id));
  const expiredSelected = selectedUnits.filter(isExpired);
  if (expiredSelected.length) errors.push(`Unit ${expiredSelected.map((u) => u.id).join(", ")} has expired — cannot issue.`);
  const canIssue = r && expiredSelected.length === 0 && selected.length > 0 && mr.trim() === r.patient.mrNo && typedIds.length === selected.length && selected.every((s) => typedIds.includes(s)) && receiver.trim().length >= 3;

  const reset = (id: string) => { setReqId(id); setSelected([]); setMr(""); setTyped(""); setReceiver(""); setSlip(null); };

  const issue = () => {
    if (!r) return;
    const at = nowIso();
    const label = r.uncrossmatched ? "Issued uncrossmatched, crossmatch pending" : "Issued";
    selected.forEach((id) => updateUnit(id, (u) => ({ ...u, status: "Issued", timeline: [...u.timeline, { at, by: actor, text: `${label} for ${r.id} to ${receiver.trim()}` }] })));
    updateRequest(r.id, (x) => ({ ...x, status: "Issued", issuedUnits: [...x.issuedUnits, ...selected], log: [...x.log, { at, by: actor, text: `${label}: ${selected.join(", ")} to ${receiver.trim()}` }] }));
    setSlip({ reqId: r.id, patient: r.patient.name, mrNo: r.patient.mrNo, ward: `${r.ward} · ${r.bed}`, units: selected, receiver: receiver.trim(), by: actor, at, uncross: !!r.uncrossmatched });
    toast.success(`${selected.length} unit(s) issued for ${r.id}`);
    setReqId(""); setSelected([]); setMr(""); setTyped(""); setReceiver("");
  };

  return (
    <div>
      <PageHeader title="Issue blood" description="Select a ready request, pick units and complete the identity checks." />
      {slip && (
        <section className="mb-6 rounded-xl border border-success/30 bg-success-soft p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Issue slip · {slip.reqId}</h2>
              <p className="text-sm">{slip.patient} ({slip.mrNo}) · {slip.ward}</p>
              <p className="text-sm">Units: {slip.units.join(", ")}</p>
              <p className="text-sm">Received by {slip.receiver} · issued by {slip.by} · {fmt(slip.at)}</p>
              {slip.uncross && <p className="mt-1 text-sm font-medium text-brand">Issued uncrossmatched, crossmatch pending</p>}
            </div>
            <Button variant="outline" onClick={() => toast("Print issue slip (mock)", { description: "In a real system this would print to the blood bank printer." })}><Printer className="h-4 w-4" /> Print issue slip</Button>
          </div>
        </section>
      )}

      {search.request && !requests.some((x) => x.id === search.request) && (
        <div className="mb-6"><ErrorState title="Request not found" description={`No request "${search.request}" exists. Choose a ready request below.`} backTo="/requests" backLabel="Back to requests" /></div>
      )}
      {search.request && requests.some((x) => x.id === search.request) && !ready.some((x) => x.id === search.request) && (
        <p className="mb-4 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-warning">Request {search.request} is not ready for issue yet.</p>
      )}
      {ready.length === 0 ? (
        <EmptyState title="No requests ready for issue" description="Requests appear here after crossmatch or emergency approval." action={<Button asChild variant="outline"><Link to="/requests">View requests</Link></Button>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-2">
            <h2 className="font-semibold">Ready requests</h2>
            {ready.map((x) => (
              <button key={x.id} onClick={() => reset(x.id)} className={cn("w-full rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:border-foreground/20", reqId === x.id && "border-brand ring-2 ring-brand/20")}>
                <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{x.id}</span><StatusBadge label={x.urgency} /></div>
                <div className="text-sm">{x.patient.name}</div>
                <div className="text-xs text-muted-foreground">{x.ward} · {x.items.map((i) => `${i.units}× ${i.component}`).join(", ")}</div>
                {x.uncrossmatched && <div className="mt-1 text-xs font-medium text-brand">Uncrossmatched · {x.status}</div>}
              </button>
            ))}
          </section>

          <section className="space-y-4 lg:col-span-2">
            {!r ? <EmptyState title="Select a request" description="Choose a ready request on the left to see compatible units." /> : (
              <>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <h2 className="font-semibold">Units for {r.patient.name} {r.patientGroup && <span className="text-muted-foreground">({r.patientGroup})</span>}</h2>
                  <p className="text-xs text-muted-foreground">{r.uncrossmatched ? "Emergency release: O-negative PRBC only." : "Crossmatched units reserved for this request, plus compatible non-red-cell components."} Select up to {needed}.</p>
                  {candidates.length === 0 ? <div className="mt-3"><EmptyState title="No suitable units" description="Check inventory or crossmatch more units." action={<Button asChild variant="outline"><Link to="/inventory">Open inventory</Link></Button>} /></div> : (
                    <ul className="mt-3 divide-y">
                      {candidates.map((u) => {
                        const expired = isExpired(u);
                        const checked = selected.includes(u.id);
                        return (
                          <li key={u.id} className="flex flex-wrap items-start gap-3 py-2.5">
                            <Checkbox disabled={expired || (!checked && selected.length >= needed)} checked={checked}
                              onCheckedChange={(v) => setSelected(v ? [...selected, u.id] : selected.filter((s) => s !== u.id))} aria-label={`Select ${u.id}`} />
                            <div className="min-w-0 flex-1 basis-[calc(100%-2.5rem)] sm:basis-0">
                              <div className="text-sm font-medium">{u.id} <span className="font-normal text-muted-foreground">· {u.group} {u.component} · {u.location}</span></div>
                              <div className="text-xs text-muted-foreground">Expires {fmt(u.expiresAt)}{` · ${expiresIn(hoursLeft(u))}`}</div>
                            </div>
                            <div className="flex w-full flex-wrap gap-1 pl-7 sm:w-auto sm:pl-0">
                              {expired && <StatusBadge label="Unit expired, cannot issue" tone="neutral" />}
                              {u.id === suggested && <StatusBadge label="Suggested (earliest expiry)" tone="success" />}
                              {u.prioritised && <StatusBadge label="Prioritised" />}
                              {u.status === "Reserved" && <StatusBadge label="Reserved" />}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-2">
                  <Field label="Type patient MR no. to confirm"><Input value={mr} onChange={(e) => setMr(e.target.value)} placeholder="DGH-2026-000000" maxLength={15} /></Field>
                  <Field label="Type unit no.(s) to confirm"><Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DGH-26-00000" maxLength={100} /></Field>
                  <Field label="Receiver name" full><Input value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="Nurse / porter collecting the blood" maxLength={80} /></Field>
                  {errors.length > 0 && (mr || typed || expiredSelected.length > 0) && <ul className="space-y-1 text-xs text-brand sm:col-span-2">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
                  <div className="sm:col-span-2">
                    <ConfirmDialog
                      trigger={<Button variant="brand" disabled={!canIssue}>Confirm issue</Button>}
                      title={`Issue ${selectedUnits.length === 1 ? "unit" : "units"} ${selectedUnits.map((u) => `${u.id} (${u.group} ${u.component}, expires ${format(new Date(u.expiresAt), "d MMM")})`).join(", ")} to ${r.patient.name}, ${r.patient.mrNo}?`}
                      description={<div className="space-y-1"><p>Request {r.id} · {r.ward}, bed {r.bed}</p><p>Received by: {receiver}</p>{r.uncrossmatched && <p className="font-medium text-brand">Issued uncrossmatched, crossmatch pending</p>}</div>}
                      confirmLabel="Issue"
                      onConfirm={issue}
                    />
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
