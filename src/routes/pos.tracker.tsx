import React, { useEffect, useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/pos/AppShell";
import { usePosOrders, usePosTables } from "@/store";
import {
  CheckCircle2,
  ChefHat,
  Bell,
  Bike,
  Clock,
  User,
  ShoppingBag,
  ArrowRight,
  Timer,
  Flame,
  FileDown,
  Trash2,
} from "lucide-react";
import { currency } from "@/lib/pos/format";
import { DISH_COOK_SECS } from "@/lib/pos/dishTimings";

export const Route = createFileRoute("/pos/tracker")({
  head: () => ({ meta: [{ title: "Order Tracker — OdooCafé" }] }),
  component: OrderTrackerPage,
});

type DeliveryStatus = "received" | "preparing" | "ready" | "served";

const STAGES: Array<{
  key: DeliveryStatus;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  ring: string;
  desc: string;
}> = [
  {
    key: "received",
    label: "Received",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-500",
    ring: "ring-emerald-200",
    desc: "Order logged",
  },
  {
    key: "preparing",
    label: "Preparing",
    icon: ChefHat,
    color: "text-amber-600",
    bg: "bg-amber-500",
    ring: "ring-amber-200",
    desc: "In the kitchen",
  },
  {
    key: "ready",
    label: "Ready",
    icon: Bell,
    color: "text-blue-600",
    bg: "bg-blue-500",
    ring: "ring-blue-200",
    desc: "Ready for delivery",
  },
  {
    key: "served",
    label: "Served",
    icon: Bike,
    color: "text-purple-600",
    bg: "bg-purple-500",
    ring: "ring-purple-200",
    desc: "Delivered ✓",
  },
];

const STATUS_ORDER: DeliveryStatus[] = ["received", "preparing", "ready", "served"];

function getNextStatus(current: DeliveryStatus): DeliveryStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  return idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Format seconds as MM:SS */
function fmtCountdown(secs: number): string {
  if (secs <= 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Get max cook duration (seconds) from an order's lines */
function getOrderMaxCookSec(itemIds: string[]): number {
  if (!itemIds.length) return 0;
  return Math.max(...itemIds.map((id) => DISH_COOK_SECS[id] ?? 0));
}

const downloadCustomerBillPDF = async (order: any) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    unit: "mm",
    format: [80, 195]
  });
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("CafeRush", 40, 12, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Savor the Spices of India", 40, 16, { align: "center" });
  doc.text("123 Tech Park, Bangalore", 40, 20, { align: "center" });
  doc.text("GSTIN: 29AAAAA1111A1Z1", 40, 24, { align: "center" });
  
  doc.text("--------------------------------------------------", 40, 28, { align: "center" });
  
  doc.setFont("helvetica", "bold");
  doc.text(`Bill No: #${order.number}`, 8, 33);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`, 8, 37);
  doc.text(`Channel: ${order.channel || "dine-in"}`, 8, 41);
  
  doc.text("--------------------------------------------------", 40, 45, { align: "center" });
  
  let y = 50;
  doc.setFont("helvetica", "bold");
  doc.text("Item", 8, y);
  doc.text("Qty", 48, y);
  doc.text("Total", 64, y);
  doc.setFont("helvetica", "normal");
  
  y += 5;
  order.lines.forEach((line: any) => {
    doc.text(line.name.substring(0, 20), 8, y);
    doc.text(String(line.qty), 48, y);
    doc.text(`Rs. ${(line.qty * line.unitPrice).toFixed(2)}`, 64, y);
    y += 5;
  });
  
  doc.text("--------------------------------------------------", 40, y, { align: "center" });
  y += 4;
  
  const itemsTotal = order.lines.reduce((s: number, l: any) => s + l.unitPrice * l.qty, 0);
  const subtotal = itemsTotal / 1.05;
  const cgst = subtotal * 0.025;
  const sgst = subtotal * 0.025;
  
  doc.text("Subtotal:", 8, y);
  doc.text(`Rs. ${subtotal.toFixed(2)}`, 64, y);
  y += 4;
  doc.text("CGST (2.5%):", 8, y);
  doc.text(`Rs. ${cgst.toFixed(2)}`, 64, y);
  y += 4;
  doc.text("SGST (2.5%):", 8, y);
  doc.text(`Rs. ${sgst.toFixed(2)}`, 64, y);
  y += 5;
  
  doc.setFont("helvetica", "bold");
  doc.text("Grand Total:", 8, y);
  doc.text(`Rs. ${itemsTotal.toFixed(2)}`, 64, y);
  
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text("--------------------------------------------------", 40, y, { align: "center" });
  y += 5;
  
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for dining with us!", 40, y, { align: "center" });
  y += 4;
  doc.text("Visit again!", 40, y, { align: "center" });
  
  doc.save(`CafeRush-Receipt-${order.number}.pdf`);
};

// ── Individual order card with its own countdown ─────────────────────────────
function OrderCard({
  order,
  updateDeliveryStatus,
  onExpired,
  tables,
  setOrderTable,
}: {
  order: any;
  updateDeliveryStatus: (id: string, status: DeliveryStatus) => void;
  onExpired: (id: string) => void;
  tables: Array<{ id: string; label: string }>;
  setOrderTable: (orderId: string, tableId: string | undefined) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const expiredFiredRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cookEndAt: number | undefined = order.cookEndAt;

  // Derived cook countdown
  const secondsLeft = cookEndAt ? Math.max(0, Math.round((cookEndAt - now) / 1000)) : null;
  const isExpired = cookEndAt ? now >= cookEndAt : false;

  // Max cook seconds for this order (from line items)
  const itemIds = (order.lines ?? []).map((l: any) => l.itemId);
  const totalCookSec = getOrderMaxCookSec(itemIds);
  // Progress bar: how much time is left as a %
  const progressPct =
    cookEndAt && totalCookSec > 0
      ? Math.max(0, Math.round((secondsLeft! / totalCookSec) * 100))
      : 100;

  // Fire onExpired exactly once when timer expires
  useEffect(() => {
    if (isExpired && !expiredFiredRef.current) {
      expiredFiredRef.current = true;
      onExpired(order.id);
    }
  }, [isExpired, order.id, onExpired]);

  const currentStatus = order.deliveryStatus as DeliveryStatus;
  const currentStageIdx = STATUS_ORDER.indexOf(currentStatus);
  const nextStatus = getNextStatus(currentStatus);
  const nextStage = nextStatus ? STAGES.find((s) => s.key === nextStatus) : null;

  // Urgency colour for timer
  const timerColour =
    secondsLeft === null
      ? "text-muted-foreground"
      : secondsLeft <= 60
      ? "text-red-600 animate-pulse"
      : secondsLeft <= 180
      ? "text-amber-600"
      : "text-emerald-600";

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b">
        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <ShoppingBag className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground flex items-center gap-2">
            Order #{order.number}
            <select
              value={order.tableId ?? ""}
              onChange={(e) => setOrderTable(order.id, e.target.value || undefined)}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-semibold border border-border/50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              title="Change table for this order"
            >
              <option value="">No table</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
            {order.customerName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {order.customerName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {order.paidAt
                ? formatTime(order.paidAt)
                : order.closedAt
                ? formatTime(order.closedAt)
                : formatTime(order.createdAt)}
            </span>
          </div>
        </div>

        {/* Live cook timer */}
        {cookEndAt && (
          <div className={`flex flex-col items-end shrink-0 ${timerColour}`}>
            <div className="flex items-center gap-1 text-sm font-mono font-bold">
              <Timer className="h-3.5 w-3.5" />
              {secondsLeft !== null ? fmtCountdown(secondsLeft) : "--:--"}
            </div>
            <span className="text-[10px] opacity-70 mt-0.5">cook time left</span>
          </div>
        )}

        <div className="text-right shrink-0 ml-2 flex items-center gap-2">
          <div>
            <div className="text-xs text-muted-foreground">
              {order.lines.length} item{order.lines.length !== 1 ? "s" : ""}
            </div>
            <div className="text-sm font-bold">
              {currency(order.lines.reduce((s: number, l: any) => s + l.unitPrice * l.qty, 0))}
            </div>
          </div>
          <button
            onClick={() => downloadCustomerBillPDF(order)}
            className="p-1.5 rounded-lg border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0"
            title="Download PDF Bill/Receipt"
          >
            <FileDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cook progress bar */}
      {cookEndAt && totalCookSec > 0 && (
        <div className="px-4 pt-2 pb-0">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              Cooking Progress
            </span>
            <span>
              {secondsLeft !== null && secondsLeft > 0
                ? `${fmtCountdown(secondsLeft)} remaining`
                : "Done!"}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                progressPct <= 20
                  ? "bg-red-500"
                  : progressPct <= 50
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {/* Dish cook times */}
          <div className="flex flex-wrap gap-1.5 mt-1.5 mb-1">
            {(order.lines as any[]).map((l: any) => {
              const secs = DISH_COOK_SECS[l.itemId];
              const mins = secs ? Math.ceil(secs / 60) : null;
              return (
                <span
                  key={l.id}
                  className="inline-flex items-center gap-1 text-[10px] bg-muted/60 border px-1.5 py-0.5 rounded-full"
                >
                  {l.qty}× {l.name}
                  {mins && (
                    <span className="text-muted-foreground/70">({mins}m)</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Order items summary (fallback when no cook time) */}
      {!cookEndAt && (
        <div className="px-4 py-2 border-b bg-card text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
          {order.lines.map((l: any) => (
            <span key={l.id}>
              {l.qty}× {l.name}
            </span>
          ))}
        </div>
      )}

      {/* Stage stepper */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const done = idx <= currentStageIdx;
            const active = idx === currentStageIdx;
            return (
              <div key={stage.key} className="flex flex-col items-center gap-1 flex-1">
                {/* Connector line */}
                {idx > 0 && (
                  <div
                    className={`hidden sm:block h-0.5 w-full ${
                      idx <= currentStageIdx ? "bg-primary" : "bg-border"
                    } -mb-5 -mt-3`}
                  />
                )}
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                    done
                      ? `${stage.bg} border-transparent text-white shadow-md`
                      : "bg-card border-border text-muted-foreground"
                  } ${active ? `ring-4 ${stage.ring} scale-110` : ""}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={`text-[9px] font-semibold text-center mt-1 ${
                    done ? stage.color : "text-muted-foreground/50"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current status label + advance button */}
        <div className="flex items-center justify-between gap-3 mt-2">
          <div
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
              STAGES[currentStageIdx]?.bg ?? "bg-gray-500"
            } text-white`}
          >
            {(() => {
              const CS = STAGES[currentStageIdx];
              if (!CS) return null;
              const CIcon = CS.icon;
              return (
                <>
                  <CIcon className="h-3.5 w-3.5 shrink-0" />
                  {CS.label} — {CS.desc}
                </>
              );
            })()}
          </div>

          {nextStage && nextStatus && (
            <button
              onClick={() => updateDeliveryStatus(order.id, nextStatus)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95 shadow-sm shrink-0"
            >
              Mark as {nextStage.label}
              <ArrowRight className="h-3 w-3" />
            </button>
          )}

          {!nextStatus && (
            <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1 shrink-0">
              <CheckCircle2 className="h-4 w-4" /> Complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function OrderTrackerPage() {
  const orders = usePosOrders((s) => s.orders);
  const updateDeliveryStatus = usePosOrders((s) => s.updateDeliveryStatus);
  const setOrderTable = usePosOrders((s) => s.setOrderTable);
  const deleteOrder = usePosOrders((s) => s.deleteOrder);
  const tables = usePosTables((s) => s.tables);

  // Track which orders have expired and been dismissed from the active list
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const handleExpired = React.useCallback((id: string) => {
    // After a 2-second grace period, remove from active view and update status in MongoDB
    setTimeout(() => {
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      updateDeliveryStatus(id, "served");
    }, 2000);
  }, [updateDeliveryStatus]);

  // Active orders: has deliveryStatus, not served, not dismissed/expired
  const trackableOrders = orders.filter(
    (o) =>
      o.deliveryStatus !== undefined &&
      o.deliveryStatus !== "served" &&
      !dismissed.has(o.id),
  );

  const servedOrders = orders
    .filter((o) => o.deliveryStatus === "served" || dismissed.has(o.id))
    .slice(0, 10);

  return (
    <AppShell>
      <div className="flex flex-col h-screen overflow-hidden">
        <PageHeader
          title="Order Tracker"
          subtitle="Real-time kitchen status and cook countdowns for customer orders."
        />
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Orders */}
          <section>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Active Orders ({trackableOrders.length})
            </h2>

            {trackableOrders.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 text-center">
                <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active orders to track.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Orders appear here once customers place them online.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {trackableOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    updateDeliveryStatus={updateDeliveryStatus}
                    onExpired={handleExpired}
                  tables={tables}
                  setOrderTable={setOrderTable}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Served / Completed Orders */}
          {servedOrders.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Recently Served ({servedOrders.length})
              </h2>
              <div className="grid gap-2">
                {servedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-card rounded-lg border px-4 py-3 flex items-center gap-3 opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">Order #{order.number}</span>
                      {order.customerName && (
                        <span className="text-xs text-muted-foreground ml-2">
                          · {order.customerName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                      {dismissed.has(order.id) ? "Time up" : "Served"}
                    </span>
                    <button
                      onClick={() => downloadCustomerBillPDF(order)}
                      className="ml-1 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold hover:bg-secondary hover:text-foreground transition shrink-0 cursor-pointer"
                      title="Download PDF Receipt"
                    >
                      <FileDown className="h-3.5 w-3.5" /> Receipt
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete order #${order.number}? This removes it for everyone.`)) {
                          deleteOrder(order.id);
                        }
                      }}
                      className="ml-1 inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 text-red-600 px-2 py-1 text-[11px] font-semibold hover:bg-red-100 transition shrink-0 cursor-pointer"
                      title="Delete this completed order"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
