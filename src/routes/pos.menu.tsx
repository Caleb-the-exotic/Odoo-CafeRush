import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useMemo, useState, useEffect } from "react";
import { usePosMenu, usePosOrders, usePosTables } from "@/store";
import { currency } from "@/lib/pos/format";
import { Plus, Minus, Trash2, Send, CheckCircle2, Download, CreditCard, Smartphone, Clock, ChefHat, Bell, Bike } from "lucide-react";
import { CustomerChatbot } from "@/components/CustomerChatbot";
import { usePersisted, storeKeys, type CustomerRating } from "@/store/admin";
import { toast } from "sonner";
import { dbSubmitRatingFn } from "./dbStoreFn";
import { getOrderCookInfo, DISH_COOK_LABEL } from "@/lib/pos/dishTimings";

export const Route = createFileRoute("/pos/menu")({
  head: () => ({
    meta: [
      { title: "Menu — OdooCafé" },
      { name: "description", content: "Browse our menu and place an online order." },
    ],
  }),
  component: PublicMenu,
});

interface CartLine {
  itemId: string;
  qty: number;
}



function PublicMenu() {
  const items = usePosMenu((s) => s.items);
  const createOnlineOrder = usePosOrders((s) => s.createOnlineOrder);
  const updateDeliveryStatus = usePosOrders((s) => s.updateDeliveryStatus);

  const [ratings, setRatings] = usePersisted<CustomerRating[]>(storeKeys.ratings, []);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [name, setName] = useState(() => {
    try {
      const stored = sessionStorage.getItem("cafe.customer");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.name || "";
      }
    } catch (e) {
      // ignore
    }
    return "";
  });

  const [email, setEmail] = useState(() => {
    try {
      const stored = sessionStorage.getItem("cafe.customer");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.email || "";
      }
    } catch (e) {
      // ignore
    }
    return "";
  });
  interface SavedOrder {
    number: number;
    customerName: string;
    table: string;
    items: Array<{ name: string; price: number; qty: number; total: number }>;
    subtotal: number;
    tax: number;
    total: number;
    timestamp: string;
  }

  const [submitted, setSubmitted] = useState<number | null>(() => {
    try {
      const n = sessionStorage.getItem("cafe.activeOrderNumber");
      return n ? Number(n) : null;
    } catch {
      return null;
    }
  });
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem("cafe.activeOrderId");
    } catch {
      return null;
    }
  });
  const [lastOrder, setLastOrder] = useState<SavedOrder | null>(() => {
    try {
      const s = sessionStorage.getItem("cafe.activeOrder");
      return s ? (JSON.parse(s) as SavedOrder) : null;
    } catch {
      return null;
    }
  });
  // Whether to show the full-screen tracker (vs. the menu with a small banner).
  const [showTracker, setShowTracker] = useState<boolean>(() => {
    try {
      return !!sessionStorage.getItem("cafe.activeOrderId");
    } catch {
      return false;
    }
  });

  // Sandbox Payment Gateway states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"card" | "upi">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"checkout" | "select_table">("checkout");

  const tables = usePosTables((s) => s.tables);
  const seat = usePosTables((s) => s.seat);

  const selectedTable = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      return sessionStorage.getItem("cafe.customer.table") || "";
    } catch {
      return "";
    }
  }, []);

  const tableLabel = useMemo(() => {
    return tables.find((t) => t.id === selectedTable)?.label || "";
  }, [selectedTable, tables]);

  const subtotal = useMemo(
    () =>
      cart.reduce((sum, c) => {
        const it = items.find((i) => i.id === c.itemId);
        return sum + (it ? it.price * c.qty : 0);
      }, 0),
    [cart, items],
  );

  const cats = Array.from(new Set(items.map((i) => i.category)));

  const change = (itemId: string, delta: number) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.itemId === itemId);
      if (!ex) return delta > 0 ? [...prev, { itemId, qty: 1 }] : prev;
      const qty = ex.qty + delta;
      if (qty <= 0) return prev.filter((c) => c.itemId !== itemId);
      return prev.map((c) => (c.itemId === itemId ? { ...c, qty } : c));
    });
  };

  useEffect(() => {
    const pendingItemName = sessionStorage.getItem("pending_add_to_cart_item");
    if (pendingItemName && items.length > 0) {
      const matchedItem = items.find(
        (it) => it.name.toLowerCase() === pendingItemName.toLowerCase()
      );
      if (matchedItem) {
        change(matchedItem.id, 1);
        toast.success(`Added ${matchedItem.name} to your order!`);
      }
      sessionStorage.removeItem("pending_add_to_cart_item");
    }
  }, [items]);

  const submit = (tableId?: string, label?: string) => {
    if (cart.length === 0 || !name.trim()) return;
    
    const orderItems = cart
      .map((c) => {
        const item = items.find((i) => i.id === c.itemId);
        return item ? { item, qty: c.qty } : null;
      })
      .filter((x): x is { item: any; qty: number } => x !== null);

    const targetTableId = tableId || selectedTable || undefined;
    const targetTableLabel = label || tableLabel || "None";

    const order = createOnlineOrder({
      customerName: name.trim(),
      tableId: targetTableId,
      items: orderItems,
    });

    // Seat the table in the pos store
    if (targetTableId) {
      seat(targetTableId, order.id);
    }

    const orderData = {
      number: order.number,
      customerName: name.trim(),
      table: targetTableLabel,
      items: cart.map((c) => {
        const it = items.find((i) => i.id === c.itemId)!;
        return {
          name: it.name,
          price: it.price,
          qty: c.qty,
          total: it.price * c.qty,
        };
      }),
      subtotal,
      tax: subtotal * 0.05,
      total: subtotal * 1.05,
      timestamp: new Date().toISOString(),
    };

    setLastOrder(orderData);
    setSubmitted(order.number);
    setSubmittedOrderId(order.id);
    setShowTracker(true);
    // Persist the active order so the tracker survives a page reload and a
    // notification can be shown until the customer dismisses it.
    try {
      sessionStorage.setItem("cafe.activeOrderId", order.id);
      sessionStorage.setItem("cafe.activeOrderNumber", String(order.number));
      sessionStorage.setItem("cafe.activeOrder", JSON.stringify(orderData));
      if (targetTableId) {
        sessionStorage.setItem("cafe.customer.table", targetTableId);
      }
    } catch {
      // ignore storage errors
    }

    // Trigger SMTP receipt email in background if email is provided
    if (email.trim()) {
      import("./login")
        .then((m) => {
          m.sendPurchaseReceiptEmailFn({
            data: {
              email: email.trim(),
              customerName: name.trim(),
              orderNumber: String(order.number),
              items: orderData.items,
              subtotal: orderData.subtotal,
              discount: 0,
              tax: orderData.tax,
              total: orderData.total,
              tableLabel: targetTableLabel !== "None" ? targetTableLabel : undefined,
            },
          }).catch((err: any) => console.error("Receipt email dispatch failed:", err));
        })
        .catch((err: any) => console.error("Failed to import sendPurchaseReceiptEmailFn:", err));
    }

    setCart([]);
  };

  const downloadInvoice = () => {
    if (!lastOrder) return;
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lastOrder, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `invoice-${lastOrder.number}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Live delivery status for the submitted order
  const orders = usePosOrders((s) => s.orders);
  const liveOrder = submittedOrderId ? orders.find((o) => o.id === submittedOrderId) : null;

  // The order is finished when it has been served, or it was deleted by an
  // employee after completion (gone from the synced order list).
  const orderDeleted = !!submittedOrderId && orders.length > 0 && !liveOrder;
  const orderServed = liveOrder?.deliveryStatus === "served";
  const canDismissActiveOrder = orderServed || orderDeleted;

  // Forget the active order everywhere (state + sessionStorage).
  const clearActiveOrder = () => {
    setSubmitted(null);
    setSubmittedOrderId(null);
    setLastOrder(null);
    setShowTracker(false);
    setUserRating(0);
    setReviewComment("");
    setRatingSubmitted(false);
    try {
      sessionStorage.removeItem("cafe.activeOrderId");
      sessionStorage.removeItem("cafe.activeOrderNumber");
      sessionStorage.removeItem("cafe.activeOrder");
    } catch {
      // ignore
    }
  };

  // If the employee deleted the completed order, auto-clear the customer view.
  useEffect(() => {
    if (orderDeleted) clearActiveOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderDeleted]);

  // Delivery tracker stages config
  const TRACKER_STAGES: Array<{
    key: "received" | "preparing" | "ready" | "served";
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    desc: string;
  }> = [
    { key: "received", label: "Order Received", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", desc: "We got your order!" },
    { key: "preparing", label: "Preparing", icon: ChefHat, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", desc: "Chef is cooking your food" },
    { key: "ready", label: "Ready!", icon: Bell, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", desc: "Your food is ready" },
    { key: "served", label: "Served", icon: Bike, color: "text-purple-600", bg: "bg-purple-50 border-purple-200", desc: "Enjoy your meal! 🎉" },
  ];

  const stageIndex = TRACKER_STAGES.findIndex((s) => s.key === (liveOrder?.deliveryStatus ?? "received"));
  const currentStage = TRACKER_STAGES[Math.max(0, stageIndex)];

  // Live cook countdown for customer
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const cookEndAt = liveOrder?.cookEndAt;
  const cookSecsLeft = cookEndAt ? Math.max(0, Math.round((cookEndAt - nowMs) / 1000)) : null;
  const cookExpired = cookEndAt ? nowMs >= cookEndAt : false;
  // Estimate cook info from cart for immediate display (before liveOrder hydrates)
  const cartItemIds = cart.map((c) => c.itemId);
  const { label: estimatedCookLabel } = getOrderCookInfo(cartItemIds);

  if (showTracker && submittedOrderId) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-[#fdf6f0] to-[#f5e8d8] flex flex-col items-center justify-start p-4 pt-10">
          {/* Header */}
          <Link to="/" className="mb-6">
            <img src="/Odoocafe white.png" alt="OdooCafé" className="h-10 w-auto object-contain opacity-80" />
          </Link>

          <div className="w-full max-w-lg">
            {/* Hero card */}
            <div className="bg-white rounded-2xl shadow-xl border border-[#e8d5c4] overflow-hidden">
              {/* Top accent */}
              <div className="h-2 bg-gradient-to-r from-[#5D1E31] via-[#8B2D45] to-[#C4734A]" />

              <div className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Payment Confirmed!</h1>
                    <p className="text-xs text-gray-500">Order <span className="font-mono font-bold text-gray-800">#{submitted}</span>{tableLabel && <> · Table {tableLabel}</>}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xs text-gray-400">Total paid</div>
                    <div className="text-lg font-bold text-[#5D1E31]">₹{lastOrder ? lastOrder.total.toFixed(2) : "—"}</div>
                  </div>
                </div>

                {/* Ordered items */}
                {lastOrder && (
                  <div className="mt-3 bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                    {lastOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-gray-700">
                        <span>{item.qty}× {item.name}</span>
                        <span className="font-semibold">₹{item.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tracker */}
              <div className="px-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-800">Live Order Tracker</h2>
                  {stageIndex < TRACKER_STAGES.length - 1 && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                      Live updates
                    </span>
                  )}
                </div>

                {/* Cook countdown banner */}
                {!cookExpired && cookSecsLeft !== null && cookSecsLeft > 0 ? (
                  <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                    <ChefHat className="h-5 w-5 text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-amber-800">Cooking in progress…</div>
                      <div className="text-[10px] text-amber-600 mt-0.5">Expected ready time: {cookEndAt ? new Date(cookEndAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}</div>
                    </div>
                    <div className="font-mono text-lg font-bold text-amber-700 shrink-0">
                      {String(Math.floor(cookSecsLeft / 60)).padStart(2, "0")}:{String(cookSecsLeft % 60).padStart(2, "0")}
                    </div>
                  </div>
                ) : cookExpired ? (
                  <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-800">Cooking complete!</div>
                      <div className="text-[10px] text-emerald-600 mt-0.5">Your food is ready to be served.</div>
                    </div>
                  </div>
                ) : estimatedCookLabel ? (
                  <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                    <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-blue-800">Estimated cook time: {estimatedCookLabel}</div>
                      <div className="text-[10px] text-blue-600 mt-0.5">Timer starts when your order is confirmed.</div>
                    </div>
                  </div>
                ) : null}

                {/* Progress bar */}
                <div className="relative mb-5">
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" />
                  <div
                    className="absolute top-4 left-4 h-0.5 bg-gradient-to-r from-[#5D1E31] to-[#C4734A] transition-all duration-700 ease-in-out"
                    style={{ width: `${(stageIndex / (TRACKER_STAGES.length - 1)) * (100 - 8)}%`, right: "1rem" }}
                  />
                  <div className="relative flex justify-between">
                    {TRACKER_STAGES.map((stage, idx) => {
                      const Icon = stage.icon;
                      const done = idx <= stageIndex;
                      const active = idx === stageIndex;
                      return (
                        <div key={stage.key} className="flex flex-col items-center gap-1.5 w-16">
                          <div
                            className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                              done
                                ? "bg-[#5D1E31] border-[#5D1E31] shadow-md"
                                : "bg-white border-gray-300"
                            } ${active ? "ring-4 ring-[#5D1E31]/20 scale-110" : ""}`}
                          >
                            {done && !active ? (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            ) : active ? (
                              <Icon className={`h-4 w-4 ${done ? "text-white" : "text-gray-400"}`} />
                            ) : (
                              <Icon className="h-4 w-4 text-gray-300" />
                            )}
                          </div>
                          <span className={`text-[9px] text-center leading-tight font-semibold ${
                            done ? "text-[#5D1E31]" : "text-gray-400"
                          }`}>{stage.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Current stage detail */}
                <div className={`rounded-xl border p-3 flex items-center gap-3 ${currentStage.bg} transition-all duration-500`}>
                  <div className={`h-9 w-9 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0`}>
                    {stageIndex < TRACKER_STAGES.length - 1 ? (
                      <div className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ color: "currentColor" }} />
                    ) : (
                      <currentStage.icon className={`h-5 w-5 ${currentStage.color}`} />
                    )}
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${currentStage.color}`}>{currentStage.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{currentStage.desc}</div>
                  </div>
                  {stageIndex < TRACKER_STAGES.length - 1 && (
                    <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock className="h-3 w-3" />
                      Updating...
                    </div>
                  )}
                </div>
              </div>

              {/* Rating & actions */}
              <div className="px-6 pb-6">
                {!ratingSubmitted ? (
                  <div className="mt-2 border-t pt-4">
                    <h3 className="font-semibold text-xs text-gray-800">Rate your experience</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Your feedback helps us improve!</p>
                    <div className="flex items-center gap-1 my-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setUserRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform active:scale-95 focus:outline-none"
                        >
                          <svg
                            className={`size-6 ${
                              star <= (hoverRating || userRating)
                                ? "text-[#fbbf24] fill-[#fbbf24]"
                                : "text-[#d1d5db]"
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Tell us what you liked or how we can improve..."
                      className="w-full text-xs rounded-md border bg-white px-3 py-2 outline-none focus:ring-1 focus:ring-[#5D1E31] min-h-[50px] resize-none"
                    />
                    <button
                      type="button"
                      disabled={userRating === 0}
                      onClick={() => {
                        const newFeedback: CustomerRating = {
                          id: Math.random().toString(36).substring(2, 10),
                          customerName: name.trim() || "Guest",
                          orderNumber: String(submitted),
                          rating: userRating,
                          comment: reviewComment.trim(),
                          createdAt: Date.now(),
                        };
                        setRatings([newFeedback, ...ratings]);
                        dbSubmitRatingFn({ data: { rating: newFeedback } }).catch((err: any) =>
                          console.error("Failed to save rating to MongoDB:", err),
                        );
                        setRatingSubmitted(true);
                        toast.success("Thank you for your rating!");
                      }}
                      className="mt-2 w-full rounded-lg bg-[#5D1E31] text-white py-2 text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      Submit Review
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 border-t pt-4 bg-green-50 rounded-xl p-3 text-center animate-in fade-in duration-300">
                    <span className="text-lg">🌟</span>
                    <h4 className="font-semibold text-xs mt-1 text-green-800">Review Submitted!</h4>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={downloadInvoice}
                    className="flex-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 border"
                  >
                    <Download className="h-3.5 w-3.5" /> Invoice
                  </button>
                  {canDismissActiveOrder ? (
                    <button
                      onClick={clearActiveOrder}
                      className="flex-1 rounded-lg bg-[#5D1E31] text-white px-3 py-2 text-xs font-semibold hover:opacity-90"
                    >
                      Done — New order
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowTracker(false)}
                      className="flex-1 rounded-lg border border-[#5D1E31] text-[#5D1E31] px-3 py-2 text-xs font-semibold hover:bg-[#5D1E31]/5"
                    >
                      Back to menu
                    </button>
                  )}
                </div>
                {!canDismissActiveOrder && (
                  <p className="mt-2 text-[10px] text-center text-gray-400">
                    Your order is still being prepared. You can clear it once it's delivered.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <CustomerChatbot />
      </>
    );
  }

  return (
    <>
      {/* Active-order notification — shows when an order is in progress but the
          customer is browsing the menu. Persists across reloads; can be removed
          only after the order is delivered. */}
      {submittedOrderId && !showTracker && (
        <div className="fixed bottom-4 right-4 z-50 w-[300px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#e8d5c4] bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="h-1.5 bg-gradient-to-r from-[#5D1E31] via-[#8B2D45] to-[#C4734A]" />
          <div className="p-3.5">
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                {orderServed ? (
                  <Bike className="h-4 w-4 text-purple-600" />
                ) : (
                  <ChefHat className="h-4 w-4 text-amber-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-900">
                  Order #{submitted} · {currentStage.label}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">{currentStage.desc}</div>
              </div>
              {canDismissActiveOrder && (
                <button
                  onClick={clearActiveOrder}
                  className="shrink-0 text-gray-400 hover:text-gray-700 font-bold leading-none p-1"
                  title="Dismiss"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={() => setShowTracker(true)}
              className="mt-2.5 w-full rounded-lg bg-[#5D1E31] text-white py-1.5 text-[11px] font-semibold hover:opacity-90"
            >
              View live tracker
            </button>
          </div>
        </div>
      )}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <img
                  src="/Odoocafe white.png"
                  alt="OdooCafé"
                  className="h-10 w-auto object-contain hover:opacity-85 transition-opacity"
                />
              </Link>
            </div>
            {tableLabel && (
              <div className="bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-xs font-semibold">
                Table {tableLabel}
              </div>
            )}
          </div>
          <h1 className="mt-6 text-4xl md:text-5xl font-semibold max-w-2xl leading-tight">
            Order from our kitchen, ready when you arrive.
          </h1>
          <p className="mt-3 opacity-80 max-w-xl">
            Wood-fired pizza, fresh pasta, and seasonal small plates.
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-10">
          {cats.map((c) => (
            <section key={c}>
              <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight border-b pb-2 mb-1">{c}</h2>
              <div className="mt-3 grid sm:grid-cols-2 gap-4">
                {items
                  .filter((i) => i.category === c)
                  .map((i) => {
                    const inCart = cart.find((c) => c.itemId === i.id);
                    // Compute average rating for this item
                    const itemRatings = ratings.filter((r) => (r as any).itemId === i.id);
                    const avgRating =
                      itemRatings.length > 0
                        ? itemRatings.reduce((s, r) => s + r.rating, 0) / itemRatings.length
                        : 0;
                    const displayRating = avgRating > 0 ? avgRating : 4 + Math.random() * 0.9; // fallback display

                    return (
                      <div
                        key={i.id}
                        className="w-full rounded-xl bg-card shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col"
                      >
                        {/* Image */}
                        <div className="relative h-44 w-full overflow-hidden bg-muted">
                          {i.image ? (
                            <img
                              src={i.image}
                              alt={i.name}
                              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-4xl bg-muted/50">
                              🍽️
                            </div>
                          )}
                          {!i.available && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white text-xs font-bold uppercase tracking-wide bg-black/60 px-2 py-1 rounded">Unavailable</span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex flex-col p-4 grow">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h3 className="font-semibold text-foreground text-sm leading-snug">{i.name}</h3>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-bold text-foreground">{currency(i.price)}</div>
                            </div>
                          </div>

                          {i.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                              {i.description}
                            </p>
                          )}

                          {/* Cook time badge */}
                          {DISH_COOK_LABEL[i.id] && (
                            <div className="flex items-center gap-1 mb-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                <Clock className="h-2.5 w-2.5" />
                                {DISH_COOK_LABEL[i.id]}
                              </span>
                            </div>
                          )}

                          <div className="mt-auto flex items-center justify-between pt-2">
                            {/* Add / qty controls */}
                            {!i.available ? (
                              <button
                                disabled
                                className="rounded-full bg-muted text-muted-foreground text-xs font-semibold px-4 py-1.5 cursor-not-allowed border"
                              >
                                Unavailable
                              </button>
                            ) : inCart ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => change(i.id, -1)}
                                  className="h-7 w-7 rounded-full border bg-background grid place-items-center hover:bg-muted transition"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-6 text-center text-sm font-semibold">{inCart.qty}</span>
                                <button
                                  onClick={() => change(i.id, +1)}
                                  className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center hover:bg-primary/90 transition"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => change(i.id, +1)}
                                className="rounded-full bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 inline-flex items-center gap-1 hover:bg-primary/90 transition"
                              >
                                <Plus className="h-3 w-3" /> Add
                              </button>
                            )}

                            {/* Stars */}
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`size-3.5 ${
                                    star <= Math.round(displayRating)
                                      ? "text-[#fbbf24] fill-[#fbbf24]"
                                      : "text-[#d1d5db] fill-[#d1d5db]"
                                  }`}
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>

        <aside className="lg:sticky lg:top-6 self-start bg-card border rounded-lg p-5 h-fit">
          <div className="font-semibold font-serif text-lg">Your order</div>
          {cart.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Add items from the menu to begin.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {cart.map((c) => {
                const it = items.find((i) => i.id === c.itemId)!;
                return (
                  <li key={c.itemId} className="py-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{it.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.qty} × {currency(it.price)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{currency(it.price * c.qty)}</div>
                    <button
                      onClick={() => change(c.itemId, -c.qty)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 flex justify-between text-sm border-t pt-3">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{currency(subtotal)}</span>
          </div>

          <div className="mt-4">
            <label className="text-xs text-muted-foreground font-medium">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="e.g. Jamie"
            />
          </div>

          <div className="mt-3">
            <label className="text-xs text-muted-foreground font-medium">Your email (for receipt)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="name@gmail.com"
            />
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0 || !name.trim()}
            className="mt-4 w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="h-4 w-4" /> Place order
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            Tax & gratuity calculated at the counter.
          </p>
        </aside>
      </div>

      {/* ── SANDBOX PAYMENT GATEWAY MODAL ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#5D1E31] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-semibold text-lg">Sandbox Payment Gateway</h3>
                <p className="text-[11px] opacity-80">Test Environment - No real money charged</p>
              </div>
              <button 
                onClick={() => {
                  if (!isProcessingPayment) {
                    setShowPaymentModal(false);
                    setPaymentSuccess(false);
                    setPaymentStep("checkout");
                  }
                }}
                className="text-white hover:opacity-80 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Total Indicator */}
            <div className="bg-[#fdf6f0] border-b p-4 text-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Amount to Pay</span>
              <div className="text-2xl font-bold text-[#5D1E31] mt-0.5">₹{(subtotal * 1.05).toFixed(2)}</div>
            </div>

            {/* Body */}
            {paymentSuccess ? (
              <div className="p-8 text-center space-y-4 animate-in zoom-in-95 duration-300">
                <CheckCircle2 className="size-16 text-success mx-auto animate-bounce" />
                <h4 className="font-bold text-lg text-foreground">Payment Successful!</h4>
                <p className="text-xs text-muted-foreground">Finalizing your payment...</p>
              </div>
            ) : isProcessingPayment ? (
              <div className="p-8 text-center space-y-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-[#5D1E31] border-r-transparent align-[-0.125em] mx-auto" />
                <h4 className="font-medium text-sm text-foreground">Processing Secure Transaction...</h4>
                <p className="text-xs text-muted-foreground">Communicating with Sandbox Gateway...</p>
              </div>
            ) : paymentStep === "select_table" ? (
              <div className="p-5 space-y-4">
                <div className="text-center">
                  <h4 className="font-bold text-sm text-foreground">Allot a Table</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Select a table to seat and start tracking your order.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {tables.map((t) => {
                    const isSeated = t.status === "seated";
                    const isMerged = !!t.mergedInto;
                    if (isMerged) return null;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={isSeated}
                        onClick={() => {
                          setShowPaymentModal(false);
                          setPaymentSuccess(false);
                          setIsProcessingPayment(false);
                          setPaymentStep("checkout");
                          submit(t.id, t.label);
                        }}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 ${
                          isSeated
                            ? "bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50"
                            : "bg-card border-border hover:border-primary hover:bg-primary/5 active:scale-95 cursor-pointer"
                        }`}
                      >
                        <span className="text-[10px] text-muted-foreground">Table</span>
                        <span className="text-sm font-bold">{t.label}</span>
                        <span className="text-[9px] text-muted-foreground">{t.seats} seats</span>
                        <span className={`text-[8px] font-semibold mt-1 px-1.5 py-0.5 rounded-full ${
                          isSeated ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        }`}>
                          {isSeated ? "Occupied" : "Free"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Payment Methods tabs */}
                <div className="flex bg-muted p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPayMethod("card")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all inline-flex items-center justify-center gap-1.5 ${
                      payMethod === "card" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <CreditCard className="size-3.5" /> Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod("upi")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all inline-flex items-center justify-center gap-1.5 ${
                      payMethod === "upi" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <Smartphone className="size-3.5" /> UPI QR
                  </button>
                </div>

                {/* Card View */}
                {payMethod === "card" && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Card Number</label>
                        <button
                          type="button"
                          onClick={() => {
                            setCardNumber("4111 1111 1111 1111");
                            setCardExpiry("12/30");
                            setCardCvv("123");
                            setCardHolder(name || "Guest User");
                          }}
                          className="text-[10px] text-accent hover:underline font-bold"
                        >
                          Quick Fill Test Card
                        </button>
                      </div>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 16);
                          const matches = val.match(/\d{4,24}/g);
                          const match = (matches && matches[0]) || "";
                          const parts = [];
                          for (let i = 0, len = match.length; i < len; i += 4) {
                             parts.push(match.substring(i, i + 4));
                          }
                          setCardNumber(parts.length > 0 ? parts.join(" ") : val);
                        }}
                        placeholder="4111 1111 1111 1111"
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Expiry</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          placeholder="MM/YY"
                          maxLength={5}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, "");
                            if (val.length > 2) val = val.substring(0, 2) + "/" + val.substring(2, 4);
                            setCardExpiry(val);
                          }}
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-center"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">CVV</label>
                        <input
                          type="password"
                          value={cardCvv}
                          placeholder="123"
                          maxLength={3}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-center"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="John Doe"
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                        required
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!cardNumber || !cardExpiry || !cardCvv || !cardHolder}
                      onClick={() => {
                        setIsProcessingPayment(true);
                        setTimeout(() => {
                          setPaymentSuccess(true);
                          setTimeout(() => {
                            setPaymentStep("select_table");
                            setPaymentSuccess(false);
                            setIsProcessingPayment(false);
                          }, 1200);
                        }, 1800);
                      }}
                      className="w-full rounded-xl bg-[#5D1E31] text-white py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 mt-2 cursor-pointer"
                    >
                      Pay ₹{(subtotal * 1.05).toFixed(2)} (Sandbox)
                    </button>
                  </div>
                )}

                {/* UPI View */}
                {payMethod === "upi" && (
                  <div className="text-center space-y-4">
                    <p className="text-xs text-muted-foreground">Scan this dynamically generated code with GPay, PhonePe, Paytm, or any BHIM UPI App:</p>
                    
                    {/* Mock QR Code Visual */}
                    <div className="bg-white border p-3 inline-block rounded-xl shadow-inner">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                          `upi://pay?pa=odoocafe@upi&pn=OdooCafe&am=${(subtotal * 1.05).toFixed(2)}&cu=INR`
                        )}`}
                        alt="UPI QR Code"
                        className="h-32 w-32 object-contain"
                      />
                      <div className="text-[10px] font-mono text-muted-foreground mt-1.5">Merchant: odoocafe@upi</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProcessingPayment(true);
                        setTimeout(() => {
                          setPaymentSuccess(true);
                          setTimeout(() => {
                            setPaymentStep("select_table");
                            setPaymentSuccess(false);
                            setIsProcessingPayment(false);
                          }, 1200);
                        }, 1800);
                      }}
                      className="w-full rounded-xl bg-success text-white py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Simulate App Payment Success
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <CustomerChatbot />
    </>
  );
}
