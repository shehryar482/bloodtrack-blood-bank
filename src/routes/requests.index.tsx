import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, ALL } from "@/components/bt/Filter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/bt/DataTable";
import { PageHeader, StatusBadge, EmptyState, fmt } from "@/components/bt/ui";
import { useStore, ACTIVE_STATUSES, isReady, sortRequests } from "@/lib/store";
import type { BloodRequest } from "@/lib/mock-data";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/requests/")({
  head: () => seo("Blood requests", "Active, ready, issued and cancelled blood requests sorted by urgency."),
  component: RequestsPage,
});

type Tab = "active" | "ready" | "issued" | "cancelled";
const match: Record<Tab, (r: BloodRequest) => boolean> = {
  active: (r) => ACTIVE_STATUSES.includes(r.status) && !isReady(r),
  ready: (r) => !!isReady(r),
  issued: (r) => r.status === "Issued",
  cancelled: (r) => r.status === "Cancelled" || r.status === "Rejected",
};

function RequestsPage() {
  const { role, ward, requests } = useStore();
  const [tab, setTab] = useState<Tab>("active");
  const scoped = role === "ward" ? requests.filter((r) => r.ward === ward) : requests;
  const [q, setQ] = useState("");
  const [urg, setUrg] = useState(ALL);
  const filtered = q.trim() !== "" || urg !== ALL;
  const clear = () => { setQ(""); setUrg(ALL); };
  const needle = q.trim().toLowerCase();
  const rows = scoped.filter(match[tab]).filter((r) =>
    (urg === ALL || r.urgency === urg) &&
    (!needle || [r.id, r.patient.name, r.patient.mrNo].some((v) => v.toLowerCase().includes(needle))),
  ).sort(sortRequests);

  const columns: Column<BloodRequest>[] = [
    { key: "id", header: "Request", cell: (r) => <span><span className="font-medium">{r.id}</span>{r.uncrossmatched && <span className="ml-2 text-xs text-brand">Uncrossmatched</span>}</span>, primary: true },
    { key: "p", header: "Patient", cell: (r) => <span>{r.patient.name}<span className="block text-xs text-muted-foreground">{r.patient.mrNo}</span></span> },
    { key: "w", header: "Ward", cell: (r) => r.ward },
    { key: "i", header: "Components", cell: (r) => r.items.map((i) => `${i.units}× ${i.component}`).join(", ") },
    { key: "u", header: "Urgency", cell: (r) => <StatusBadge label={r.urgency} /> },
    { key: "rb", header: "Required by", cell: (r) => fmt(r.requiredBy) },
    { key: "s", header: "Status", cell: (r) => <StatusBadge label={r.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title={role === "ward" ? "My Requests" : "Requests"}
        description={role === "ward" ? `Requests from ${ward}` : "All wards · Emergency first, then Urgent, Routine, by required-by time"}
        actions={role === "ward" ? <Button asChild variant="brand"><Link to="/requests/new">New request</Link></Button> : undefined}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList className="flex-wrap">
          {(["active", "ready", "issued", "cancelled"] as Tab[]).map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">{t} ({scoped.filter(match[t]).length})</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        rowLink={(r) => ({ to: "/requests/$requestId", params: { requestId: r.id } })}
        filters={
          <>
            <Input placeholder="Search ID, patient or MR no." value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-full sm:w-64" maxLength={40} />
            <Filter value={urg} onChange={setUrg} label="All urgencies" options={["Emergency", "Urgent", "Routine"].map((u) => [u, u])} />
            <Button variant="ghost" size="sm" onClick={clear} disabled={!filtered}>Clear filters</Button>
          </>
        }
        empty={filtered ? <EmptyState title="No requests match these filters" description="Try a different search or urgency." action={<Button variant="outline" onClick={clear}>Clear filters</Button>} /> : <EmptyState title={`No ${tab} requests`} description="Requests will appear here as their status changes."
          action={role === "ward" ? <Button asChild variant="outline"><Link to="/requests/new">Create a request</Link></Button> : <Button variant="outline" onClick={() => setTab("active")}>View active</Button>} />}
      />
    </div>
  );
}
