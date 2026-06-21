import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/pos/AppShell";
import { POSWorkspace } from "@/components/pos/POSWorkspace";
import { usePosOrders, usePosCurrentUser } from "@/store";
import { Plus, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/pos/")({
  head: () => ({ meta: [{ title: "POS — OdooCafé" }] }),
  component: POSPage,
});

function POSPage() {
  const allOrders = usePosOrders((s) => s.orders);
  const orders = allOrders.filter((o) => o.status === "open");
  const createOrder = usePosOrders((s) => s.createOrder);
  const user = usePosCurrentUser();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && orders[0]) setActiveId(orders[0].id);
  }, [orders, activeId]);

  return (
    <AppShell>
      <div className="flex flex-col h-screen">
        <PageHeader
          title="Point of Sale"
          subtitle="Take orders, apply discounts, accept split payments."
          actions={
            <button
              onClick={() => {
                const o = createOrder({ channel: "takeaway", serverId: user?.id, guests: 1 });
                setActiveId(o.id);
              }}
              className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> New takeaway
            </button>
          }
        />

        <div className="flex-1 flex min-h-0">
          {/* Open orders list */}
          <div className="w-56 border-r bg-card overflow-y-auto no-print">
            <div className="p-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Open orders
            </div>
            {orders.length === 0 ? (
              <div className="px-3 pb-3 text-xs text-muted-foreground">
                No open orders. Seat a table or start a takeaway order.
              </div>
            ) : (
              <ul>
                {orders.map((o) => (
                  <li key={o.id}>
                    <button
                      onClick={() => setActiveId(o.id)}
                      className={`w-full text-left px-3 py-2.5 border-l-2 ${
                        activeId === o.id
                          ? "border-primary bg-secondary/60"
                          : "border-transparent hover:bg-secondary/40"
                      }`}
                    >
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5 text-accent" />#{o.number}
                      </div>
                      <div className="text-[11px] text-muted-foreground capitalize">
                        {o.channel}
                        {o.tableId ? ` · T${o.tableId.replace("t", "")}` : ""} · {o.lines.length}{" "}
                        item{o.lines.length === 1 ? "" : "s"}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <POSWorkspace activeOrderId={activeId} onOrderClosed={() => setActiveId(null)} />
        </div>
      </div>
    </AppShell>
  );
}
