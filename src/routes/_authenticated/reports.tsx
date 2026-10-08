import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, StatCard } from "@/components/bt/ui";
import { useUnits, useRequests, useIssues, inStock, unitGroup } from "@/lib/db";
import { BLOOD_GROUPS, COMPONENTS, REQUEST_STATUSES } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => seo("Reports", "Live stock, discard, request and issue reports."),
  component: Reports,
});

function Chart({ title, data, dataKey = "value" }: { title: string; data: { name: string; value: number }[]; dataKey?: string }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey={dataKey} fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Reports() {
  const { data: units = [] } = useUnits();
  const { data: requests = [] } = useRequests();
  const { data: issues = [] } = useIssues();
  const stock = units.filter(inStock);
  const discarded = units.filter((u) => u.status === "Discarded" || u.status === "Expired");

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Live figures from your blood bank records." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Units in stock" value={stock.length} />
        <StatCard label="Requests (active)" value={requests.filter((r) => !r.is_archived).length} />
        <StatCard label="Units issued" value={issues.length} />
        <StatCard label="Discarded / expired" value={discarded.length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Chart title="Stock by blood group" data={BLOOD_GROUPS.map((g) => ({ name: g, value: stock.filter((u) => unitGroup(u) === g).length }))} />
        <Chart title="Stock by component" data={COMPONENTS.map((c) => ({ name: c, value: stock.filter((u) => u.component === c).length }))} />
        <Chart title="Discarded or expired by component" data={COMPONENTS.map((c) => ({ name: c, value: discarded.filter((u) => u.component === c).length }))} />
        <Chart title="Requests by status" data={REQUEST_STATUSES.map((s) => ({ name: s.replace("Crossmatch In Progress", "Crossmatch"), value: requests.filter((r) => r.status === s && !r.is_archived).length })).filter((d) => d.value > 0)} />
      </div>
    </div>
  );
}
