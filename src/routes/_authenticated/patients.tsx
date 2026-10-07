import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/bt/DataTable";
import { PageHeader, EmptyState, fmtDate } from "@/components/bt/ui";
import { PatientDialog } from "@/components/bt/PatientDialog";
import { usePatients, groupOf, type PatientRow } from "@/lib/db";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/patients")({
  head: () => seo("Patients", "Search, add and edit patients by name or MR number."),
  component: PatientsPage,
});

function PatientsPage() {
  const { data: patients = [], isLoading, error } = usePatients();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<PatientRow | null | undefined>(undefined);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? patients.filter((p) => p.full_name.toLowerCase().includes(s) || p.mr_number.toLowerCase().includes(s)) : patients;
  }, [patients, q]);

  const columns: Column<PatientRow>[] = [
    { key: "n", header: "Name", cell: (p) => <span className="font-medium">{p.full_name}</span>, primary: true },
    { key: "mr", header: "MR no.", cell: (p) => p.mr_number },
    { key: "rel", header: "Father / husband", cell: (p) => p.father_or_husband_name ?? "—" },
    { key: "g", header: "Gender", cell: (p) => p.gender ?? "—" },
    { key: "dob", header: "Date of birth", cell: (p) => (p.date_of_birth ? fmtDate(p.date_of_birth) : "—") },
    { key: "bg", header: "Group", cell: (p) => <span className="font-semibold">{groupOf(p.abo_group, p.rh_d) ?? "—"}</span> },
    { key: "e", header: "", cell: (p) => <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEdit(p); }}>Edit</Button> },
  ];

  return (
    <div>
      <PageHeader
        title="Patients"
        description={isLoading ? "Loading…" : `${patients.length} patients`}
        actions={<Button variant="brand" onClick={() => setEdit(null)}><Plus className="h-4 w-4" /> Add patient</Button>}
      />
      {error ? <EmptyState title="Could not load patients" description={error.message} /> : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          filters={<Input placeholder="Search name or MR no." value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-full sm:w-64" maxLength={60} />}
          empty={<EmptyState title={patients.length ? "No patients match" : "No patients yet"} action={<Button variant="outline" onClick={() => setEdit(null)}>Add patient</Button>} />}
        />
      )}
      <PatientDialog open={edit !== undefined} patient={edit ?? null} onClose={() => setEdit(undefined)} />
    </div>
  );
}
