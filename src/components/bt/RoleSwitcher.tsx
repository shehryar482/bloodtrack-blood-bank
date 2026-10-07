import { useNavigate } from "@tanstack/react-router";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { ROLE_LABEL, type Role } from "@/lib/mock-data";

export function RoleSwitcher() {
  const { role, ward, setRole, settings } = useStore();
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={role ?? undefined} onValueChange={(v) => { setRole(v as Role); navigate({ to: "/dashboard" }); }}>
        <SelectTrigger className="h-9 w-[200px]" aria-label="Switch role"><SelectValue placeholder="Choose role" /></SelectTrigger>
        <SelectContent>
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
        </SelectContent>
      </Select>
      {role === "ward" && (
        <Select value={ward} onValueChange={(w) => setRole("ward", w)}>
          <SelectTrigger className="h-9 w-[180px]" aria-label="Ward"><SelectValue /></SelectTrigger>
          <SelectContent>{settings.wards.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
        </Select>
      )}
    </div>
  );
}
