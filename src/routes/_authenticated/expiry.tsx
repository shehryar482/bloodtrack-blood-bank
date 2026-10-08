import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/bt/ConfirmDialog";
import { PageHeader, StatusBadge, EmptyState, fmt, expiresIn } from "@/components/bt/ui";
import { useUnits, useRefresh, hoursLeft, unitGroup, type UnitRow } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/expiry")({
  head: () => seo("Expiry alerts", "Blood units that are expired or expiring within 24 hours, 72 hours or 7 days."),
  component: Expiry,
});

function Expiry() {
  const { data: units = [], isLoading } = useUnits();
  const refresh = useRefresh();
  const live = units.filter((u) => u.status === "Available" || u.status === "Reserved" || u.status === "Expired");
  const sections: [string, UnitRow[]][] = [
    ["Expired", live.filter((u) => hoursLeft(u) <= 0 || u.status === "Expired")],
    ["Within 24 hours", live.filter((u) => u.status !== "Expired" && hoursLeft(u) > 0 && hoursLeft(u) <= 24)],
    ["Within 72 hours", live.filter((u) => u.status !== "Expired" && hoursLeft(u) > 24 && hoursLeft(u) <= 72)],
    ["Within 7 days", live.filter((u) => u.status !== "Expired" && hoursLeft(u) > 72 && hoursLeft(u) <= 168)],
  ];

  const discard = async (u: UnitRow, reason: string) => {
    const { error } = await supabase.from("blood_units").update({ status: "Discarded", discard_reason: reason }).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${u.unit_number} discarded`); refresh();
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div>
      <PageHeader title="Expiry alerts" description="Alert windows: 72 h for red cells, FFP and Cryo; 24 h for platelets." />
      <div className="space-y-8">
        {sections.map(([title, list]) => (
          <section key={title}>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">{title} <StatusBadge label={String(list.length)} tone={title === "Expired" ? "neutral" : "warning"} /></h2>
            {list.length === 0 ? <EmptyState title={`No units ${title.toLowerCase()}`} action={<Button asChild variant="outline" size="sm"><Link to="/inventory">Browse inventory</Link></Button>} /> : (
              <div className="divide-y rounded-xl border bg-card shadow-sm">
                {list.map((u) => {
                  const expired = hoursLeft(u) <= 0 || u.status === "Expired";
                  return (
                    <div key={u.id} className="flex flex-wrap items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <Link to="/inventory/$unitId" params={{ unitId: u.id }} className="text-sm font-medium hover:underline">{u.unit_number}</Link>
                        <span className="text-sm text-muted-foreground"> · {unitGroup(u)} {u.component}{u.storage_location && ` · ${u.storage_location}`}</span>
                        <div className="text-xs text-muted-foreground">Expiry {fmt(u.expiry_at)}{!expired && ` · ${expiresIn(hoursLeft(u))}`}</div>
                      </div>
                      <StatusBadge label={expired ? "Expired" : u.status === "Reserved" ? "Reserved" : "Expiring"} />
                      <ConfirmDialog
                        trigger={<Button size="sm" variant={expired ? "brand" : "ghost"}>Mark discarded</Button>}
                        title={`Discard unit ${u.unit_number} (${unitGroup(u)} ${u.component})?`} destructive requireReason reasonLabel="Discard reason" confirmLabel="Discard"
                        onConfirm={(reason) => discard(u, reason)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
