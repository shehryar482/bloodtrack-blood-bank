import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/bt/ConfirmDialog";
import { RoleGate } from "@/components/bt/AppShell";
import { PageHeader, StatusBadge, EmptyState, fmt, expiresIn } from "@/components/bt/ui";
import { useStore, hoursLeft, nowIso } from "@/lib/store";
import type { Unit } from "@/lib/mock-data";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/expiry")({
  head: () => seo("Expiry alerts", "Blood units that are expired or expiring within 24 hours, 72 hours or 7 days."),
  component: () => <RoleGate roles={["tech", "incharge"]}><Expiry /></RoleGate>,
});

function Expiry() {
  const { units, updateUnit, user, actor } = useStore();
  const live = units.filter((u) => u.status === "Available" || u.status === "Reserved").sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  const sections: [string, Unit[]][] = [
    ["Expired", live.filter((u) => hoursLeft(u) <= 0)],
    ["Within 24 hours", live.filter((u) => hoursLeft(u) > 0 && hoursLeft(u) <= 24)],
    ["Within 72 hours", live.filter((u) => hoursLeft(u) > 24 && hoursLeft(u) <= 72)],
    ["Within 7 days", live.filter((u) => hoursLeft(u) > 72 && hoursLeft(u) <= 168)],
  ];

  return (
    <div>
      <PageHeader title="Expiry alerts" description="Alert windows: 72 h for red cells, FFP and Cryo; 24 h for platelets. Prioritise units for issue or discard expired stock." />
      <div className="space-y-8">
        {sections.map(([title, list]) => (
          <section key={title}>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">{title} <StatusBadge label={String(list.length)} tone={title === "Expired" ? "neutral" : "warning"} /></h2>
            {list.length === 0 ? <EmptyState title={`No units ${title.toLowerCase()}`} action={<Button asChild variant="outline" size="sm"><Link to="/inventory">Browse inventory</Link></Button>} /> : (
              <div className="divide-y rounded-xl border bg-card shadow-sm">
                {list.map((u) => {
                  const expired = hoursLeft(u) <= 0;
                  return (
                    <div key={u.id} className="flex flex-wrap items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <Link to="/inventory/$unitId" params={{ unitId: u.id }} className="text-sm font-medium hover:underline">{u.id}</Link>
                        <span className="text-sm text-muted-foreground"> · {u.group} {u.component} · {u.location}</span>
                        <div className="text-xs text-muted-foreground">Expiry {fmt(u.expiresAt)}{!expired && ` · ${expiresIn(hoursLeft(u))}`}</div>
                      </div>
                      <StatusBadge label={expired ? "Expired" : u.status === "Reserved" ? "Reserved" : "Expiring"} />
                      {u.prioritised && <StatusBadge label="Prioritised" />}
                      {!expired && (
                        <ConfirmDialog
                          trigger={<Button size="sm" variant="outline">{u.prioritised ? <><PinOff className="h-4 w-4" /> Unpin</> : <><Pin className="h-4 w-4" /> Prioritise</>}</Button>}
                          title={u.prioritised ? `Remove priority from unit ${u.id} (${u.group} ${u.component}, expires ${fmt(u.expiresAt)})?` : `Prioritise unit ${u.id} (${u.group} ${u.component}, expires ${fmt(u.expiresAt)})?`}
                          description="Prioritised units are pinned to the top of the unit list on the Issue page."
                          onConfirm={() => {
                            updateUnit(u.id, (x) => ({ ...x, prioritised: !x.prioritised, timeline: [...x.timeline, { at: nowIso(), by: actor, text: x.prioritised ? "Priority removed" : "Prioritised for issue" }] }));
                            toast.success(u.prioritised ? "Priority removed" : `${u.id} pinned to top of issue suggestions`);
                          }}
                        />
                      )}
                      <ConfirmDialog
                        trigger={<Button size="sm" variant={expired ? "brand" : "ghost"}>Mark discarded</Button>}
                        title={`Discard unit ${u.id} (${u.group} ${u.component}, ${expired ? "expired" : "expires"} ${fmt(u.expiresAt)})?`} destructive requireReason reasonLabel="Discard reason" confirmLabel="Discard"
                        onConfirm={(reason) => {
                          updateUnit(u.id, (x) => ({ ...x, status: "Discarded", discardReason: reason, reservedFor: undefined, timeline: [...x.timeline, { at: nowIso(), by: actor, text: `Discarded: ${reason}` }] }));
                          toast.success(`${u.id} discarded`);
                        }}
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
