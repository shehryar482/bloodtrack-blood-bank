import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertOctagon, Clock, ClipboardList, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard, StatusBadge, EmptyState, fmt, expiresIn } from "@/components/bt/ui";
import { useStore, inStock, hoursLeft, isExpiring, ACTIVE_STATUSES, sortRequests } from "@/lib/store";
import { BLOOD_GROUPS, COMPONENTS } from "@/lib/mock-data";
import { StockGrid } from "@/components/bt/StockGrid";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => seo("Dashboard", "Live blood stock by group and component, pending requests and expiry alerts."),
  component: Dashboard,
});

function Dashboard() {
  const { role, ward, units, requests, settings } = useStore();
  const scoped = role === "ward" ? requests.filter((r) => r.ward === ward) : requests;
  const active = scoped.filter((r) => ACTIVE_STATUSES.includes(r.status) || r.status === "Ready for Issue").sort(sortRequests);
  const emergencies = scoped.filter((r) => r.urgency === "Emergency" && !["Issued", "Cancelled", "Rejected"].includes(r.status));
  const expiring = units.filter((u) => isExpiring(u, settings));
  const total = units.filter(inStock).length;
  const lowCount = BLOOD_GROUPS.flatMap((g) => COMPONENTS.map((c) => units.filter((u) => u.group === g && u.component === c && inStock(u)).length <= settings.minStock[c])).filter(Boolean).length;

  return (
    <div>
      <PageHeader
        title={role === "ward" ? `Dashboard · ${ward}` : "Dashboard"}
        description="Stock status as of 02 Oct 2026, 12:00"
        actions={role === "ward" ? <Button asChild variant="brand"><Link to="/requests/new">New request</Link></Button> : undefined}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Units in stock" value={total} icon={<Droplet className="h-4 w-4" />} hint={`${lowCount} group/component combos low`} to={role === "ward" ? undefined : "/inventory"} />
        <StatCard label={role === "ward" ? "My open requests" : "Pending requests"} value={active.length} icon={<ClipboardList className="h-4 w-4" />} to="/requests" />
        <StatCard label="Emergencies" value={emergencies.length} tone={emergencies.length ? "brand" : undefined} icon={<AlertOctagon className="h-4 w-4" />} to="/requests" />
        {role === "ward"
          ? <StatCard label="Ready to collect" value={scoped.filter((r) => r.status === "Ready for Issue").length} icon={<Clock className="h-4 w-4" />} />
          : <StatCard label="Expiring soon" value={expiring.length} tone={expiring.length ? "warning" : undefined} icon={<Clock className="h-4 w-4" />} to="/expiry" />}
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Stock by group and component</h2>
      <StockGrid />
      <p className="mt-2 text-xs text-muted-foreground">Amber tiles are at or below the minimum stock level. Only available, unexpired units are counted.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">{role === "ward" ? "My requests" : "Pending requests"}</h2>
          {active.length === 0 ? (
            <EmptyState title="No open requests" action={role === "ward" ? <Button asChild variant="outline"><Link to="/requests/new">Create a request</Link></Button> : undefined} />
          ) : (
            <div className="divide-y rounded-xl border bg-card shadow-sm">
              {active.slice(0, 6).map((r) => (
                <Link key={r.id} to="/requests/$requestId" params={{ requestId: r.id }} className="flex items-center justify-between gap-3 p-3 hover:bg-secondary/50">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.patient.name} <span className="text-muted-foreground">· {r.id}</span></div>
                    <div className="text-xs text-muted-foreground">{r.ward} · by {fmt(r.requiredBy)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1"><StatusBadge label={r.urgency} /><StatusBadge label={r.status} /></div>
                </Link>
              ))}
            </div>
          )}
        </section>
        {role !== "ward" && (
          <section>
            <h2 className="mb-3 font-semibold">Units expiring soon</h2>
            {expiring.length === 0 ? <EmptyState title="Nothing expiring soon" /> : (
              <div className="divide-y rounded-xl border bg-card shadow-sm">
                {expiring.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)).map((u) => (
                  <Link key={u.id} to="/inventory/$unitId" params={{ unitId: u.id }} className="flex items-center justify-between gap-3 p-3 hover:bg-secondary/50">
                    <div className="text-sm"><span className="font-medium">{u.id}</span> <span className="text-muted-foreground">· {u.group} {u.component}</span></div>
                    <StatusBadge label={expiresIn(hoursLeft(u))} tone="warning" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
