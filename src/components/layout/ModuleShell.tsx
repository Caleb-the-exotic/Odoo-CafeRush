import { Link, Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface NavItem {
  to: string;
  label: string;
  icon?: ReactNode;
}

interface ModuleShellProps {
  title: string;
  accent: string; // tailwind color class for the active state, e.g. "bg-primary"
  nav: NavItem[];
}

/**
 * Shared shell for the three app modules (POS / Admin / Tables).
 * Each module renders its own <ModuleShell /> with its own nav definition
 * and a child <Outlet /> for the namespaced child routes.
 */
export function ModuleShell({ title, accent, nav }: ModuleShellProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-border bg-card">
        <div className="flex h-14 items-center px-4 border-b border-border">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Switch module
          </Link>
        </div>
        <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to.split("/").length <= 2 }}
              activeProps={{
                className: cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-primary-foreground",
                  accent,
                ),
              }}
              inactiveProps={{
                className:
                  "rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export function ModulePlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {note ?? "Feature implementation migrates in Phase 5."}
      </p>
    </div>
  );
}
