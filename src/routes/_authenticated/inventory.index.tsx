import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/bt/DataTable";
import { PageHeader, StatusBadge, EmptyState, fmt, fmtDate, expiresIn } from "@/components/bt/ui";
import { Filter, ALL } from "@/components/bt/Filter";
import { RoleGate } from "@/components/bt/AppShell";
import { useStore, displayStatus, hoursLeft } from "@/lib/store";
import { BLOOD_GROUPS, COMPONENTS, type Unit } from "@/lib/mock-data";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/inventory/")({
  head: () => seo("Inventory", "Blood unit inventory with filters by group, component, status and expiry window."),
  component: () => <RoleGate roles={["tech", "incharge"]}><InventoryPage /></RoleGate>,
});

const WINDOWS: Record<string, string> = { expired: "Expired", h24: "< 24 hours", h72: "< 72 hours", d7: "< 7 days" };

function InventoryPage() {
  const { units, settings } = useStore();
  const [group, setGroup] = useState(ALL);
  const [comp, setComp] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [win, setWin] = useState(ALL);
  const [q, setQ] = useState("");

  const rows = useMemo(() => units.filter((u) => {
    const h = hoursLeft(u);
    if (group !== ALL && u.group !== group) return false;
    if (comp !== ALL && u.component !== comp) return false;
    if (status !== ALL && displayStatus(u, settings) !== status) return false;
    if (win === "expired" && h > 0) return false;
    if (win === "h24" && (h <= 0 || h > 24)) return false;
    if (win === "h72" && (h <= 0 || h > 72)) return false;
    if (win === "d7" && (h <= 0 || h > 168)) return false;
    if (q && !u.id.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)), [units, group, comp, status, win, q, settings]);


  const columns: Column<Unit>[] = [
    { key: "id", header: "Unit no.", cell: (u) => <span className="font-medium">{u.id}</span>, primary: true },
    { key: "c", header: "Component", cell: (u) => u.component },
    { key: "g", header: "Group", cell: (u) => <span className="font-semibold">{u.group}</span> },
    { key: "v", header: "Volume", cell: (u) => `${u.volume} mL` },
    { key: "col", header: "Collected", cell: (u) => fmtDate(u.collectedAt) },
    { key: "exp", header: "Expiry", cell: (u) => <span>{fmt(u.expiresAt)}<span className="block text-xs text-muted-foreground">{expiresIn(hoursLeft(u))}</span></span> },
    { key: "loc", header: "Location", cell: (u) => u.location },
    { key: "s", header: "Status", cell: (u) => <span className="inline-flex gap-1"><StatusBadge label={displayStatus(u, settings)} />{u.prioritised && <StatusBadge label="Prioritised" />}</span> },
  ];
  const reset = () => { setGroup(ALL); setComp(ALL); setStatus(ALL); setWin(ALL); setQ(""); };

  return (
    <div>
      <PageHeader title="Inventory" description={`${rows.length} of ${units.length} units · sorted by earliest expiry`} />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(u) => u.id}
        rowLink={(u) => ({ to: "/inventory/$unitId", params: { unitId: u.id } })}
        filters={
          <>
            <Input placeholder="Search unit no." value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-full sm:w-48" maxLength={20} />
            <Filter value={group} onChange={setGroup} label="All groups" options={BLOOD_GROUPS.map((g) => [g, g])} />
            <Filter value={comp} onChange={setComp} label="All components" options={COMPONENTS.map((c) => [c, c])} />
            <Filter value={status} onChange={setStatus} label="All statuses" options={["Available", "Expiring", "Reserved", "Issued", "Expired", "Discarded"].map((s) => [s, s])} />
            <Filter value={win} onChange={setWin} label="Any expiry" options={Object.entries(WINDOWS)} />
            <Button variant="ghost" size="sm" onClick={reset}>Clear filters</Button>
          </>
        }
        empty={<EmptyState title="No units match these filters" description="Try widening the filters or clearing the search." action={<Button variant="outline" onClick={reset}>Clear filters</Button>} />}
      />
    </div>
  );
}

