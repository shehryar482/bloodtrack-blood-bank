import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/bt/ConfirmDialog";
import { RoleGate } from "@/components/bt/AppShell";
import { PageHeader, StatusBadge, EmptyState } from "@/components/bt/ui";
import { useStore, nowIso } from "@/lib/store";
import { NOW } from "@/lib/mock-data";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => seo("Emergency approvals", "Approve or reject uncrossmatched emergency blood release requests."),
  component: () => <RoleGate roles={["incharge", "tech"]}><Approvals /></RoleGate>,
});

function Approvals() {
  const { requests, role, user, actor, updateRequest } = useStore();
  const pending = requests.filter((r) => r.status === "Pending Approval" || r.status === "Approved (verbal, awaiting confirmation)");

  return (
    <div>
      <PageHeader title="Approvals" description="Emergency uncrossmatched release requests awaiting In-charge approval." />
      {pending.length === 0 ? (
        <EmptyState title="No approvals pending" description="Emergency release requests will appear here." action={<Button asChild variant="outline"><Link to="/requests">View all requests</Link></Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pending.map((r) => {
            const mins = Math.max(0, Math.round((NOW - new Date(r.createdAt).getTime()) / 60000));
            const log = (text: string, status: typeof r.status, extra = {}) =>
              updateRequest(r.id, (x) => ({ ...x, ...extra, status, log: [...x.log, { at: nowIso(), by: actor, text }] }));
            return (
              <article key={r.id} className="rounded-xl border border-brand/30 bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to="/requests/$requestId" params={{ requestId: r.id }} className="font-semibold hover:underline">{r.id}</Link>
                    <p className="text-sm">{r.patient.name} · {r.ward}</p>
                  </div>
                  <StatusBadge label={r.status} />
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div><dt className="inline text-muted-foreground">Reason: </dt><dd className="inline">{r.emergencyReason}</dd></div>
                  <div><dt className="inline text-muted-foreground">Doctor: </dt><dd className="inline">{r.doctor}</dd></div>
                  <div><dt className="inline text-muted-foreground">Items: </dt><dd className="inline">{r.items.map((i) => `${i.units}× O-neg ${i.component}`).join(", ")}</dd></div>
                  <div className="font-medium text-brand">Waiting {mins} min</div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {role === "incharge" ? (
                    <>
                      <ConfirmDialog trigger={<Button variant="brand" size="sm">Approve</Button>} title={`Approve uncrossmatched release of ${r.items.map((i) => `${i.units}× O-neg ${i.component}`).join(", ")} for ${r.patient.name}, ${r.patient.mrNo} (${r.id})?`} description="O-negative PRBC may be issued uncrossmatched."
                        onConfirm={() => { log("Emergency release approved", "Approved", { approval: { type: "formal", by: actor, at: nowIso() } }); toast.success(`${r.id} approved`); }} />
                      <ConfirmDialog trigger={<Button variant="outline" size="sm">Reject</Button>} title={`Reject ${r.id} for ${r.patient.name}, ${r.patient.mrNo}?`} reasonLabel="Rejection reason" requireReason destructive confirmLabel="Reject"
                        onConfirm={(reason) => { log(`Rejected: ${reason}`, "Rejected", { rejectReason: reason }); toast.success(`${r.id} rejected`); }} />
                    </>
                  ) : r.status === "Pending Approval" ? (
                    <Button asChild size="sm" variant="outline"><Link to="/requests/$requestId" params={{ requestId: r.id }}>Log verbal approval</Link></Button>
                  ) : <span className="text-sm text-muted-foreground">Awaiting In-charge confirmation</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
