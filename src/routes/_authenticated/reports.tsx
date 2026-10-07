import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleGate } from "@/components/bt/AppShell";
import { PageHeader } from "@/components/bt/ui";
import { useStore, inStock } from "@/lib/store";
import { BLOOD_GROUPS, COMPONENTS, MONTHS, MONTH_LABEL, EXPIRED_BY_MONTH, CT_BY_MONTH } from "@/lib/mock-data";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => seo("Reports", "Stock by blood group, expired units by component and C/T ratio by ward."),
  component: () => <RoleGate roles={["tech", "incharge"]}><Reports /></RoleGate>,
});

function Chart({ title, data, x, y, color, note }: { title: string; data: object[]; x: string; y: string; color: string; note?: string }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey={x} tick={{ fontSize: 11 }} interval={0} angle={data.length > 6 ? -30 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 70 : 30} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals />
            <Tooltip />
            <Bar dataKey={y} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Reports() {
  const { units } = useStore();
  const [month, setMonth] = useState("2026-10");
  const stock = BLOOD_GROUPS.map((g) => ({ group: g, units: units.filter((u) => u.group === g && inStock(u)).length }));
  const expired = COMPONENTS.map((c) => ({ component: c, units: EXPIRED_BY_MONTH[month][c] }));
  const ct = Object.entries(CT_BY_MONTH[month]).map(([ward, [x, t]]) => ({ ward, ratio: Math.round((x / t) * 10) / 10 }));

  return (
    <div>
      <PageHeader title="Reports" description="Fictional figures for demonstration."
        actions={
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{MONTH_LABEL[m]}</SelectItem>)}</SelectContent>
          </Select>
        } />
      <div className="grid gap-6 lg:grid-cols-2">
        <Chart title="Current stock by blood group" note="Live, available unexpired units" data={stock} x="group" y="units" color="var(--brand)" />
        <Chart title={`Expired in ${MONTH_LABEL[month]} by component`} data={expired} x="component" y="units" color="var(--neutral)" />
        <div className="lg:col-span-2">
          <Chart title={`Crossmatch / transfusion (C/T) ratio by ward · ${MONTH_LABEL[month]}`} note="Target ≤ 2.0" data={ct} x="ward" y="ratio" color="var(--info)" />
        </div>
      </div>
    </div>
  );
}
