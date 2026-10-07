import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/bt/DataTable";
import { PageHeader, StatusBadge, EmptyState, fmt } from "@/components/bt/ui";
import { Filter, ALL } from "@/components/bt/Filter";
import { useRequests, sortRequests, type RequestListRow } from "@/lib/db";
import { REQUEST_STATUSES, URGENCIES } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/requests/")({
  head: () => seo("Requests", "Blood requests by status with search and urgency filter."),
  component: RequestsPage,
});

function RequestsPage() {
  const { data = [], isLoading, error } = useRequests();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [urg, setUrg] = useState(ALL);
  const [archived, setArchived] = useState(false);

  const base = useMemo(() => data.filter((r) => r.is_archived === archived), [data, archived]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return base.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (urg !== ALL && r.urgency !== urg) return false;
      if (s && !r.request_code.toLowerCase().includes(s) && !(r.patients?.mr_number ?? "").toLowerCase().includes(s)) return false;
      return true;
    }).sort(sortRequests);
  }, [base, tab, q, urg]);

  const tabs = REQUEST_STATUSES.filter((s) => base.some((r) => r.status === s));

  const columns: Column<RequestListRow>[] = [
    { key: "id", header: "Request", cell: (r) => <span className="font-medium">{r.request_code}</span>, primary: true },
    { key: "p", header: "Patient", cell: (r) => <span>{r.patients?.full_name ?? "—"}<span className="block text-xs text-muted-foreground">{r.patients?.mr_number}</span></span> },
    { key: "w", header: "Ward", cell: (r) => r.wards?.ward_name ?? "—" },
    { key: "i", header: "Items", cell: (r) => r.request_items.map((i) => `${i.quantity_requested}× ${i.component}`).join(", ") || "—" },
    { key: "u", header: "Urgency", cell: (r) => <StatusBadge label={r.urgency} /> },
    { key: "rb", header: "Required by", cell: (r) => (r.required_by ? fmt(r.required_by) : "—") },
    { key: "s", header: "Status", cell: (r) => <span className="inline-flex gap-1"><StatusBadge label={r.status} />{r.is_archived && <StatusBadge label="Archived" />}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Requests"
        description={isLoading ? "Loading…" : `${rows.length} of ${base.length} ${archived ? "archived" : "active"} requests`}
        actions={<Button asChild variant="brand"><Link to="/requests/new">New request</Link></Button>}
      />
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="all">All ({base.length})</TabsTrigger>
          {tabs.map((s) => <TabsTrigger key={s} value={s}>{s} ({base.filter((r) => r.status === s).length})</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {error ? <EmptyState title="Could not load requests" description={error.message} /> : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          rowLink={(r) => ({ to: "/requests/$requestId", params: { requestId: r.id } })}
          filters={
            <>
              <Input placeholder="Search MR no. or request code" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-full sm:w-64" maxLength={40} />
              <Filter value={urg} onChange={setUrg} label="All urgencies" options={URGENCIES.map((u) => [u, u])} />
              <label className="flex items-center gap-2 px-2 text-sm"><Switch checked={archived} onCheckedChange={(v) => { setArchived(v); setTab("all"); }} /> Show archived</label>
            </>
          }
          empty={<EmptyState title={base.length ? "No requests match" : archived ? "No archived requests" : "No requests yet"} action={<Button asChild variant="outline"><Link to="/requests/new">Create a request</Link></Button>} />}
        />
      )}
    </div>
  );
}
