export const currency = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export const uid = (p = "id") => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export const lineSubtotal = (unitPrice: number, qty: number, discountPct = 0) =>
  unitPrice * qty * (1 - discountPct / 100);

export interface OrderTotals {
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
}

export function computeTotals(
  lines: { unitPrice: number; qty: number; discountPct?: number }[],
  orderDiscountPct = 0,
  tipAmount = 0,
  taxRate = 0.08,
): OrderTotals {
  const lineTotals = lines.reduce(
    (acc, l) => {
      const gross = l.unitPrice * l.qty;
      const lineDisc = gross * ((l.discountPct ?? 0) / 100);
      acc.gross += gross;
      acc.lineDisc += lineDisc;
      return acc;
    },
    { gross: 0, lineDisc: 0 },
  );
  const afterLine = lineTotals.gross - lineTotals.lineDisc;
  const orderDisc = afterLine * (orderDiscountPct / 100);
  const subtotal = afterLine - orderDisc;
  const tax = subtotal * taxRate;
  const total = subtotal + tax + tipAmount;
  return {
    subtotal,
    discount: lineTotals.lineDisc + orderDisc,
    tax,
    tip: tipAmount,
    total,
  };
}
