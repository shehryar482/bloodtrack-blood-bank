import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface Column<T> { key: string; header: string; cell: (row: T) => ReactNode; primary?: boolean }

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowLink?: (row: T) => { to: string; params?: Record<string, string> };
  filters?: ReactNode;
  empty: ReactNode;
}

/** Table on desktop, stacked cards on mobile. */
export function DataTable<T>({ columns, rows, rowKey, rowLink, filters, empty }: Props<T>) {
  const navigate = useNavigate();
  const go = (r: T) => rowLink && navigate(rowLink(r) as never);
  return (
    <div className="space-y-4">
      {filters && <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-3">{filters}</div>}
      {rows.length === 0 ? empty : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>{columns.map((c) => <TableHead key={c.key}>{c.header}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={rowKey(r)} onClick={() => go(r)} className={rowLink ? "cursor-pointer" : ""}>
                    {columns.map((c) => <TableCell key={c.key}>{c.cell(r)}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <div key={rowKey(r)} onClick={() => go(r)} className="rounded-xl border bg-card p-4 shadow-sm">
                {columns.map((c) => c.primary ? (
                  <div key={c.key} className="mb-2 font-medium">{c.cell(r)}</div>
                ) : (
                  <div key={c.key} className="flex justify-between gap-3 py-0.5 text-sm">
                    <span className="text-muted-foreground">{c.header}</span>
                    <span className="text-right">{c.cell(r)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
