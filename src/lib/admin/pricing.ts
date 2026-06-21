import type { Coupon, OrderItem, OrderPromotion, ProductPromotion } from "@/store/admin";

export function computeTotals(
  items: OrderItem[],
  opts: {
    coupons: Coupon[];
    productPromos: ProductPromotion[];
    orderPromos: OrderPromotion[];
    couponCode?: string;
    taxRate?: number;
  },
) {
  const taxRate = opts.taxRate ?? 0.05;
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  let discount = 0;
  const appliedNotes: string[] = [];

  // product promotions
  for (const promo of opts.productPromos.filter((p) => p.active)) {
    const item = items.find((i) => i.productId === promo.productId);
    if (item && item.qty >= promo.minQty) {
      const itemTotal = item.price * item.qty;
      const d = promo.discountType === "percentage" ? itemTotal * (promo.value / 100) : promo.value;
      discount += d;
      appliedNotes.push(`${promo.name}: -₹${d.toFixed(2)}`);
    }
  }
  // order promotions
  for (const promo of opts.orderPromos.filter((p) => p.active)) {
    if (subtotal >= promo.minAmount) {
      const d = promo.discountType === "percentage" ? subtotal * (promo.value / 100) : promo.value;
      discount += d;
      appliedNotes.push(`${promo.name}: -₹${d.toFixed(2)}`);
    }
  }
  // coupon
  let couponApplied: Coupon | null = null;
  if (opts.couponCode) {
    const c = opts.coupons.find(
      (x) => x.active && x.code.toLowerCase() === opts.couponCode!.toLowerCase(),
    );
    if (c) {
      couponApplied = c;
      const d = c.discountType === "percentage" ? subtotal * (c.value / 100) : c.value;
      discount += d;
      appliedNotes.push(`Coupon ${c.code}: -₹${d.toFixed(2)}`);
    }
  }
  discount = Math.min(discount, subtotal);
  const taxable = subtotal - discount;
  const tax = +(taxable * taxRate).toFixed(2);
  const total = +(taxable + tax).toFixed(2);
  return { subtotal, discount: +discount.toFixed(2), tax, total, couponApplied, appliedNotes };
}
