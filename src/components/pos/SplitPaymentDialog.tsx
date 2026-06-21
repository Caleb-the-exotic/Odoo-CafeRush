import { useState } from "react";
import type { Order, Payment } from "@/lib/pos/types";
import type { OrderTotals } from "@/lib/pos/format";
import { currency } from "@/lib/pos/format";
import { useSettings } from "@/store";
import { CreditCard, Banknote, Wallet, Gift, X, Plus, Trash2 } from "lucide-react";

interface Draft {
  id: string;
  method: Payment["method"];
  amount: number;
}

const METHODS: { method: Payment["method"]; label: string; icon: typeof CreditCard }[] = [
  { method: "card", label: "Card", icon: CreditCard },
  { method: "cash", label: "Cash", icon: Banknote },
  { method: "wallet", label: "Wallet", icon: Wallet },
  { method: "gift", label: "Gift", icon: Gift },
];

export function SplitPaymentDialog({
  order,
  totals,
  balanceDue,
  onClose,
  onPay,
}: {
  order: Order;
  totals: OrderTotals;
  balanceDue: number;
  onClose: () => void;
  onPay: (payments: Payment[]) => void;
}) {
  const gatewayMode = useSettings((s) => s.paymentGatewayMode);
  const [drafts, setDrafts] = useState<Draft[]>([
    { id: "d1", method: "card", amount: Number(balanceDue.toFixed(2)) },
  ]);
  const [processing, setProcessing] = useState(false);

  const allocated = drafts.reduce((s, d) => s + (Number.isFinite(d.amount) ? d.amount : 0), 0);
  const remaining = balanceDue - allocated;

  const add = () =>
    setDrafts([
      ...drafts,
      { id: Math.random().toString(36).slice(2), method: "cash", amount: Math.max(0, remaining) },
    ]);
  const update = (id: string, patch: Partial<Draft>) =>
    setDrafts(drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const remove = (id: string) => setDrafts(drafts.filter((d) => d.id !== id));

  const submit = async () => {
    if (allocated < balanceDue - 0.001) return;
    setProcessing(true);
    // Simulated gateway round-trip
    await new Promise((r) => setTimeout(r, gatewayMode === "live" ? 1200 : 400));
    onPay(
      drafts
        .filter((d) => d.amount > 0)
        .map((d) => ({
          method: d.method,
          amount: d.amount,
          ref: d.method === "card" ? `AUTH-${Math.floor(Math.random() * 1e6)}` : undefined,
          at: Date.now(),
        })),
    );
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 grid place-items-center p-4">
      <div className="bg-card rounded-lg w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <div className="font-semibold">Take payment</div>
            <div className="text-xs text-muted-foreground">
              Order #{order.number} · Balance {currency(balanceDue)}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {drafts.map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              <select
                value={d.method}
                onChange={(e) => update(d.id, { method: e.target.value as Payment["method"] })}
                className="rounded-md border bg-background px-2 py-2 text-sm"
              >
                {METHODS.map((m) => (
                  <option key={m.method} value={m.method}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                value={d.amount}
                onChange={(e) => update(d.id, { amount: Number(e.target.value) })}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm text-right font-mono"
              />
              {drafts.length > 1 && (
                <button
                  onClick={() => remove(d.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={add}
            className="text-xs text-accent inline-flex items-center gap-1 hover:underline"
          >
            <Plus className="h-3 w-3" /> Add payment method
          </button>

          <div className="rounded-md bg-secondary/50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Balance due</span>
              <span className="font-semibold">{currency(balanceDue)}</span>
            </div>
            <div className="flex justify-between">
              <span>Allocated</span>
              <span className="font-mono">{currency(allocated)}</span>
            </div>
            <div
              className={`flex justify-between font-semibold ${remaining > 0.001 ? "text-warning-foreground" : remaining < -0.001 ? "text-success" : ""}`}
            >
              <span>
                {remaining > 0.001 ? "Remaining" : remaining < -0.001 ? "Change due" : "Settled"}
              </span>
              <span>{currency(Math.abs(remaining))}</span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Gateway: <span className="font-semibold uppercase">{gatewayMode}</span> —{" "}
            {gatewayMode === "demo" ? "no real charges" : "live charges enabled"}.
          </div>
        </div>

        <div className="p-4 border-t flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={processing || allocated < balanceDue - 0.001}
            className="flex-1 rounded-md bg-primary text-primary-foreground py-2 text-sm font-semibold disabled:opacity-50"
          >
            {processing ? "Processing…" : `Charge ${currency(allocated)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
