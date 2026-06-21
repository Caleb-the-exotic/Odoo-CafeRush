import type { Order } from "@/lib/pos/types";
import type { OrderTotals } from "@/lib/pos/format";
import { currency } from "@/lib/pos/format";
import { useSettings } from "@/store";

export function Receipt({
  order,
  totals,
  cashierName,
}: {
  order: Order;
  totals: OrderTotals;
  cashierName?: string;
}) {
  const restaurantName = useSettings((s) => s.restaurantName);
  return (
    <div className="mx-auto max-w-[320px] font-mono text-[12px] text-black p-4">
      <div className="text-center">
        <div className="text-lg font-bold tracking-wide">{restaurantName.toUpperCase()}</div>
        <div className="text-[11px]">123 Vine Street · (555) 010-2002</div>
        <div className="text-[11px]">VAT 12-345-678</div>
      </div>
      <hr className="my-2 border-dashed border-black" />
      <div className="flex justify-between">
        <span>Order</span>
        <span className="font-bold">#{order.number}</span>
      </div>
      <div className="flex justify-between">
        <span>Channel</span>
        <span className="capitalize">{order.channel}</span>
      </div>
      <div className="flex justify-between">
        <span>Date</span>
        <span>{new Date(order.createdAt).toLocaleString()}</span>
      </div>
      {cashierName && (
        <div className="flex justify-between">
          <span>Cashier</span>
          <span>{cashierName}</span>
        </div>
      )}
      <hr className="my-2 border-dashed border-black" />
      {order.lines.map((l) => {
        const gross = l.unitPrice * l.qty;
        const net = gross * (1 - (l.discountPct ?? 0) / 100);
        return (
          <div key={l.id} className="mb-1">
            <div className="flex justify-between">
              <span>
                {l.qty}× {l.name}
              </span>
              <span>{currency(net)}</span>
            </div>
            {l.discountPct ? (
              <div className="text-[10px] text-right">disc -{l.discountPct}%</div>
            ) : null}
          </div>
        );
      })}
      <hr className="my-2 border-dashed border-black" />
      <Row label="Subtotal" value={currency(totals.subtotal + totals.discount)} />
      {totals.discount > 0 && <Row label="Discount" value={`-${currency(totals.discount)}`} />}
      <Row label="Tax" value={currency(totals.tax)} />
      {totals.tip > 0 && <Row label="Tip" value={currency(totals.tip)} />}
      <div className="flex justify-between font-bold text-[14px] mt-1">
        <span>TOTAL</span>
        <span>{currency(totals.total)}</span>
      </div>
      <hr className="my-2 border-dashed border-black" />
      {order.payments.map((p, i) => (
        <div key={i} className="flex justify-between">
          <span className="capitalize">
            {p.method}
            {p.ref ? ` ${p.ref}` : ""}
          </span>
          <span>{currency(p.amount)}</span>
        </div>
      ))}
      <hr className="my-2 border-dashed border-black" />
      <div className="text-center mt-2 text-[11px]">Thank you · See you again soon</div>
      <div className="text-center text-[10px] opacity-70">OdooCafé.example.com</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
