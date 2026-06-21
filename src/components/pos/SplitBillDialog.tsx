import { useState } from "react";
import type { Order } from "@/lib/pos/types";
import { computeTotals, currency } from "@/lib/pos/format";
import { X } from "lucide-react";

/** Item-level split: assign each line to a guest (1..N) and show per-guest totals. */
export function SplitBillDialog({
  order,
  taxRate,
  onClose,
}: {
  order: Order;
  taxRate: number;
  onClose: () => void;
}) {
  const [guests, setGuests] = useState(Math.max(2, order.guests ?? 2));
  const [mode, setMode] = useState<"items" | "even">("items");
  const [assignment, setAssignment] = useState<Record<string, number>>(() =>
    Object.fromEntries(order.lines.map((l, i) => [l.id, (i % 2) + 1])),
  );

  const groups: Record<number, typeof order.lines> = {};
  for (let g = 1; g <= guests; g++) groups[g] = [];
  order.lines.forEach((l) => {
    const g = assignment[l.id] ?? 1;
    (groups[g] ??= []).push(l);
  });

  const overallTotals = computeTotals(
    order.lines,
    order.discountPct ?? 0,
    order.tipAmount ?? 0,
    taxRate,
  );

  return (
    <div className="fixed inset-0 z-40 bg-black/40 grid place-items-center p-4">
      <div className="bg-card rounded-lg w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <div className="font-semibold">Split bill</div>
            <div className="text-xs text-muted-foreground">
              Order #{order.number} · Total {currency(overallTotals.total)}
            </div>
          </div>
          <button onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 border-b flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Guests</span>
            <input
              type="number"
              min={2}
              max={12}
              value={guests}
              onChange={(e) => setGuests(Math.max(2, Math.min(12, Number(e.target.value) || 2)))}
              className="w-20 rounded-md border bg-background px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setMode("items")}
              className={`px-3 py-1.5 rounded-md text-xs ${mode === "items" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            >
              By item
            </button>
            <button
              onClick={() => setMode("even")}
              className={`px-3 py-1.5 rounded-md text-xs ${mode === "even" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            >
              Evenly
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {mode === "items" ? (
            <div className="space-y-2">
              {order.lines.map((l) => (
                <div key={l.id} className="flex items-center gap-3 border rounded-md p-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.qty} × {currency(l.unitPrice)}
                    </div>
                  </div>
                  <select
                    value={assignment[l.id] ?? 1}
                    onChange={(e) =>
                      setAssignment({ ...assignment, [l.id]: Number(e.target.value) })
                    }
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                  >
                    {Array.from({ length: guests }, (_, i) => i + 1).map((g) => (
                      <option key={g} value={g}>
                        Guest {g}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Each guest pays an equal share:{" "}
              <span className="font-semibold text-foreground">
                {currency(overallTotals.total / guests)}
              </span>
            </div>
          )}

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {Array.from({ length: guests }, (_, i) => i + 1).map((g) => {
              const lines = groups[g] ?? [];
              const t =
                mode === "items"
                  ? computeTotals(lines, order.discountPct ?? 0, 0, taxRate)
                  : { ...overallTotals, total: overallTotals.total / guests };
              return (
                <div key={g} className="rounded-md border p-3">
                  <div className="font-medium text-sm">Guest {g}</div>
                  {mode === "items" ? (
                    lines.length === 0 ? (
                      <div className="text-xs text-muted-foreground mt-1">No items</div>
                    ) : (
                      <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                        {lines.map((l) => (
                          <li key={l.id} className="flex justify-between">
                            <span>
                              {l.qty}× {l.name}
                            </span>
                            <span>{currency(l.unitPrice * l.qty)}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : null}
                  <div className="mt-2 pt-2 border-t flex justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span>{currency(t.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">
            Close
          </button>
          <button
            onClick={() => {
              window.print();
            }}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm"
          >
            Print split
          </button>
        </div>
      </div>
    </div>
  );
}
