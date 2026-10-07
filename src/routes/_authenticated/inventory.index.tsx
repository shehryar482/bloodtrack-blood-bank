import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/bt/DataTable";
import { PageHeader, StatusBadge, EmptyState, Field, fmt, fmtDate, expiresIn } from "@/components/bt/ui";
import { Filter, ALL } from "@/components/bt/Filter";
import { useUnits, useRefresh, displayStatus, hoursLeft, unitGroup, type UnitRow } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { ABO, BLOOD_GROUPS, COMPONENTS, RH } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/inventory/")({
  head: () => seo("Inventory", "Blood unit inventory with filters by group, component, status and expiry window."),
  component: InventoryPage,
});

const WINDOWS: Record<string, string> = { expired: "Expired", h24: "< 24 hours", h72: "< 72 hours", d7: "< 7 days" };

function InventoryPage() {
  const { data: units = [], isLoading, error } = useUnits();
  const [group, setGroup] = useState(ALL);
  const [comp, setComp] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [win, setWin] = useState(ALL);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => units.filter((u) => {
    const h = hoursLeft(u);
    if (group !== ALL && unitGroup(u) !== group) return false;
    if (comp !== ALL && u.component !== comp) return false;
    if (status !== ALL && displayStatus(u) !== status) return false;
    if (win === "expired" && h > 0) return false;
    if (win === "h24" && (h <= 0 || h > 24)) return false;
    if (win === "h72" && (h <= 0 || h > 72)) return false;
    if (win === "d7" && (h <= 0 || h > 168)) return false;
    if (q && !u.unit_number.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  }), [units, group, comp, status, win, q]);

  const columns: Column<UnitRow>[] = [
    { key: "id", header: "Unit no.", cell: (u) => <span className="font-medium">{u.unit_number}</span>, primary: true },
    { key: "c", header: "Component", cell: (u) => u.component },
    { key: "g", header: "Group", cell: (u) => <span className="font-semibold">{unitGroup(u)}</span> },
    { key: "v", header: "Volume", cell: (u) => (u.volume_ml ? `${u.volume_ml} mL` : "—") },
    { key: "col", header: "Collected", cell: (u) => fmtDate(u.collection_date) },
    { key: "exp", header: "Expiry", cell: (u) => <span>{fmt(u.expiry_at)}<span className="block text-xs text-muted-foreground">{expiresIn(hoursLeft(u))}</span></span> },
    { key: "loc", header: "Location", cell: (u) => u.storage_location ?? "—" },
    { key: "s", header: "Status", cell: (u) => <StatusBadge label={displayStatus(u)} /> },
  ];
  const reset = () => { setGroup(ALL); setComp(ALL); setStatus(ALL); setWin(ALL); setQ(""); };

  return (
    <div>
      <PageHeader
        title="Inventory"
        description={isLoading ? "Loading…" : `${rows.length} of ${units.length} units · sorted by earliest expiry`}
        actions={<Button variant="brand" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add unit</Button>}
      />
      {error ? <EmptyState title="Could not load units" description={error.message} /> : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(u) => u.id}
          rowLink={(u) => ({ to: "/inventory/$unitId", params: { unitId: u.id } })}
          filters={
            <>
              <Input placeholder="Search unit no." value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-full sm:w-48" maxLength={30} />
              <Filter value={group} onChange={setGroup} label="All groups" options={BLOOD_GROUPS.map((g) => [g, g])} />
              <Filter value={comp} onChange={setComp} label="All components" options={COMPONENTS.map((c) => [c, c])} />
              <Filter value={status} onChange={setStatus} label="All statuses" options={["Available", "Expiring", "Reserved", "Issued", "Expired", "Discarded"].map((s) => [s, s])} />
              <Filter value={win} onChange={setWin} label="Any expiry" options={Object.entries(WINDOWS)} />
              <Button variant="ghost" size="sm" onClick={reset}>Clear filters</Button>
            </>
          }
          empty={<EmptyState title={units.length ? "No units match these filters" : "No units yet"} description={units.length ? "Try widening the filters or clearing the search." : "Add your first unit."} action={units.length ? <Button variant="outline" onClick={reset}>Clear filters</Button> : <Button variant="outline" onClick={() => setAdding(true)}>Add unit</Button>} />}
        />
      )}
      <AddUnitDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}

const blank = { unit_number: "", component: "PRBC", abo_group: "", rh_d: "", volume_ml: "", collection_date: "", expiry_at: "", storage_location: "" };

function AddUnitDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const refresh = useRefresh();
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof blank) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  const save = async () => {
    const e: Record<string, string> = {};
    if (f.unit_number.trim().length < 3) e.unit_number = "Enter unit number";
    if (!f.abo_group) e.abo_group = "Select ABO";
    if (!f.rh_d) e.rh_d = "Select Rh";
    if (f.volume_ml && !(Number(f.volume_ml) > 0)) e.volume_ml = "Must be above 0";
    if (!f.collection_date) e.collection_date = "Select date";
    if (!f.expiry_at) e.expiry_at = "Select date and time";
    else if (f.collection_date && new Date(f.expiry_at) <= new Date(f.collection_date)) e.expiry_at = "Must be after collection";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const { error } = await supabase.from("blood_units").insert({
      unit_number: f.unit_number.trim(), component: f.component, abo_group: f.abo_group, rh_d: f.rh_d,
      volume_ml: f.volume_ml ? Number(f.volume_ml) : null, collection_date: f.collection_date,
      expiry_at: new Date(f.expiry_at).toISOString(), storage_location: f.storage_location.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "This unit number already exists" : error.message);
      return;
    }
    toast.success(`Unit ${f.unit_number.trim()} added`);
    setF(blank); onOpenChange(false); refresh();
  };

  const sel = (k: "component" | "abo_group" | "rh_d", opts: readonly string[]) => (
    <Select value={f[k]} onValueChange={set(k)}>
      <SelectTrigger aria-invalid={!!errors[k]}><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add blood unit</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Unit number" error={errors.unit_number} full><Input value={f.unit_number} onChange={(e) => set("unit_number")(e.target.value)} maxLength={30} /></Field>
          <Field label="Component">{sel("component", COMPONENTS)}</Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="ABO" error={errors.abo_group}>{sel("abo_group", ABO)}</Field>
            <Field label="Rh" error={errors.rh_d}>{sel("rh_d", RH)}</Field>
          </div>
          <Field label="Volume (mL)" error={errors.volume_ml}><Input type="number" min={1} value={f.volume_ml} onChange={(e) => set("volume_ml")(e.target.value)} /></Field>
          <Field label="Storage location"><Input value={f.storage_location} onChange={(e) => set("storage_location")(e.target.value)} maxLength={60} /></Field>
          <Field label="Collection date" error={errors.collection_date}><Input type="date" value={f.collection_date} onChange={(e) => set("collection_date")(e.target.value)} /></Field>
          <Field label="Expiry" error={errors.expiry_at}><Input type="datetime-local" value={f.expiry_at} onChange={(e) => set("expiry_at")(e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="brand" onClick={save} disabled={saving}>{saving ? "Saving..." : "Add unit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
