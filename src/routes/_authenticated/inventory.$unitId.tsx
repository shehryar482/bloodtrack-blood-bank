import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/bt/ConfirmDialog";
import { RoleGate } from "@/components/bt/AppShell";
import { PageHeader, StatusBadge, ErrorState, InfoRow, Timeline, fmt, expiresIn } from "@/components/bt/ui";
import { useStore, displayStatus, hoursLeft, nowIso } from "@/lib/store";
import type { UnitStatus } from "@/lib/mock-data";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/inventory/$unitId")({
  head: ({ params }) => seo(`Unit ${params.unitId}`, "Blood unit details and status timeline."),
  component: () => <RoleGate roles={["tech", "incharge"]}><UnitDetail /></RoleGate>,
});

function UnitDetail() {
  const { unitId } = Route.useParams();
  const { units, updateUnit, user, actor, settings } = useStore();
  const unit = units.find((u) => u.id === unitId);
  const [next, setNext] = useState<UnitStatus>("Available");

  if (!unit) return <ErrorState title="Unit not found" description={`No unit with number "${unitId}" exists in this prototype.`} backTo="/inventory" backLabel="Back to inventory" />;

  const ds = displayStatus(unit, settings);
  const h = hoursLeft(unit);
  const final = unit.status === "Issued" || unit.status === "Discarded";

  return (
    <div>
      <Link to="/inventory" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Inventory</Link>
      <PageHeader title={unit.id} description={`${unit.group} · ${unit.component}`} actions={<StatusBadge label={ds} className="text-sm" />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow label="Component" value={unit.component} />
              <InfoRow label="Blood group" value={unit.group} />
              <InfoRow label="Volume" value={`${unit.volume} mL`} />
              <InfoRow label="Collected" value={fmt(unit.collectedAt)} />
              <InfoRow label="Expiry" value={<>{fmt(unit.expiresAt)} <span className="text-muted-foreground">({expiresIn(h)})</span></>} />
              <InfoRow label="Location" value={unit.location} />
              {unit.reservedFor && <InfoRow label="Reserved for" value={<Link className="underline" to="/requests/$requestId" params={{ requestId: unit.reservedFor }}>{unit.reservedFor}</Link>} />}
              {unit.discardReason && <InfoRow label="Discard reason" value={unit.discardReason} />}
            </dl>
          </section>
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Status timeline</h2>
            <Timeline items={unit.timeline} />
          </section>
        </div>
        <section className="h-fit space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Actions</h2>
          {final ? <p className="text-sm text-muted-foreground">This unit is {unit.status.toLowerCase()}; no further changes allowed.</p> : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Change status</label>
                <Select value={next} onValueChange={(v) => setNext(v as UnitStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
                <ConfirmDialog
                  trigger={<Button variant="outline" className="w-full" disabled={next === unit.status}>Update status</Button>}
                  title={`Change unit ${unit.id} (${unit.group} ${unit.component}, expires ${fmt(unit.expiresAt)}) from ${unit.status} to ${next}?`}
                  description="The change will be added to the status timeline."
                  onConfirm={() => {
                    updateUnit(unit.id, (u) => ({ ...u, status: next, reservedFor: next === "Reserved" ? u.reservedFor : undefined, timeline: [...u.timeline, { at: nowIso(), by: actor, text: `Status changed to ${next}` }] }));
                    toast.success(`Unit ${unit.id} marked ${next}`);
                  }}
                />
              </div>
              <ConfirmDialog
                trigger={<Button variant="brand" className="w-full">Mark discarded</Button>}
                title={`Discard unit ${unit.id} (${unit.group} ${unit.component}, expires ${fmt(unit.expiresAt)})?`}
                description="The unit will be permanently removed from usable stock."
                destructive requireReason reasonLabel="Discard reason"
                confirmLabel="Discard unit"
                onConfirm={(reason) => {
                  updateUnit(unit.id, (u) => ({ ...u, status: "Discarded", discardReason: reason, reservedFor: undefined, timeline: [...u.timeline, { at: nowIso(), by: actor, text: `Discarded: ${reason}` }] }));
                  toast.success(`Unit ${unit.id} discarded`);
                }}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
