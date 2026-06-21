import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/admin/Layout";
import { usePosOrders, usePosTables } from "@/store";
import { useMemo, useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/admin/kds")({
  head: () => ({ meta: [{ title: "Kitchen Display — Bistro POS" }] }),
  component: KDSPage,
});

const TABS = [
  { key: "all", label: "All" },
  { key: "to_cook", label: "To Cook" },
  { key: "preparing", label: "Preparing" },
  { key: "completed", label: "Completed" },
] as const;

/** Elapsed ms → "Xm Ys" */
function elapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

/** Returns urgency colour class based on elapsed time */
function urgencyClass(ms: number) {
  if (ms >= 15 * 60 * 1000) return "bg-red-600"; // >15 min — critical
  if (ms >= 8 * 60 * 1000) return "bg-orange-500"; // >8 min — warning
  return "bg-emerald-600"; // normal
}

function ElapsedBadge({ createdAt }: { createdAt: number }) {
  const [now, setNow] = useState(Date.now());
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => {
    timer.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer.current);
  }, []);
  const ms = now - createdAt;
  return (
    <span
      className={`text-xs text-white font-bold rounded-full px-2 py-0.5 ${urgencyClass(ms)}`}
    >
      ⏱ {elapsed(ms)}
    </span>
  );
}

function KDSPage() {
  const { orders, updatePrepStatus, toggleLinePrepared } = usePosOrders();
  const { tables } = usePosTables();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("to_cook");
  const [search, setSearch] = useState("");

  // Only non-paid, non-void orders for KDS
  const kdsOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status !== "paid" && o.status !== "void")
        .sort((a, b) => a.createdAt - b.createdAt), // FIFO
    [orders],
  );

  const filtered = useMemo(() => {
    return kdsOrders.filter((o) => {
      if (tab !== "all") {
        const ps = o.prepStatus ?? "to_cook";
        if (ps !== tab) return false;
      }
      if (search && !String(o.number).includes(search)) return false;
      return true;
    });
  }, [kdsOrders, tab, search]);

  const counts = {
    to_cook: kdsOrders.filter((o) => (o.prepStatus ?? "to_cook") === "to_cook").length,
    preparing: kdsOrders.filter((o) => o.prepStatus === "preparing").length,
    completed: kdsOrders.filter((o) => o.prepStatus === "completed").length,
    all: kdsOrders.length,
  };

  const getTableLabel = (tableId?: string) => {
    if (!tableId) return null;
    return tables.find((t) => t.id === tableId)?.label ?? tableId;
  };

  const advanceOrder = (orderId: string, current?: string) => {
    const next =
      !current || current === "to_cook"
        ? "preparing"
        : current === "preparing"
          ? "completed"
          : "completed";
    updatePrepStatus(orderId, next as "to_cook" | "preparing" | "completed");
  };

  const statusColor = (s?: string) => {
    if (s === "completed") return "bg-emerald-600";
    if (s === "preparing") return "bg-amber-500";
    return "bg-slate-700";
  };

  return (
    <Layout>
      <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
        <h1 className="text-2xl font-bold">Kitchen Display (KDS)</h1>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #"
            className="rounded-md border px-3 py-1.5 text-sm w-36 bg-card"
          />
          <span className="text-xs text-muted-foreground">
            Live · {kdsOrders.length} active orders
          </span>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              tab === t.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}{" "}
            <span className="ml-1 text-xs opacity-75">({counts[t.key]})</span>
          </button>
        ))}
      </div>

      {/* Order Cards Grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-16 rounded-xl border bg-card">
            <div className="text-4xl mb-3">🍳</div>
            <p className="font-medium">No orders in this queue</p>
          </div>
        )}
        {filtered.map((o) => {
          const ps = o.prepStatus ?? "to_cook";
          const tableLabel = o.channel === "dine-in" ? getTableLabel(o.tableId) : null;
          const allPrepared = o.lines.length > 0 && o.lines.every((l) => l.prepared);

          return (
            <div
              key={o.id}
              className="rounded-xl border bg-card overflow-hidden shadow-sm flex flex-col"
            >
              {/* Header — click to advance status */}
              <button
                onClick={() => advanceOrder(o.id, ps)}
                className={`w-full px-4 py-3 text-left text-white ${statusColor(ps)} transition-opacity hover:opacity-90`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-lg">#{o.number}</span>
                  <div className="flex items-center gap-2">
                    <ElapsedBadge createdAt={o.createdAt} />
                    <span className="text-xs uppercase tracking-wide opacity-90 bg-white/20 px-2 py-0.5 rounded-full">
                      {ps.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs opacity-85">
                  <span>{o.channel}</span>
                  {tableLabel && <span>· {tableLabel}</span>}
                  {o.customerName && <span>· {o.customerName}</span>}
                  {o.guests && <span>· {o.guests} guests</span>}
                </div>
                <div className="text-xs opacity-70 mt-0.5">
                  {new Date(o.createdAt).toLocaleTimeString()} ·{" "}
                  {ps === "completed" ? (
                    <span className="font-semibold">✓ Done — tap to keep completed</span>
                  ) : (
                    <span>
                      Tap to advance →{" "}
                      {ps === "to_cook" ? "Preparing" : "Completed"}
                    </span>
                  )}
                </div>
              </button>

              {/* Line Items */}
              <ul className="p-4 space-y-2 flex-1">
                {o.lines.map((line) => (
                  <li key={line.id}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLinePrepared(o.id, line.id);
                      }}
                      className={`w-full flex items-center gap-3 text-sm text-left rounded-lg px-3 py-2 border transition-all ${
                        line.prepared
                          ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                          : "bg-background border-border hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          line.prepared
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {line.prepared && (
                          <svg viewBox="0 0 12 12" className="size-3" fill="currentColor">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`flex-1 font-medium ${
                          line.prepared ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {line.qty} × {line.name}
                      </span>
                      {line.notes && (
                        <span className="text-xs text-amber-600 font-medium shrink-0">
                          📝 {line.notes}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
                {o.lines.length === 0 && (
                  <li className="text-sm text-muted-foreground italic">No items</li>
                )}
              </ul>

              {/* Footer progress */}
              <div className="px-4 pb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>
                    {o.lines.filter((l) => l.prepared).length}/{o.lines.length} items prepared
                  </span>
                  {allPrepared && ps !== "completed" && (
                    <button
                      onClick={() => updatePrepStatus(o.id, "completed")}
                      className="text-emerald-600 font-semibold hover:underline"
                    >
                      Mark Complete ✓
                    </button>
                  )}
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width:
                        o.lines.length > 0
                          ? `${(o.lines.filter((l) => l.prepared).length / o.lines.length) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
