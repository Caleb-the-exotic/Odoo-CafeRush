import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useTablesAuth } from "@/store";
import {
  LayoutDashboard,
  Package,
  Tag,
  CreditCard,
  Ticket,
  Users,
  Settings,
  LogOut,
  Layers,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";

const nav = [
  { to: "/tables", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/categories", label: "Categories", icon: Tag },
  { to: "/payments", label: "Payment Methods", icon: CreditCard },
  { to: "/coupons", label: "Coupons & Promotions", icon: Ticket },
  { to: "/floors", label: "Floors & Tables", icon: Layers },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const navigate = useNavigate();
  const { currentUser, logout } = useTablesAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!currentUser) navigate({ to: "/login", search: { redirect: "/tables" } });
  }, [currentUser, navigate]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={`${open ? "w-64" : "w-16"} bg-sidebar text-sidebar-foreground transition-all duration-200 flex flex-col`}
      >
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground shrink-0">
            P
          </div>
          {open && <span className="font-semibold tracking-tight">POS Admin</span>}
        </div>
        <nav className="flex-1 py-3">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 my-0.5 rounded-md text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-white" : "hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {open && <span>{n.label}</span>}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => {
            logout();
            navigate({ to: "/login" });
          }}
          className="flex items-center gap-3 px-4 py-3 mx-2 mb-3 rounded-md text-sm hover:bg-sidebar-accent/50"
        >
          <LogOut size={18} /> {open && "Logout"}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <button onClick={() => setOpen(!open)} className="p-2 rounded-md hover:bg-muted">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => setDark(!dark)} className="p-2 rounded-md hover:bg-muted">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                {currentUser.name[0]}
              </div>
              <div className="hidden sm:block">
                <div className="font-medium leading-tight">{currentUser.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{currentUser.role}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
