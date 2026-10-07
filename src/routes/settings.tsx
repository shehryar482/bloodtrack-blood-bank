import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/bt/ConfirmDialog";
import { RoleGate } from "@/components/bt/AppShell";
import { PageHeader, StatusBadge, EmptyState } from "@/components/bt/ui";
import { useStore } from "@/lib/store";
import { COMPONENTS, ROLE_LABEL, type Role, type StaffUser } from "@/lib/mock-data";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/settings")({
  head: () => seo("Settings", "Manage users, wards, minimum stock levels and expiry alert windows."),
  component: () => <RoleGate roles={["incharge"]}><SettingsPage /></RoleGate>,
});

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border bg-card p-5 shadow-sm"><h2 className="mb-4 font-semibold">{title}</h2>{children}</section>;
}

function SettingsPage() {
  const { users, setUsers, settings, setSettings } = useStore();
  const [edit, setEdit] = useState<StaffUser | null>(null);
  const [newWard, setNewWard] = useState("");
  const [min, setMin] = useState(settings.minStock);
  const [rc, setRc] = useState(String(settings.redCellWindowH));
  const [pl, setPl] = useState(String(settings.plateletWindowH));

  const saveUser = () => {
    if (!edit || edit.name.trim().length < 3) { toast.error("Name must be at least 3 characters"); return; }
    setUsers(users.some((u) => u.id === edit.id) ? users.map((u) => (u.id === edit.id ? { ...edit, name: edit.name.trim() } : u)) : [...users, { ...edit, name: edit.name.trim() }]);
    toast.success("User saved"); setEdit(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Changes are kept in memory only and reset on refresh." />
      <Card title="Users">
        <div className="mb-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setEdit({ id: `u${Date.now()}`, name: "", role: "ward", ward: settings.wards[0], active: true })}><Plus className="h-4 w-4" /> Add user</Button>
        </div>
        {edit && (
          <div className="mb-4 grid gap-2 rounded-lg border p-3 sm:grid-cols-4">
            <Input placeholder="Full name" value={edit.name} maxLength={80} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <Select value={edit.role} onValueChange={(v) => setEdit({ ...edit, role: v as Role })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
            </Select>
            {edit.role === "ward" ? (
              <Select value={edit.ward} onValueChange={(v) => setEdit({ ...edit, ward: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{settings.wards.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
              </Select>
            ) : <div />}
            <div className="flex gap-2"><Button size="sm" onClick={saveUser}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>
          </div>
        )}
        {users.length === 0 ? <EmptyState title="No users" /> : (
          <ul className="divide-y">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{ROLE_LABEL[u.role]}{u.ward ? ` · ${u.ward}` : ""}</div>
                </div>
                <StatusBadge label={u.active ? "Active" : "Inactive"} />
                <Button size="sm" variant="ghost" onClick={() => setEdit(u)}>Edit</Button>
                <ConfirmDialog trigger={<Button size="sm" variant="outline">{u.active ? "Deactivate" : "Activate"}</Button>} title={`${u.active ? "Deactivate" : "Activate"} ${u.name}?`}
                  onConfirm={() => { setUsers(users.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x))); toast.success("User updated"); }} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Wards">
          <div className="flex flex-wrap gap-2">{settings.wards.map((w) => <span key={w} className="rounded-full border bg-secondary px-3 py-1 text-xs">{w}</span>)}</div>
          <div className="mt-4 flex gap-2">
            <Input placeholder="New ward name" value={newWard} maxLength={60} onChange={(e) => setNewWard(e.target.value)} />
            <Button variant="outline" onClick={() => {
              const w = newWard.trim();
              if (w.length < 2 || settings.wards.includes(w)) { toast.error("Enter a new, unique ward name"); return; }
              setSettings({ ...settings, wards: [...settings.wards, w] }); setNewWard(""); toast.success("Ward added");
            }}>Add</Button>
          </div>
        </Card>

        <Card title="Alert windows">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm"><span className="font-medium">Red cells, FFP and Cryo (hours)</span><Input type="number" min={1} max={720} value={rc} onChange={(e) => setRc(e.target.value)} /></label>
            <label className="space-y-1.5 text-sm"><span className="font-medium">Platelets (hours)</span><Input type="number" min={1} max={120} value={pl} onChange={(e) => setPl(e.target.value)} /></label>
          </div>
          <ConfirmDialog trigger={<Button className="mt-4" size="sm">Save windows</Button>} title="Save alert windows?"
            onConfirm={() => {
              const a = Number(rc), b = Number(pl);
              if (!(a >= 1 && a <= 720 && b >= 1 && b <= 120)) { toast.error("Enter valid hours"); return; }
              setSettings({ ...settings, redCellWindowH: a, plateletWindowH: b }); toast.success("Alert windows saved");
            }} />
        </Card>
      </div>

      <Card title="Minimum stock levels (per group)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {COMPONENTS.map((c) => (
            <label key={c} className="space-y-1.5 text-sm"><span className="font-medium">{c}</span>
              <Input type="number" min={0} max={50} value={min[c]} onChange={(e) => setMin({ ...min, [c]: Math.max(0, Math.min(50, Number(e.target.value))) })} />
            </label>
          ))}
        </div>
        <ConfirmDialog trigger={<Button className="mt-4" size="sm">Save minimum levels</Button>} title="Save minimum stock levels?"
          onConfirm={() => { setSettings({ ...settings, minStock: min }); toast.success("Minimum levels saved"); }} />
      </Card>
    </div>
  );
}
