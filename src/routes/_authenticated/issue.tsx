import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/bt/ConfirmDialog";
import { PageHeader, EmptyState, Field, StatusBadge } from "@/components/bt/ui";
import { useRequests, useRequest, useUnits, useRefresh, unitGroup, inStock, isExpired, groupOf } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/issue")({
  head: () => seo("Issue blood", "Issue crossmatched blood units to the ward."),
  validateSearch: z.object({ request: z.string().optional() }),
  component: IssuePage,
});

function IssuePage() {
  const search = Route.useSearch();
  const { data: requests = [], isLoading } = useRequests();
  const ready = requests.filter((r) => !r.is_archived && (r.status === "Ready for Issue" || r.status === "Approved"));
  const [reqId, setReqId] = useState(search.request ?? "");
  useEffect(() => { if (search.request) setReqId(search.request); }, [search.request]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Issue blood" description="Issue a reserved, crossmatched unit (or an approved uncrossmatched O-neg unit) to the ward." />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : ready.length === 0 ? (
        <EmptyState title="Nothing ready to issue" description="Requests appear here once a compatible crossmatch is saved or an emergency release is approved." action={<Button asChild variant="outline"><Link to="/requests">View requests</Link></Button>} />
      ) : (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <Field label="Request">
            <Select value={reqId} onValueChange={setReqId}>
              <SelectTrigger><SelectValue placeholder="Choose request" /></SelectTrigger>
              <SelectContent>{ready.map((r) => <SelectItem key={r.id} value={r.id}>{r.request_code} · {r.patients?.full_name} ({r.patients?.mr_number})</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </section>
      )}
      {reqId && ready.some((r) => r.id === reqId) && <IssueForm key={reqId} requestId={reqId} onDone={() => setReqId("")} />}
    </div>
  );
}

function IssueForm({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const { data: r } = useRequest(requestId);
  const { data: units = [] } = useUnits();
  const refresh = useRefresh();
  const [unitId, setUnitId] = useState("");
  const [receivedBy, setReceivedBy] = useState("");

  const options = useMemo(() => {
    if (!r) return [];
    const issued = new Set(r.issue_records.map((i) => i.unit_id));
    const xm = r.crossmatch_tests.filter((c) => c.result === "Compatible" && !issued.has(c.unit_id));
    const fromXm = xm.map((c) => ({ unit: units.find((u) => u.id === c.unit_id), crossmatchId: c.id }))
      .filter((o) => o.unit && o.unit.status === "Reserved" && !isExpired(o.unit));
    if (r.is_uncrossmatched && r.status === "Approved") {
      return units.filter((u) => inStock(u) && u.component === "PRBC" && unitGroup(u) === "O-").map((u) => ({ unit: u, crossmatchId: null as string | null }));
    }
    return fromXm as { unit: NonNullable<(typeof fromXm)[number]["unit"]>; crossmatchId: string | null }[];
  }, [r, units]);

  if (!r) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const chosen = options.find((o) => o.unit!.id === unitId);

  const issue = async () => {
    if (!chosen) return;
    const u = chosen.unit!;
    const { error } = await supabase.from("issue_records").insert({
      request_id: r.id, unit_id: u.id, crossmatch_id: chosen.crossmatchId, received_by: receivedBy.trim(),
      issued_uncrossmatched: !chosen.crossmatchId,
    });
    if (error) { toast.error(error.code === "23505" ? "This unit has already been issued" : error.message); return; }
    await supabase.from("blood_units").update({ status: "Issued" }).eq("id", u.id);
    await supabase.from("blood_requests").update({ status: "Issued" }).eq("id", r.id);
    const item = r.request_items.find((i) => i.component === u.component);
    if (item) await supabase.from("request_items").update({ quantity_issued: item.quantity_issued + 1 }).eq("id", item.id);
    toast.success(`${u.unit_number} issued to ${receivedBy.trim()}`);
    await refresh();
    onDone();
  };

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium">{r.patients?.full_name} · {r.patients?.mr_number}</div>
          <div className="text-xs text-muted-foreground">{r.wards?.ward_name ?? "No ward"} · Group {groupOf(r.patients?.abo_group, r.patients?.rh_d) ?? "not recorded"}</div>
        </div>
        <StatusBadge label={r.status} />
      </div>
      {options.length === 0 ? <EmptyState title="No units available to issue" description="Reserve a unit with a compatible crossmatch on the request page first." /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Unit">
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger><SelectValue placeholder="Choose unit" /></SelectTrigger>
              <SelectContent>{options.map((o) => <SelectItem key={o.unit!.id} value={o.unit!.id}>{o.unit!.unit_number} · {unitGroup(o.unit!)} {o.unit!.component}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Received by"><Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} maxLength={80} placeholder="Name of ward staff" /></Field>
          <div className="flex justify-end sm:col-span-2">
            <ConfirmDialog
              trigger={<Button variant="brand" disabled={!chosen || receivedBy.trim().length < 3}>Issue unit</Button>}
              title={chosen ? `Issue ${chosen.unit!.unit_number} (${unitGroup(chosen.unit!)} ${chosen.unit!.component}) for ${r.patients?.full_name}?` : "Issue unit?"}
              description={`Received by ${receivedBy.trim()}. Confirm the patient ID band matches the request.`}
              confirmLabel="Issue" onConfirm={issue}
            />
          </div>
        </div>
      )}
    </section>
  );
}
