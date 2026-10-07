import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const ALL = "all";

export function Filter({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: string[][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}</SelectItem>
        {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
