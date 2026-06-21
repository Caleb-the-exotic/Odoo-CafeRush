import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { ensureSeed } from "@/store/admin";
import { Tag, Sparkles, QrCode, Monitor, Shield, Users, LogOut } from "lucide-react";
import { usePersisted } from "@/store/admin";

const nav = [
  { to: "/admin/coupons" as any, label: "Coupons", icon: Tag },
  { to: "/admin/promotions" as any, label: "Promotions", icon: Sparkles },
  { to: "/admin/self-ordering" as any, label: "Self Ordering", icon: QrCode },
  { to: "/admin/kds" as any, label: "Monitor", icon: Monitor },
  { to: "/admin" as any, label: "Admin", icon: Shield },
];

export function Layout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [adminAuthed, setAdminAuthed] = usePersisted<boolean>("bistro.admin.authed", false);

  useEffect(() => {
    ensureSeed();
    if (!adminAuthed) {
      navigate({ to: "/login", search: { redirect: pathname } });
    }
  }, [adminAuthed, navigate, pathname]);

  const handleEmployeeClick = () => {
    // Store admin-as-employee flag so POS AppShell lets admin through
    sessionStorage.setItem("admin.viewing.pos", "true");
    navigate({ to: "/pos/tables" });
  };

  const handleLogout = () => {
    setAdminAuthed(false);
    navigate({ to: "/login" });
  };

  if (!adminAuthed) return null;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-60 h-screen sticky top-0 bg-sidebar text-sidebar-foreground flex flex-col border-r">
        <div className="px-5 py-4 border-b border-sidebar-border">
          <Link to="/" className="block">
            <img
              src="/Odoocafe.png"
              alt="OdooCafé"
              className="h-10 w-auto object-contain hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {/* Employee button — takes admin directly into POS */}
          <button
            onClick={handleEmployeeClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
              pathname.startsWith("/pos")
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Employee</span>
          </button>

          {nav.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.to || (n.to !== "/admin" && pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 px-2 py-2 text-sm">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center text-xs font-semibold">
              AA
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm">Alex Admin</div>
              <div className="text-[11px] capitalize opacity-70">admin</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent/60"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card">
          <Link to="/" className="block">
            <img
              src="/Odoocafe.png"
              alt="OdooCafé"
              className="h-8 w-auto object-contain hover:opacity-80 transition-opacity"
            />
          </Link>
          <select
            value={pathname}
            onChange={(e) => (window.location.href = e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="/pos/tables">Employee</option>
            {nav.map((n) => (
              <option key={n.to} value={n.to}>
                {n.label}
              </option>
            ))}
          </select>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
