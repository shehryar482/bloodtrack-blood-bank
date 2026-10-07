import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertOctagon, Clock, ClipboardList, Database, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard, StatusBadge, EmptyState, fmt, expiresIn } from "@/components/bt/ui";
import { StockGrid } from "@/components/bt/StockGrid";
import { useUnits, useRequests, usePatients, useWards, useRefresh, inStock, hoursLeft, isExpiring, sortRequests, unitGroup, loadSampleData } from "@/lib/db";
import { CLOSED_STATUSES } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => seo("Dashboard", "Live blood stock by group and component, pending requests and expiry alerts."),
  component: Dashboard,
});

function Dashboard() {
  const units = useUnits();
  const requests = useRequests();
  const patients = usePatients();
  const wards = useWards();
  const refresh = useRefresh();
  const [seeding, setSeeding] = useState(false);

  if (units.isLoading || requests.isLoading || patients.isLoading || wards.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  const err = units.error || requests.error || patients.error || wards.error;
  if (err) return <EmptyState title="Could not load data" description={err.message} />;

  const u = units.data ?? [];
  const r = (requests.data ?? []).filter((x) => !x.is_archived);
  const isEmpty = u.length === 0 && r.length === 0 && (patients.data ?? []).length === 0 && (wards.data ?? []).length === 0;

  const seed = async () => {
    setSeeding(true);
    try {
      await loadSampleData();
      await refresh();
      toast.success("Sample data loaded", { description: "8 wards, 6 patients and 20 blood units added." });
    } catch (e) {
      toast.error("Could not load sample data", { description: (e as Error).message });
    } finally { setSeeding(false); }
  };

  const pending = r.filter((x) => !CLOSED_STATUSES.includes(x.status)).sort(sortRequests);
  const emergencies = pending.filter((x) => x.urgency === "Emergency");
  const expiring = u.filter(isExpiring).sort((a, b) => a.expiry_at.localeCompare(b.expiry_at));
  const total = u.filter(inStock).length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Stock status as of ${fmt(new Date().toISOString())}`}
        actions={<Button asChild variant="brand"><Link to="/requests/new">New request</Link></Button>}
      />
      {isEmpty && (
        <div className="mb-6">
          <EmptyState
            title="No data yet"
            description="Add your own wards, patients and units, or load fictional sample data to try the app."
            action={<Button variant="brand" onClick={seed} disabled={seeding}><Database className="h-4 w-4" />{seeding ? "Loading sample data..." : "Load sample data"}</Button>}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Units available" value={total} icon={<Droplet className="h-4 w-4" />} to="/inventory" />
        <StatCard label="Pending requests" value={pending.length} icon={<ClipboardList className="h-4 w-4" />} to="/requests" />
        <StatCard label="Emergencies" value={emergencies.length} tone={emergencies.length ? "brand" : undefined} icon={<AlertOctagon className="h-4 w-4" />} to="/requests" />
        <StatCard label="Expiring soon" value={expiring.length} tone={expiring.length ? "warning" : undefined} icon={<Clock className="h-4 w-4" />} to="/expiry" />
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Available units by group and component</h2>
      <StockGrid units={u} />
      <p className="mt-2 text-xs text-muted-foreground">Amber tiles are at or below the minimum stock level. Only available, unexpired units are counted.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">Pending and emergency requests</h2>
          {pending.length === 0 ? (
            <EmptyState title="No open requests" action={<Button asChild variant="outline"><Link to="/requests/new">Create a request</Link></Button>} />
          ) : (
            <div className="divide-y rounded-xl border bg-card shadow-sm">
              {pending.slice(0, 8).map((x) => (
                <Link key={x.id} to="/requests/$requestId" params={{ requestId: x.id }} className="flex items-center justify-between gap-3 p-3 hover:bg-secondary/50">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{x.patients?.full_name ?? "Unknown"} <span className="text-muted-foreground">· {x.request_code}</span></div>
                    <div className="text-xs text-muted-foreground">{x.wards?.ward_name ?? "No ward"}{x.required_by && ` · by ${fmt(x.required_by)}`}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1"><StatusBadge label={x.urgency} /><StatusBadge label={x.status} /></div>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Units expiring soon <span className="text-xs font-normal text-muted-foreground">(72 h, platelets 24 h)</span></h2>
          {expiring.length === 0 ? <EmptyState title="Nothing expiring soon" /> : (
            <div className="divide-y rounded-xl border bg-card shadow-sm">
              {expiring.map((x) => (
                <Link key={x.id} to="/inventory/$unitId" params={{ unitId: x.id }} className="flex items-center justify-between gap-3 p-3 hover:bg-secondary/50">
                  <div className="text-sm"><span className="font-medium">{x.unit_number}</span> <span className="text-muted-foreground">· {unitGroup(x)} {x.component}</span></div>
                  <StatusBadge label={expiresIn(hoursLeft(x))} tone="warning" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
