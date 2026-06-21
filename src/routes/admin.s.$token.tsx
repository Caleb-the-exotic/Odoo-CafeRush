import { createFileRoute, Link } from "@tanstack/react-router";
import {
  usePersisted,
  storeKeys,
  type Product,
  type Table,
  type SelfOrderingSettings,
  type Coupon,
  type Order,
  type OrderItem,
  type ProductPromotion,
  type OrderPromotion,
  type CustomerRating,
} from "@/store/admin";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, Plus, Minus, ArrowLeft, CheckCircle2, Tag, CreditCard, Smartphone } from "lucide-react";
import { computeTotals } from "@/lib/admin/pricing";
import { toast } from "sonner";
import { dbSubmitRatingFn } from "./dbStoreFn";

export const Route = createFileRoute("/admin/s/$token")({
  head: () => ({ meta: [{ title: "Order — Bistro POS" }] }),
  component: SelfOrderPage,
});

type Step = "menu" | "cart" | "payment" | "confirmed" | "history";

function SelfOrderPage() {
  const { token } = Route.useParams();
  const [settings] = usePersisted<SelfOrderingSettings>(storeKeys.settings, {
    enabled: false,
    mode: "online",
    bgColor: "#fdf6f0",
    bgImage: "",
  });
  const [tables] = usePersisted<Table[]>(storeKeys.tables, []);
  const [products] = usePersisted<Product[]>(storeKeys.products, []);
  const [coupons] = usePersisted<Coupon[]>(storeKeys.coupons, []);
  const [pp] = usePersisted<ProductPromotion[]>(storeKeys.productPromos, []);
  const [op] = usePersisted<OrderPromotion[]>(storeKeys.orderPromos, []);
  const [orders, setOrders] = usePersisted<Order[]>(storeKeys.orders, []);

  const table = tables.find((t) => t.token === token);
  const [step, setStep] = useState<Step>("menu");
  const [email, setEmail] = useState("");

  // Sandbox Payment Gateway states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"card" | "upi">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [cart, setCart] = useState<Record<string, OrderItem>>({});
  const [couponCode, setCouponCode] = useState("");
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const [ratings, setRatings] = usePersisted<CustomerRating[]>(storeKeys.ratings, []);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );
  const filtered = products.filter(
    (p) =>
      (activeCat === "All" || p.category === activeCat) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const cartItems = Object.values(cart);
  const totals = useMemo(
    () => computeTotals(cartItems, { coupons, productPromos: pp, orderPromos: op, couponCode }),
    [cartItems, coupons, pp, op, couponCode],
  );
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const tableOrders = orders
    .filter((o) => o.tableToken === token)
    .sort((a, b) => b.createdAt - a.createdAt);

  // refresh order statuses from KDS
  useEffect(() => {
    const i = setInterval(() => {
      if (lastOrder) {
        const fresh = JSON.parse(localStorage.getItem(storeKeys.orders) || "[]") as Order[];
        const updated = fresh.find((o) => o.id === lastOrder.id);
        if (updated && updated.status !== lastOrder.status) setLastOrder(updated);
      }
    }, 2000);
    return () => clearInterval(i);
  }, [lastOrder]);

  const bg = settings.bgImage
    ? {
        backgroundImage: `url(${settings.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: settings.bgColor };

  if (!table)
    return (
      <CenterScreen>
        <div className="text-center">
          <h1 className="text-xl font-bold">Invalid table</h1>
          <p className="text-muted-foreground text-sm">QR code not recognised.</p>
        </div>
      </CenterScreen>
    );
  if (!settings.enabled)
    return (
      <CenterScreen>
        <div className="text-center">
          <h1 className="text-xl font-bold">Self Ordering Disabled</h1>
          <p className="text-muted-foreground text-sm">Please ask staff for assistance.</p>
        </div>
      </CenterScreen>
    );

  const addItem = (p: Product) =>
    setCart((c) => ({
      ...c,
      [p.id]: { productId: p.id, name: p.name, price: p.price, qty: (c[p.id]?.qty || 0) + 1 },
    }));
  const dec = (id: string) =>
    setCart((c) => {
      const n = { ...c };
      if (!n[id]) return n;
      n[id].qty -= 1;
      if (n[id].qty <= 0) delete n[id];
      return { ...n };
    });

  const placeOrder = () => {
    if (cartItems.length === 0) {
      toast.error("Cart empty");
      return;
    }
    const order: Order = {
      id: crypto.randomUUID(),
      number: `${2200 + Math.floor(Math.random() * 800)}`,
      tableToken: token,
      items: cartItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      total: totals.total,
      status: "to_cook",
      couponCode: totals.couponApplied?.code,
      createdAt: Date.now(),
    };
    setOrders([order, ...orders]);
    setLastOrder(order);

    // Trigger SMTP receipt email in background if email is provided
    if (email.trim()) {
      import("./login")
        .then((m) => {
          m.sendPurchaseReceiptEmailFn({
            data: {
              email: email.trim(),
              customerName: "Self-Ordering Guest",
              orderNumber: order.number,
              items: cartItems.map((i) => ({ name: i.name, price: i.price, qty: i.qty })),
              subtotal: totals.subtotal,
              discount: totals.discount,
              tax: totals.tax,
              total: totals.total,
              tableLabel: table?.name || "Self-Ordering Table",
            },
          }).catch((err: any) => console.error("Receipt email dispatch failed:", err));
        })
        .catch((err) => console.error("Failed to import sendPurchaseReceiptEmailFn:", err));
    }

    setCart({});
    setCouponCode("");
    setStep("confirmed");
  };

  return (
    <div className="min-h-screen" style={bg}>
      <div className="min-h-screen bg-background/85 backdrop-blur-sm">
        <div className="max-w-md mx-auto p-4 pb-32">
          {step === "menu" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-muted-foreground">Welcome to {table.name}</div>
                  <h1 className="text-xl font-bold text-primary">Bistro Menu</h1>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep("history")}>
                  Orders
                </Button>
              </div>
              <div className="relative mb-3">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products"
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setActiveCat(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${activeCat === c ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => settings.mode === "online" && addItem(p)}
                    className="rounded-lg border bg-card p-3 text-left hover:border-primary/40 transition"
                  >
                    <div className="aspect-square rounded bg-primary/10 mb-2 flex items-center justify-center text-3xl">
                      🍽️
                    </div>
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.category}</div>
                    <div className="text-sm font-semibold text-primary mt-1">₹{p.price}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "cart" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep("menu")}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Button>
              <h2 className="text-xl font-bold mt-2 mb-3">Your Cart</h2>
              {cartItems.length === 0 && (
                <p className="text-sm text-muted-foreground">Cart is empty.</p>
              )}
              <div className="space-y-2">
                {cartItems.map((i) => (
                  <div
                    key={i.productId}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{i.name}</div>
                      <div className="text-xs text-muted-foreground">₹{i.price}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => dec(i.productId)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{i.qty}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() =>
                          addItem({ id: i.productId, name: i.name, price: i.price, category: "" })
                        }
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <div className="w-16 text-right text-sm font-semibold">₹{i.price * i.qty}</div>
                  </div>
                ))}
              </div>
              {cartItems.length > 0 && (
                <Button className="w-full mt-4" onClick={() => setStep("payment")}>
                  Next
                </Button>
              )}
            </>
          )}

          {step === "payment" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep("cart")}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Button>
              <h2 className="text-xl font-bold mt-2 mb-3 text-accent">Payment</h2>
              <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
                {cartItems.map((i) => (
                  <div key={i.productId} className="flex justify-between">
                    <span>
                      {i.qty} × {i.name}
                    </span>
                    <span>₹{i.price * i.qty}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex gap-2 items-center">
                    <Tag className="size-4 text-accent" />
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Have a coupon code?"
                      className="h-8"
                    />
                  </div>
                  {totals.appliedNotes.map((n, i) => (
                    <div key={i} className="text-xs text-success mt-1">
                      ✓ {n}
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount</span>
                      <span>-₹{totals.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax (GST 5%)</span>
                    <span>₹{totals.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1">
                    <span>Total</span>
                    <span>₹{totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs text-muted-foreground font-medium">Receipt Email (Optional)</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email to receive receipt"
                  className="mt-1 bg-background"
                />
              </div>

              <Button className="w-full mt-4" onClick={() => setShowPaymentModal(true)}>
                Confirm Order
              </Button>
            </>
          )}

          {step === "confirmed" && lastOrder && (
            <div className="text-center py-12 animate-in fade-in duration-300">
              <CheckCircle2 className="size-20 text-success mx-auto" />
              <div className="text-4xl font-bold mt-4">#{lastOrder.number}</div>
              <div className="text-accent mt-1">Order Confirmed</div>
              <div className="text-2xl font-semibold mt-2">₹{lastOrder.total.toFixed(2)}</div>
              <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs bg-primary/10 text-primary capitalize">
                {lastOrder.status.replace("_", " ")}
              </div>

              {!ratingSubmitted ? (
                <div className="mt-8 border rounded-xl p-5 bg-card text-left max-w-sm mx-auto shadow-sm animate-in fade-in duration-300">
                  <h3 className="font-semibold text-sm text-foreground">
                    Rate your ordering experience
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    We'd love to hear your feedback!
                  </p>
                  <div className="flex items-center gap-1.5 my-3">
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
                          className={`size-7 ${
                            star <= (hoverRating || userRating)
                              ? "text-[#fbbf24] fill-[#fbbf24]"
                              : "text-muted-foreground/35"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Any comments to share with us?"
                    className="w-full text-xs rounded-md border bg-background px-3 py-2 outline-none focus:ring-1 focus:ring-primary min-h-[50px] resize-none"
                  />
                  <Button
                    disabled={userRating === 0}
                    onClick={() => {
                      const newFeedback: CustomerRating = {
                        id: crypto.randomUUID(),
                        customerName: table.name || "Self-Ordering Guest",
                        orderNumber: lastOrder.number,
                        rating: userRating,
                        comment: reviewComment.trim(),
                        createdAt: Date.now(),
                      };
                      setRatings([newFeedback, ...ratings]);
                      dbSubmitRatingFn({ data: { rating: newFeedback } }).catch((err: any) =>
                        console.error("Failed to save rating to MongoDB:", err),
                      );
                      setRatingSubmitted(true);
                      toast.success("Thank you for your review!");
                    }}
                    className="mt-3 w-full text-xs py-2 bg-primary font-semibold"
                  >
                    Submit Review
                  </Button>
                </div>
              ) : (
                <div className="mt-8 border rounded-xl p-5 bg-green-50/50 border-green-200 text-center max-w-sm mx-auto shadow-sm animate-in fade-in duration-300">
                  <span className="text-xl">🌟</span>
                  <h4 className="font-semibold text-sm mt-1 text-green-800">Review Submitted!</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Thank you for helping us improve.
                  </p>
                </div>
              )}

              <div className="mt-8 space-y-2 max-w-sm mx-auto">
                <Button
                  className="w-full text-xs animate-in slide-in-from-bottom-2 duration-300"
                  onClick={() => setStep("history")}
                >
                  Track My Order
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs animate-in slide-in-from-bottom-3 duration-300"
                  onClick={() => {
                    setStep("menu");
                    setUserRating(0);
                    setReviewComment("");
                    setRatingSubmitted(false);
                  }}
                >
                  Order More
                </Button>
              </div>
            </div>
          )}

          {step === "history" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold">Order History</h2>
                <Button variant="outline" size="sm" onClick={() => setStep("menu")}>
                  <ArrowLeft className="size-4 mr-1" /> Back
                </Button>
              </div>
              {tableOrders.length === 0 && (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              )}
              <div className="space-y-2">
                {tableOrders.map((o) => (
                  <StatusRow key={o.id} order={o} />
                ))}
              </div>
            </>
          )}
        </div>

        {step === "menu" && cartCount > 0 && settings.mode === "online" && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md">
            <Button className="w-full h-12 shadow-lg" onClick={() => setStep("cart")}>
              <ShoppingCart className="size-4 mr-2" /> {cartCount} items · ₹
              {totals.subtotal.toFixed(2)} · View Cart
            </Button>
          </div>
        )}
      </div>

      {/* ── SANDBOX PAYMENT GATEWAY MODAL ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 text-left">
          <div className="w-full max-w-md bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#5D1E31] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-semibold text-lg">Sandbox Payment Gateway</h3>
                <p className="text-[11px] opacity-80">Table Test Environment - No real charges</p>
              </div>
              <button 
                onClick={() => {
                  if (!isProcessingPayment) {
                    setShowPaymentModal(false);
                    setPaymentSuccess(false);
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
              <div className="text-2xl font-bold text-[#5D1E31] mt-0.5">₹{totals.total.toFixed(2)}</div>
            </div>

            {/* Body */}
            {paymentSuccess ? (
              <div className="p-8 text-center space-y-4 animate-in zoom-in-95 duration-300">
                <CheckCircle2 className="size-16 text-success mx-auto animate-bounce" />
                <h4 className="font-bold text-lg text-foreground">Payment Successful!</h4>
                <p className="text-xs text-muted-foreground">Routing order to kitchen and sending receipt...</p>
              </div>
            ) : isProcessingPayment ? (
              <div className="p-8 text-center space-y-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-[#5D1E31] border-r-transparent align-[-0.125em] mx-auto" />
                <h4 className="font-medium text-sm text-foreground">Processing Secure Transaction...</h4>
                <p className="text-xs text-muted-foreground">Communicating with Sandbox Gateway...</p>
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
                            setCardHolder(table?.name || "Table Guest");
                          }}
                          className="text-[10px] text-accent hover:underline font-bold"
                        >
                          Quick Fill Test Card
                        </button>
                      </div>
                      <Input
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
                        className="w-full bg-background h-9"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Expiry</label>
                        <Input
                          type="text"
                          value={cardExpiry}
                          placeholder="MM/YY"
                          maxLength={5}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, "");
                            if (val.length > 2) val = val.substring(0, 2) + "/" + val.substring(2, 4);
                            setCardExpiry(val);
                          }}
                          className="w-full bg-background h-9 text-center"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">CVV</label>
                        <Input
                          type="password"
                          value={cardCvv}
                          placeholder="123"
                          maxLength={3}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                          className="w-full bg-background h-9 text-center"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Cardholder Name</label>
                      <Input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-background h-9"
                        required
                      />
                    </div>

                    <Button
                      type="button"
                      disabled={!cardNumber || !cardExpiry || !cardCvv || !cardHolder}
                      onClick={() => {
                        setIsProcessingPayment(true);
                        setTimeout(() => {
                          setPaymentSuccess(true);
                          setTimeout(() => {
                            setShowPaymentModal(false);
                            setPaymentSuccess(false);
                            setIsProcessingPayment(false);
                            placeOrder();
                          }, 1200);
                        }, 1800);
                      }}
                      className="w-full mt-2 cursor-pointer"
                    >
                      Pay ₹{totals.total.toFixed(2)} (Sandbox)
                    </Button>
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
                          `upi://pay?pa=odoocafe@upi&pn=OdooCafe&am=${totals.total.toFixed(2)}&cu=INR`
                        )}`}
                        alt="UPI QR Code"
                        className="h-32 w-32 object-contain mx-auto"
                      />
                      <div className="text-[10px] font-mono text-muted-foreground mt-1.5">Merchant: odoocafe@upi</div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => {
                        setIsProcessingPayment(true);
                        setTimeout(() => {
                          setPaymentSuccess(true);
                          setTimeout(() => {
                            setShowPaymentModal(false);
                            setPaymentSuccess(false);
                            setIsProcessingPayment(false);
                            placeOrder();
                          }, 1200);
                        }, 1800);
                      }}
                      className="w-full bg-success text-success-foreground hover:bg-success/90 cursor-pointer"
                    >
                      Simulate App Payment Success
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusRow({ order }: { order: Order }) {
  const [orders] = usePersisted<Order[]>(storeKeys.orders, []);
  const fresh = orders.find((o) => o.id === order.id) || order;
  const styles: Record<string, string> = {
    to_cook: "bg-destructive/15 text-destructive",
    preparing: "bg-accent/20 text-accent",
    completed: "bg-success/20 text-success",
  };
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-3">
      <div className="font-mono font-semibold">#{fresh.number}</div>
      <div className="text-xs text-muted-foreground">₹{fresh.total.toFixed(2)}</div>
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${styles[fresh.status]}`}
      >
        {fresh.status.replace("_", " ")}
      </span>
    </div>
  );
}

function CenterScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      {children}
    </div>
  );
}
