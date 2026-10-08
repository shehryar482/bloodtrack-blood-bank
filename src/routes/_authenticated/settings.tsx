import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/bt/ConfirmDialog";
import { RoleGate } from "@/components/bt/AppShell";
import { PageHeader, EmptyState } from "@/components/bt/ui";
import { useWards, useRefresh } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => seo("Settings", "Manage hospital wards."),
  component: () => <RoleGate roles={["incharge", "tech"]}><SettingsPage /></RoleGate>,
});

function SettingsPage() {
  const { data: wards = [], isLoading } = useWards();
  const refresh = useRefresh();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [ext, setExt] = useState("");

  const add = async () => {
    if (name.trim().length < 2) { toast.error("Enter a ward name"); return; }
    const { error } = await supabase.from("wards").insert({ ward_name: name.trim(), ward_code: code.trim() || null, extension_no: ext.trim() || null });
    if (error) { toast.error(error.code === "23505" ? "This ward already exists" : error.message); return; }
    toast.success("Ward added"); setName(""); setCode(""); setExt(""); refresh();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("wards").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Ward removed"); refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Wards used on blood requests." />
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Wards</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          <Input placeholder="Ward name" value={name} onChange={(e) => setName(e.target.value)} className="w-full sm:w-56" maxLength={60} />
          <Input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} className="w-28" maxLength={10} />
          <Input placeholder="Extension" value={ext} onChange={(e) => setExt(e.target.value)} className="w-28" maxLength={10} />
          <Button variant="brand" onClick={add}><Plus className="h-4 w-4" /> Add ward</Button>
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : wards.length === 0 ? <EmptyState title="No wards yet" /> : (
          <div className="divide-y">
            {wards.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span><span className="font-medium">{w.ward_name}</span><span className="text-muted-foreground">{w.ward_code && ` · ${w.ward_code}`}{w.extension_no && ` · ext ${w.extension_no}`}</span></span>
                <ConfirmDialog trigger={<Button size="icon" variant="ghost" aria-label="Remove ward"><Trash2 className="h-4 w-4" /></Button>}
                  title={`Remove ward ${w.ward_name}?`} description="Existing requests keep their record but lose the ward link." destructive confirmLabel="Remove" onConfirm={() => remove(w.id)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
