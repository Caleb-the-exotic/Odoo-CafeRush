import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/pos/AppShell";
import { usePosOrders, usePosTables, usePosCurrentUser } from "@/store";
import type { Table } from "@/lib/pos/types";
import { Users, ArrowRightLeft, Combine, Unlink, X } from "lucide-react";

export const Route = createFileRoute("/pos/tables")({
  head: () => ({ meta: [{ title: "Tables — OdooCafé" }] }),
  component: TablesPage,
});

function TablesPage() {
  const tables = usePosTables((s) => s.tables);
  const { seat, release, mergeTables, unmerge, transferOrder } = usePosTables();
  const orders = usePosOrders((s) => s.orders);
  const createOrder = usePosOrders((s) => s.createOrder);
  const user = usePosCurrentUser();
  const nav = useNavigate();
  const [action, setAction] = useState<null | { type: "merge" | "transfer"; sourceId: string }>(
    null,
  );
  const [seatModal, setSeatModal] = useState<Table | null>(null);
  const [guests, setGuests] = useState(2);

  const handleClick = (t: Table) => {
    if (t.mergedInto) return;
    if (action) {
      if (action.type === "merge") {
        mergeTables(action.sourceId, t.id);
      } else {
        transferOrder(action.sourceId, t.id);
      }
      setAction(null);
      return;
    }
    if (t.status === "free") {
      setGuests(Math.max(1, Math.min(t.seats, 2)));
      setSeatModal(t);
    } else if (t.orderId) {
      nav({ to: "/pos" });
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Floor plan"
        subtitle="Seat guests, transfer, or merge tables."
        actions={
          action && (
            <button
              onClick={() => setAction(null)}
              className="text-xs inline-flex items-center gap-1 rounded-md border px-3 py-1.5"
            >
              <X className="h-3 w-3" /> Cancel {action.type}
            </button>
          )
        }
      />

      <div className="p-6">
        {action && (
          <div className="mb-4 rounded-md bg-accent/15 border border-accent/30 px-4 py-2 text-sm">
            Now tap the {action.type === "merge" ? "target" : "destination"} table.
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.map((t) => {
            const order = t.orderId ? orders.find((o) => o.id === t.orderId) : null;
            const tone = t.mergedInto
              ? "border-dashed border-muted-foreground/30 text-muted-foreground"
              : t.status === "seated"
                ? "border-accent bg-accent/5"
                : "border-border bg-card hover:border-primary";
            return (
              <div
                key={t.id}
                className={`relative rounded-lg border-2 p-4 transition cursor-pointer ${tone}`}
                onClick={() => handleClick(t)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Table</div>
                    <div className="text-2xl font-semibold">{t.label}</div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" /> {t.seats}
                    </div>
                    {t.mergedFrom && t.mergedFrom.length > 0 && (
                      <div className="mt-1 text-[10px] font-semibold bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">
                        +{t.mergedFrom.length} merged
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-xs">
                  {t.mergedInto ? (
                    <span>Merged into T{tables.find((x) => x.id === t.mergedInto)?.label}</span>
                  ) : t.status === "free" ? (
                    <span className="text-success font-medium">Available</span>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-primary font-medium">
                        Seated · #{order?.number} · {order?.lines.length ?? 0} items
                      </span>
                      {order?.prepStatus && (
                        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ml-2 ${
                          order.prepStatus === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : order.prepStatus === "preparing"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                        }`}>
                          {order.prepStatus === "completed" ? "✓ Ready" : order.prepStatus === "preparing" ? "🍳 Cooking" : "⏳ Queued"}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!t.mergedInto && (
                  <div
                    className="mt-3 flex flex-wrap gap-1.5 text-[11px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t.status === "seated" && (
                      <>
                        <button
                          onClick={() => setAction({ type: "transfer", sourceId: t.id })}
                          className="rounded border px-2 py-0.5 inline-flex items-center gap-1 hover:bg-secondary"
                        >
                          <ArrowRightLeft className="h-3 w-3" /> Transfer
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Release table ${t.label}?`)) release(t.id);
                          }}
                          className="rounded border px-2 py-0.5 hover:bg-secondary"
                        >
                          Release
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setAction({ type: "merge", sourceId: t.id })}
                      className="rounded border px-2 py-0.5 inline-flex items-center gap-1 hover:bg-secondary"
                    >
                      <Combine className="h-3 w-3" /> Merge
                    </button>
                    {t.mergedFrom && t.mergedFrom.length > 0 && (
                      <button
                        onClick={() => t.mergedFrom!.forEach((id) => unmerge(id))}
                        className="rounded border px-2 py-0.5 inline-flex items-center gap-1 hover:bg-secondary"
                      >
                        <Unlink className="h-3 w-3" /> Unmerge
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {seatModal && (
        <div className="fixed inset-0 bg-black/40 z-30 grid place-items-center p-4">
          <div className="bg-card rounded-lg w-full max-w-sm p-5">
            <div className="font-semibold">Seat table {seatModal.label}</div>
            <p className="text-xs text-muted-foreground mt-1">Up to {seatModal.seats} guests</p>
            <div className="mt-4">
              <label className="text-xs text-muted-foreground">Number of guests</label>
              <input
                type="number"
                min={1}
                max={seatModal.seats}
                value={guests}
                onChange={(e) =>
                  setGuests(Math.max(1, Math.min(seatModal.seats, Number(e.target.value) || 1)))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSeatModal(null)}
                className="flex-1 rounded-md border py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const o = createOrder({
                    channel: "dine-in",
                    tableId: seatModal.id,
                    guests,
                    serverId: user?.id,
                  });
                  seat(seatModal.id, o.id);
                  setSeatModal(null);
                  nav({ to: "/pos" });
                }}
                className="flex-1 rounded-md bg-primary text-primary-foreground py-2 text-sm font-semibold"
              >
                Seat & open order
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
