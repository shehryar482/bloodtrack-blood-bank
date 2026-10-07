import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FilePlus2, ClipboardList, Boxes, Send, Clock, BarChart3, Settings, ShieldCheck, Menu, Droplet, Bell,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useStore, isExpiring } from "@/lib/store";
import { ROLE_LABEL, HOSPITAL, type Role } from "@/lib/mock-data";
import { RoleSwitcher } from "./RoleSwitcher";
import { EmptyState } from "./ui";

interface NavItem { to: string; label: string | ((r: Role) => string); icon: typeof Boxes; roles: Role[] }
export const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ward", "tech", "incharge"] },
  { to: "/requests/new", label: "New Request", icon: FilePlus2, roles: ["ward"] },
  { to: "/requests", label: (r) => (r === "ward" ? "My Requests" : "Requests"), icon: ClipboardList, roles: ["ward", "tech", "incharge"] },
  { to: "/approvals", label: "Approvals", icon: ShieldCheck, roles: ["tech", "incharge"] },
  { to: "/inventory", label: "Inventory", icon: Boxes, roles: ["tech", "incharge"] },
  { to: "/issue", label: "Issue", icon: Send, roles: ["tech"] },
  { to: "/expiry", label: "Expiry Alerts", icon: Clock, roles: ["tech", "incharge"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["tech", "incharge"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["incharge"] },
];

export function Banner() {
  return (
    <div className="bg-warning-soft px-4 py-1.5 text-center text-xs font-medium text-warning">
      Prototype - mock data only. Not for clinical use.
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-primary-foreground"><Droplet className="h-4 w-4" /></span>
      <span className="leading-tight">
        <span className="block font-semibold">BloodTrack</span>
        <span className="block text-[11px] text-muted-foreground">Demo General Hospital</span>
      </span>
    </Link>
  );
}

function NavList({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {NAV.filter((n) => n.roles.includes(role)).map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={onNavigate}
          activeOptions={{ exact: n.to === "/requests" }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-brand-soft data-[status=active]:font-medium data-[status=active]:text-brand"
        >
          <n.icon className="h-4 w-4" />
          {typeof n.label === "function" ? n.label(role) : n.label}
        </Link>
      ))}
    </nav>
  );
}

/** Restricts a page to roles; hides it otherwise. */
export function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { role } = useStore();
  if (!role || !roles.includes(role)) {
    return <EmptyState title="Access not available for this role" description="Switch role from the header if you need this page." action={<Button asChild variant="outline"><Link to="/dashboard">Go to dashboard</Link></Button>} />;
  }
  return <>{children}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role, ward, user, units, settings } = useStore();
  const expiringCount = units.filter((u) => isExpiring(u, settings)).length;
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (path === "/") {
    return <div className="min-h-screen"><Banner />{children}</div>;
  }

  return (
    <div className="min-h-screen">
      <Banner />
      <div className="flex">
        {role && (
          <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
            <Brand />
            <div className="mt-6 flex-1"><NavList role={role} /></div>
            <p className="text-[11px] text-muted-foreground">{HOSPITAL}</p>
          </aside>
        )}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur">
            {role && (
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu"><Menu /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-4">
                  <SheetTitle className="sr-only">Menu</SheetTitle>
                  <Brand />
                  <div className="mt-6"><NavList role={role} onNavigate={() => setOpen(false)} /></div>
                </SheetContent>
              </Sheet>
            )}
            <div className={role ? "md:hidden" : ""}><Brand /></div>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              {role && (
                <div className="hidden text-right text-xs lg:block">
                  <div className="font-medium">{user}</div>
                  <div className="text-muted-foreground">{ROLE_LABEL[role]}{role === "ward" ? ` · ${ward}` : ""}</div>
                </div>
              )}
              {mounted && (role === "tech" || role === "incharge") && (
                <Button asChild variant="ghost" size="icon" className="relative" aria-label={`${expiringCount} units expiring soon`}>
                  <Link to="/expiry">
                    <Bell />
                    {expiringCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-primary-foreground">{expiringCount}</span>}
                  </Link>
                </Button>
              )}
              <RoleSwitcher />
            </div>
          </header>
          <main className="mx-auto max-w-7xl p-4 sm:p-6">
            {!mounted ? null : role ? children : (
              <EmptyState title="Choose a role to continue" description="This prototype uses a mock role switcher instead of login." action={<Button asChild><Link to="/">Select role</Link></Button>} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
