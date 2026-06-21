import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { usePosAuth, usePosCurrentUser, useSettings } from "@/store";
import { usePersisted } from "@/store/admin";
import {
  LayoutGrid,
  Utensils,
  Boxes,
  Banknote,
  ScrollText,
  Monitor,
  Settings,
  LogOut,
  ClipboardList,
  Grid3x3,
  MapPin,
} from "lucide-react";
import clsx from "clsx";

const items = [
  { to: "/pos", icon: ClipboardList, key: "nav.pos" },
  { to: "/pos/tables", icon: Grid3x3, key: "nav.tables" },
  { to: "/pos/menu-admin", icon: Utensils, key: "nav.menu" },
  { to: "/pos/tracker", icon: MapPin, key: "nav.tracker" },
  { to: "/pos/display", icon: Monitor, key: "nav.display" },
  { to: "/pos/settings", icon: Settings, key: "nav.settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const user = usePosCurrentUser();
  const logout = usePosAuth((s) => s.logout);
  const nav = useNavigate();
  const loc = useLocation();
  const locale = useSettings((s) => s.locale);
  const { t, i18n } = useTranslation();
  const [adminAuthed] = usePersisted<boolean>("bistro.admin.authed", false);
  const isAdminViewingPos = typeof window !== "undefined" && sessionStorage.getItem("admin.viewing.pos") === "true";

  useEffect(() => {
    if (i18n.language !== locale) i18n.changeLanguage(locale);
  }, [locale, i18n]);

  useEffect(() => {
    // Allow admin to view POS pages directly without employee login
    if (!user && !isAdminViewingPos) nav({ to: "/login", search: { redirect: "/pos" } });
  }, [user, isAdminViewingPos, nav]);

  if (!user && !isAdminViewingPos) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print w-60 h-screen sticky top-0 bg-sidebar text-sidebar-foreground flex flex-col border-r">
        <div className="px-5 py-4 border-b border-sidebar-border">
          <Link to="/" className="block">
            <img
              src="/Odoocafe.png"
              alt="OdooCafé"
              className="h-10 w-auto object-contain hover:opacity-80 transition-opacity"
            />
          </Link>
          {isAdminViewingPos && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Admin View</span>
              <button
                onClick={() => {
                  sessionStorage.removeItem("admin.viewing.pos");
                  nav({ to: "/admin" });
                }}
                className="text-[10px] text-sidebar-foreground/60 hover:text-sidebar-foreground underline ml-auto"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {items.map((it) => {
            const active = loc.pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{t(it.key)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          {user ? (
            <>
              <div className="flex items-center gap-2 px-2 py-2 text-sm">
                <div className="h-8 w-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center text-xs font-semibold">
                  {user.name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm">{user.name}</div>
                  <div className="text-[11px] capitalize opacity-70">{user.role}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  nav({ to: "/login" });
                }}
                className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent/60"
              >
                <LogOut className="h-4 w-4" />
                {t("nav.signout")}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                sessionStorage.removeItem("admin.viewing.pos");
                nav({ to: "/admin" });
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-primary/10 text-primary hover:bg-primary/20 font-medium"
            >
              <LogOut className="h-4 w-4" />
              Back to Admin
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-border bg-card px-6 py-4 no-print">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
