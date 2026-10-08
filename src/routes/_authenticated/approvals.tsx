import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/bt/ConfirmDialog";
import { RoleGate } from "@/components/bt/AppShell";
import { PageHeader, StatusBadge, EmptyState } from "@/components/bt/ui";
import { useStore } from "@/lib/store";
import { useRequests, useRefresh } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => seo("Emergency approvals", "Approve or reject uncrossmatched emergency blood release requests."),
  component: () => <RoleGate roles={["incharge", "tech"]}><Approvals /></RoleGate>,
});

function Approvals() {
  const { role, actor } = useStore();
  const { data = [], isLoading } = useRequests();
  const refresh = useRefresh();
  const pending = data.filter((r) => !r.is_archived && r.status === "Pending Approval");

  const decide = async (id: string, patch: Record<string, unknown>, msg: string) => {
    const { error } = await supabase.from("blood_requests").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(msg); refresh();
  };

  return (
    <div>
      <PageHeader title="Approvals" description="Emergency uncrossmatched release requests awaiting In-charge approval." />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : pending.length === 0 ? (
        <EmptyState title="No approvals pending" description="Emergency release requests will appear here." action={<Button asChild variant="outline"><Link to="/requests">View all requests</Link></Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pending.map((r) => {
            const mins = Math.max(0, Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000));
            const items = r.request_items.map((i) => `${i.quantity_requested}× ${i.component}`).join(", ");
            return (
              <article key={r.id} className="rounded-xl border border-brand/30 bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to="/requests/$requestId" params={{ requestId: r.id }} className="font-semibold hover:underline">{r.request_code}</Link>
                    <p className="text-sm">{r.patients?.full_name} · {r.wards?.ward_name ?? "No ward"}</p>
                  </div>
                  <StatusBadge label={r.status} />
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div><dt className="inline text-muted-foreground">Indication: </dt><dd className="inline">{r.indication}</dd></div>
                  <div><dt className="inline text-muted-foreground">Doctor: </dt><dd className="inline">{r.requesting_doctor}</dd></div>
                  <div><dt className="inline text-muted-foreground">Items: </dt><dd className="inline">{items || "—"}</dd></div>
                  <div className="font-medium text-brand">Waiting {mins} min</div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ConfirmDialog trigger={<Button variant="brand" size="sm">{role === "incharge" ? "Approve" : "Log verbal approval"}</Button>}
                    title={`Approve uncrossmatched release for ${r.patients?.full_name} (${r.request_code})?`} description="O-negative PRBC may be issued uncrossmatched."
                    onConfirm={() => decide(r.id, { status: "Approved", approved_by: actor, approval_mode: role === "incharge" ? "In app" : "Verbal", approved_at: new Date().toISOString() }, `${r.request_code} approved`)} />
                  {role === "incharge" && (
                    <ConfirmDialog trigger={<Button variant="outline" size="sm">Reject</Button>} title={`Reject ${r.request_code}?`} destructive confirmLabel="Reject"
                      onConfirm={() => decide(r.id, { status: "Rejected" }, `${r.request_code} rejected`)} />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
