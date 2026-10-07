import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/bt/ConfirmDialog";
import { PageHeader, StatusBadge, InfoRow, ErrorState, fmt, fmtDate, expiresIn } from "@/components/bt/ui";
import { useUnits, useRefresh, displayStatus, hoursLeft, unitGroup } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { UNIT_STATUSES } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/inventory/$unitId")({
  head: () => seo("Unit details", "Blood unit details, status and discard."),
  component: UnitPage,
});

function UnitPage() {
  const { unitId } = Route.useParams();
  const { data: units, isLoading } = useUnits();
  const refresh = useRefresh();
  const u = units?.find((x) => x.id === unitId);
  const [status, setStatus] = useState<string>("");

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!u) return <ErrorState title="Unit not found" backTo="/inventory" backLabel="Back to inventory" />;

  const update = async (patch: { status: string; discard_reason?: string | null }, msg: string) => {
    const { error } = await supabase.from("blood_units").update(patch).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    toast.success(msg); setStatus(""); refresh();
  };
  const next = status || u.status;

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/inventory"><ArrowLeft className="h-4 w-4" /> Inventory</Link></Button>
      <PageHeader title={u.unit_number} description={`${unitGroup(u)} ${u.component}`} actions={<StatusBadge label={displayStatus(u)} />} />
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoRow label="Component" value={u.component} />
          <InfoRow label="Group" value={unitGroup(u)} />
          <InfoRow label="Volume" value={u.volume_ml ? `${u.volume_ml} mL` : "—"} />
          <InfoRow label="Collected" value={fmtDate(u.collection_date)} />
          <InfoRow label="Expiry" value={`${fmt(u.expiry_at)} (${expiresIn(hoursLeft(u))})`} />
          <InfoRow label="Location" value={u.storage_location ?? "—"} />
          {u.discard_reason && <InfoRow label="Discard reason" value={u.discard_reason} />}
        </dl>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Change status</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={next} onValueChange={setStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{UNIT_STATUSES.filter((s) => s !== "Discarded").map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" disabled={next === u.status} onClick={() => update({ status: next, discard_reason: null }, `Status set to ${next}`)}>Save status</Button>
          {u.status !== "Discarded" && (
            <ConfirmDialog
              trigger={<Button variant="brand" className="ml-auto">Mark discarded</Button>}
              title={`Discard unit ${u.unit_number} (${unitGroup(u)} ${u.component})?`}
              destructive requireReason reasonLabel="Discard reason" confirmLabel="Discard"
              onConfirm={(reason) => update({ status: "Discarded", discard_reason: reason }, `${u.unit_number} discarded`)}
            />
          )}
        </div>
      </section>
    </div>
  );
}
