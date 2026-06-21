import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePosOrders, useSettings } from "@/store";
import { slideshowImages } from "@/lib/pos/seed";
import { currency, computeTotals } from "@/lib/pos/format";
import { Download, FileText } from "lucide-react";
import { usePersisted, storeKeys, type CustomerRating } from "@/store/admin";

export const Route = createFileRoute("/pos/display")({
  head: () => ({ meta: [{ title: "Customer Display — OdooCafé" }] }),
  component: DisplayPage,
});

function DisplayPage() {
  const orders = usePosOrders((s) => s.orders);
  const settings = useSettings();
  // Show the most recently updated open order
  const active = orders
    .filter((o) => o.status === "open" && o.lines.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  const totals = active
    ? computeTotals(active.lines, active.discountPct ?? 0, active.tipAmount ?? 0, settings.taxRate)
    : null;

  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (!settings.slideshowEnabled) return;
    const id = setInterval(
      () => setSlide((s) => (s + 1) % slideshowImages.length),
      settings.slideshowIntervalSec * 1000,
    );
    return () => clearInterval(id);
  }, [settings.slideshowEnabled, settings.slideshowIntervalSec]);

  const exportOrderJSON = () => {
    if (!active || !totals) return;
    const invoice = {
      orderId: active.id,
      orderNumber: active.number,
      customerName: active.customerName || "Guest",
      tableId: active.tableId || null,
      channel: active.channel,
      status: active.status,
      createdAt: new Date(active.createdAt).toISOString(),
      items: active.lines.map((l) => ({
        name: l.name,
        qty: l.qty,
        unitPrice: l.unitPrice,
        discount: l.discountPct ? `${l.discountPct}%` : null,
        lineTotal: l.unitPrice * l.qty * (1 - (l.discountPct ?? 0) / 100),
      })),
      subtotal: totals.subtotal + totals.discount,
      discount: totals.discount,
      tax: totals.tax,
      tip: totals.tip,
      total: totals.total,
      currency: "INR",
    };
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(invoice, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `order-${active.number}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const [ratings] = usePersisted<CustomerRating[]>(storeKeys.ratings, []);

  return (
    <div className="h-screen w-screen grid grid-cols-[1.4fr_1fr] bg-primary text-primary-foreground overflow-hidden">
      <div className="relative">
        {settings.slideshowEnabled ? (
          <>
            {slideshowImages.map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
                style={{ opacity: i === slide ? 1 : 0 }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-primary" />
        )}
        <div className="absolute bottom-10 left-10">
          <div className="text-xs uppercase tracking-[0.3em] opacity-80">
            {settings.restaurantName}
          </div>
          <div className="text-5xl font-semibold mt-1 max-w-md leading-tight">
            Crafted plates, warm welcome.
          </div>
        </div>
      </div>

      <div className="bg-card text-card-foreground flex flex-col">
        <div className="p-8 border-b flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Now serving
            </div>
            {active ? (
              <div className="mt-1 text-2xl font-semibold">
                Order #{active.number}
                {active.customerName ? ` · ${active.customerName}` : ""}
              </div>
            ) : (
              <div className="mt-1 text-2xl font-semibold text-muted-foreground">Welcome</div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {active && totals ? (
            <ul className="space-y-3">
              {active.lines.map((l) => (
                <li key={l.id} className="flex justify-between text-lg">
                  <span>
                    <span className="font-mono text-muted-foreground">{l.qty}×</span> {l.name}
                  </span>
                  <span className="font-semibold">
                    {currency(l.unitPrice * l.qty * (1 - (l.discountPct ?? 0) / 100))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-6">
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex flex-col items-center justify-center text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Average Guest Rating</div>
                <div className="text-4xl font-bold mt-2 text-primary">
                  {ratings.length > 0
                    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
                    : "5.0"}
                </div>
                <div className="flex gap-0.5 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 5;
                    const filled = star <= Math.round(avg);
                    return (
                      <svg
                        key={star}
                        className={`size-5 ${filled ? "text-[#fbbf24] fill-[#fbbf24]" : "text-muted-foreground/35"}`}
                        fill={filled ? "currentColor" : "none"}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    );
                  })}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Based on {ratings.length} customer ratings</div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center justify-between">
                  <span>Guest Testimonials</span>
                  <span className="text-xs font-normal text-muted-foreground">Real-time feedback</span>
                </h3>
                {ratings.length === 0 ? (
                  <div className="text-center p-6 border border-dashed rounded-xl text-muted-foreground text-sm">
                    No reviews submitted yet. Rate your experience at checkout!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {ratings.slice(0, 5).map((r) => (
                      <div key={r.id} className="p-3 border rounded-xl bg-card space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-foreground">{r.customerName}</span>
                          <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`size-3 ${star <= r.rating ? "text-[#fbbf24] fill-[#fbbf24]" : "text-muted-foreground/30"}`}
                              fill={star <= r.rating ? "currentColor" : "none"}
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        {r.comment && <p className="text-xs text-muted-foreground leading-relaxed italic">"{r.comment}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {active && totals && (
          <div className="py-4 flex items-center justify-center gap-3 bg-card no-print">
            <button
              onClick={exportOrderJSON}
              title="Export order as JSON"
              className="inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition hover:bg-secondary/60 shadow-sm"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              <Download className="h-4 w-4" />
              Export JSON
            </button>
            <button
              onClick={() => window.print()}
              title="Export order as PDF"
              className="inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition hover:bg-secondary/60 shadow-sm"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        )}

        {active && totals && (
          <div className="p-8 border-t bg-secondary/40 space-y-1.5 text-base">
            <Row label="Subtotal" value={currency(totals.subtotal + totals.discount)} muted />
            {totals.discount > 0 && (
              <Row label="Discount" value={`- ${currency(totals.discount)}`} muted />
            )}
            <Row label="Tax" value={currency(totals.tax)} muted />
            <div className="flex justify-between text-3xl font-semibold mt-3 pt-3 border-t">
              <span>Total</span>
              <span>{currency(totals.total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
