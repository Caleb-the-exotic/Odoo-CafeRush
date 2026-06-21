import { useMemo, useRef, useState } from "react";
import { usePosMenu, usePosOrders, useSettings, usePosTables, usePosCurrentUser } from "@/store";
import { toast } from "sonner";
import type { Order, Payment } from "@/lib/pos/types";
import { computeTotals, currency } from "@/lib/pos/format";
import { Receipt } from "./Receipt";
import { SplitPaymentDialog } from "./SplitPaymentDialog";
import { SplitBillDialog } from "./SplitBillDialog";
import {
  Minus,
  Plus,
  Trash2,
  Printer,
  Mail,
  Percent,
  Tag,
  Receipt as RIcon,
  Users,
  CreditCard,
  Split,
} from "lucide-react";

const CATEGORIES = ["All", "Drinks", "Mains", "Snacks", "Desserts"] as const;

export function POSWorkspace({
  activeOrderId,
  onOrderClosed,
}: {
  activeOrderId: string | null;
  onOrderClosed: () => void;
}) {
  const items = usePosMenu((s) => s.items);
  const tables = usePosTables((s) => s.tables);
  const order = usePosOrders((s) => s.orders.find((o) => o.id === activeOrderId) ?? null);
  const {
    addLine,
    updateLine,
    removeLine,
    setOrderDiscount,
    setTip,
    addPayment,
    closeOrder,
    voidOrder,
  } = usePosOrders();
  const taxRate = useSettings((s) => s.taxRate);
  const emailReceiptsEnabled = useSettings((s) => s.emailReceiptsEnabled);
  const user = usePosCurrentUser();

  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [search, setSearch] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (cat === "All" || i.category === cat) &&
          (!search.trim() || i.name.toLowerCase().includes(search.toLowerCase())),
      ),
    [items, cat, search],
  );

  const totals = useMemo(
    () =>
      computeTotals(order?.lines ?? [], order?.discountPct ?? 0, order?.tipAmount ?? 0, taxRate),
    [order, taxRate],
  );
  const paid = (order?.payments ?? []).reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, totals.total - paid);

  const table = order?.tableId ? tables.find((t) => t.id === order.tableId) : null;

  const print = () => {
    setShowReceipt(true);
    setTimeout(() => window.print(), 50);
  };

  const sendEmail = () => {
    if (!order) return;
    const email = window.prompt("Email receipt to:");
    if (!email || !email.trim()) return;

    const emailToastId = toast.loading("Sending receipt email...");

    import("../../routes/login")
      .then((m) => {
        m.sendPurchaseReceiptEmailFn({
          data: {
            email: email.trim(),
            customerName: order.customerName || "POS Guest",
            orderNumber: String(order.number),
            items: order.lines.map((l) => ({ name: l.name, price: l.unitPrice, qty: l.qty })),
            subtotal: totals.subtotal,
            discount: totals.discount,
            tax: totals.tax,
            total: totals.total,
            tableLabel: table ? table.label : undefined,
          },
        })
          .then((res: any) => {
            if (res && res.ok) {
              toast.success("Receipt email sent successfully!", { id: emailToastId });
              setEmailSent(email);
              setTimeout(() => setEmailSent(null), 3000);
            } else {
              toast.error("Failed to send email: " + (res?.error || "Unknown error"), { id: emailToastId });
            }
          })
          .catch((err: any) => {
            console.error("Receipt email dispatch failed:", err);
            toast.error("Error sending email: " + String(err), { id: emailToastId });
          });
      })
      .catch((err: any) => {
        console.error("Failed to import sendPurchaseReceiptEmailFn:", err);
        toast.error("Failed to load email service.", { id: emailToastId });
      });
  };

  if (!order) {
    return (
      <div className="flex-1 grid place-items-center text-muted-foreground p-12 text-center">
        <div>
          <RIcon className="h-10 w-10 mx-auto opacity-40" />
          <p className="mt-3">Select or create an order to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* Menu */}
      <div className="flex-1 min-w-0 flex flex-col border-r border-border">
        <div className="p-4 border-b border-border bg-card flex items-center gap-3 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="flex-1 min-w-[200px] rounded-md border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  cat === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((item) => (
              <button
                key={item.id}
                disabled={!item.available}
                onClick={() => addLine(order.id, item)}
                className="text-left rounded-lg border bg-card hover:border-primary hover:shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden flex flex-col"
              >
                {item.image && (
                  <div className="h-28 w-full overflow-hidden bg-gray-100">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-accent font-semibold">
                    {item.category}
                  </div>
                  <div className="mt-1 font-medium text-sm leading-tight">{item.name}</div>
                  {item.description && (
                    <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </div>
                  )}
                  <div className="mt-2 font-semibold">₹{item.price}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart */}
      <aside className="w-[400px] flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Order</div>
              <div className="font-semibold">
                #{order.number} · <span className="capitalize">{order.channel}</span>
                {table && <> · Table {table.label}</>}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {order.guests ?? 1}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {order.lines.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No items yet — tap a menu item.
            </div>
          ) : (
            <ul className="divide-y">
              {order.lines.map((l) => {
                const lineGross = l.unitPrice * l.qty;
                const lineNet = lineGross * (1 - (l.discountPct ?? 0) / 100);
                return (
                  <li key={l.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{l.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {currency(l.unitPrice)} each
                        </div>
                        {l.discountPct ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold bg-warning/20 text-warning-foreground px-1.5 py-0.5 rounded">
                            <Tag className="h-3 w-3" /> -{l.discountPct}%
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateLine(order.id, l.id, { qty: Math.max(1, l.qty - 1) })
                          }
                          className="h-7 w-7 rounded border grid place-items-center hover:bg-secondary"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{l.qty}</span>
                        <button
                          onClick={() => updateLine(order.id, l.id, { qty: l.qty + 1 })}
                          className="h-7 w-7 rounded border grid place-items-center hover:bg-secondary"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="w-20 text-right text-sm font-semibold">
                        {l.discountPct ? (
                          <>
                            <div className="line-through text-muted-foreground text-[11px] font-normal">
                              {currency(lineGross)}
                            </div>
                            <div>{currency(lineNet)}</div>
                          </>
                        ) : (
                          currency(lineGross)
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          const v = window.prompt("Line discount %", String(l.discountPct ?? 0));
                          if (v === null) return;
                          const pct = Math.max(0, Math.min(100, Number(v) || 0));
                          updateLine(order.id, l.id, { discountPct: pct });
                        }}
                        className="text-[11px] inline-flex items-center gap-1 text-accent hover:underline"
                      >
                        <Percent className="h-3 w-3" /> line discount
                      </button>
                      <button
                        onClick={() => removeLine(order.id, l.id)}
                        className="text-[11px] inline-flex items-center gap-1 text-destructive hover:underline ml-auto"
                      >
                        <Trash2 className="h-3 w-3" /> remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t bg-secondary/30 p-4 space-y-1.5 text-sm">
          <Row
            label="Subtotal"
            value={currency(totals.subtotal + totals.discount - totals.subtotal * 0)}
            muted
          />
          {totals.discount > 0 && (
            <Row label="Discount" value={`- ${currency(totals.discount)}`} muted />
          )}
          <Row label={`Tax (${(taxRate * 100).toFixed(0)}%)`} value={currency(totals.tax)} muted />
          {totals.tip > 0 && <Row label="Tip" value={currency(totals.tip)} muted />}
          <div className="border-t my-1.5" />
          <Row label="Total" value={currency(totals.total)} bold />
          {paid > 0 && (
            <>
              <Row label="Paid" value={currency(paid)} muted />
              <Row label="Balance" value={currency(balance)} bold />
            </>
          )}
        </div>

        <div className="p-3 grid grid-cols-2 gap-2 border-t">
          <button
            onClick={() => {
              const v = window.prompt("Order discount %", String(order.discountPct ?? 0));
              if (v === null) return;
              setOrderDiscount(order.id, Math.max(0, Math.min(100, Number(v) || 0)));
            }}
            className="rounded-md border py-2 text-xs font-medium hover:bg-secondary inline-flex items-center justify-center gap-1"
          >
            <Percent className="h-3.5 w-3.5" /> Order discount
          </button>
          <button
            onClick={() => {
              const v = window.prompt("Tip amount", String(order.tipAmount ?? 0));
              if (v === null) return;
              setTip(order.id, Math.max(0, Number(v) || 0));
            }}
            className="rounded-md border py-2 text-xs font-medium hover:bg-secondary"
          >
            Add tip
          </button>
          <button
            onClick={() => setSplitOpen(true)}
            disabled={order.lines.length === 0}
            className="rounded-md border py-2 text-xs font-medium hover:bg-secondary inline-flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Split className="h-3.5 w-3.5" /> Split bill
          </button>
          <button
            onClick={print}
            className="rounded-md border py-2 text-xs font-medium hover:bg-secondary inline-flex items-center justify-center gap-1"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          {emailReceiptsEnabled && (
            <button
              onClick={sendEmail}
              className="col-span-2 rounded-md border py-2 text-xs font-medium hover:bg-secondary inline-flex items-center justify-center gap-1"
            >
              <Mail className="h-3.5 w-3.5" /> Email receipt
            </button>
          )}
          <button
            onClick={() => {
              if (window.confirm(`Void order #${order.number}?`)) {
                voidOrder(order.id);
                onOrderClosed();
              }
            }}
            className="rounded-md border border-destructive/30 text-destructive py-2 text-xs font-medium hover:bg-destructive/10"
          >
            Void
          </button>
          <button
            onClick={() => setPayOpen(true)}
            disabled={order.lines.length === 0}
            className="rounded-md bg-primary text-primary-foreground py-2 text-xs font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1"
          >
            <CreditCard className="h-3.5 w-3.5" /> Pay {currency(balance)}
          </button>
        </div>

        {emailSent && (
          <div className="px-3 pb-3">
            <div className="rounded-md bg-success/15 text-success-foreground text-xs px-3 py-2">
              Receipt emailed to <span className="font-medium">{emailSent}</span>
            </div>
          </div>
        )}
      </aside>

      {payOpen && (
        <SplitPaymentDialog
          order={order}
          totals={totals}
          balanceDue={balance}
          onClose={() => setPayOpen(false)}
          onPay={(payments: Payment[]) => {
            payments.forEach((p) => addPayment(order.id, p));
            const totalPaid = paid + payments.reduce((s, p) => s + p.amount, 0);
            if (totalPaid + 0.001 >= totals.total) {
              closeOrder(order.id);
              setPayOpen(false);
              onOrderClosed();
            } else {
              setPayOpen(false);
            }
          }}
        />
      )}

      {splitOpen && (
        <SplitBillDialog order={order} taxRate={taxRate} onClose={() => setSplitOpen(false)} />
      )}

      {showReceipt && (
        <div className="print-area fixed inset-0 bg-white z-50 overflow-auto">
          <div className="no-print sticky top-0 flex justify-end gap-2 p-3 bg-white border-b">
            <button
              onClick={() => setShowReceipt(false)}
              className="text-sm px-3 py-1.5 rounded border"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground"
            >
              Print
            </button>
          </div>
          <Receipt order={order} totals={totals} cashierName={user?.name} />
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${bold ? "text-base font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}
    >
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}
