import { useStore, inStock } from "@/lib/store";
import { BLOOD_GROUPS, COMPONENTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function StockGrid() {
  const { units, settings } = useStore();
  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left font-medium text-muted-foreground">Group</th>
            {COMPONENTS.map((c) => <th key={c} className="p-3 text-center font-medium text-muted-foreground">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {BLOOD_GROUPS.map((g) => (
            <tr key={g} className="border-b last:border-0">
              <td className="p-3 font-semibold">{g}</td>
              {COMPONENTS.map((c) => {
                const n = units.filter((u) => u.group === g && u.component === c && inStock(u)).length;
                const low = n <= settings.minStock[c];
                return (
                  <td key={c} className="p-1.5">
                    <div className={cn("rounded-lg border px-2 py-2 text-center", low ? "border-warning/40 bg-warning-soft text-warning" : "bg-success-soft/50")}>
                      <div className="text-lg font-semibold">{n}</div>
                      <div className="text-[10px] uppercase tracking-wide">{low ? "Low" : "OK"}</div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

