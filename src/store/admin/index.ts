// LocalStorage-backed store for POS data
import { useEffect, useState } from "react";

export type Coupon = {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  value: number;
  active: boolean;
};

export type ProductPromotion = {
  id: string;
  name: string;
  productId: string;
  minQty: number;
  discountType: "percentage" | "fixed";
  value: number;
  active: boolean;
};

export type OrderPromotion = {
  id: string;
  name: string;
  minAmount: number;
  discountType: "percentage" | "fixed";
  value: number;
  active: boolean;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  prepared?: boolean;
};
export type OrderStatus = "to_cook" | "preparing" | "completed";
export type Order = {
  id: string;
  number: string;
  tableToken?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  employee?: string;
  session?: string;
  couponCode?: string;
  createdAt: number;
};

export type SelfOrderingSettings = {
  enabled: boolean;
  mode: "online" | "qr_only";
  bgColor: string;
  bgImage: string;
};

export type Table = { id: string; name: string; token: string };

export type CustomerRating = {
  id: string;
  customerName: string;
  orderNumber: string;
  rating: number; // 1-5
  comment: string;
  createdAt: number;
};

const KEYS = {
  coupons: "pos.coupons",
  productPromos: "pos.productPromos",
  orderPromos: "pos.orderPromos",
  products: "pos.products",
  orders: "pos.orders",
  settings: "pos.selfOrdering",
  tables: "pos.tables",
  ratings: "pos.ratings",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

export function usePersisted<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void] {
  const [state, setState] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key) setState(read(key, fallback));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key]);
  const set = (v: T | ((p: T) => T)) => {
    setState((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      write(key, next);
      return next;
    });
  };
  return [state, set];
}

// Seed defaults — categories match the actual OdooCafé menu (Drinks / Mains / Snacks / Desserts)
const seedProducts: Product[] = [
  { id: "p1", name: "Cheese Burger", price: 299, category: "Mains" },
  { id: "p2", name: "Pizza", price: 499, category: "Mains" },
  { id: "p3", name: "Maggie", price: 129, category: "Mains" },
  { id: "p4", name: "Coffee", price: 149, category: "Drinks" },
  { id: "p5", name: "Masala Tea", price: 99, category: "Drinks" },
  { id: "p6", name: "Mango Lassi", price: 199, category: "Drinks" },
  { id: "p7", name: "Ice Water", price: 29, category: "Drinks" },
  { id: "p8", name: "Kunafa", price: 349, category: "Desserts" },
  { id: "p9", name: "Cake", price: 249, category: "Desserts" },
  { id: "p10", name: "Pani Puri", price: 99, category: "Snacks" },
  { id: "p11", name: "Puff", price: 49, category: "Snacks" },
  { id: "p12", name: "Special Biryani", price: 399, category: "Mains" },
  { id: "p13", name: "Pav Bhaji", price: 199, category: "Mains" },
  { id: "p14", name: "Mojito", price: 179, category: "Drinks" },
  { id: "p15", name: "Blueberry Milkshake", price: 249, category: "Drinks" },
];

export function ensureSeed() {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(KEYS.products)) write(KEYS.products, seedProducts);
  if (!localStorage.getItem(KEYS.coupons))
    write<Coupon[]>(KEYS.coupons, [
      { id: "c1", code: "WELCOME10", discountType: "percentage", value: 10, active: true },
    ]);
  if (!localStorage.getItem(KEYS.tables)) {
    const tables: Table[] = Array.from({ length: 6 }, (_, i) => ({
      id: `t${i + 1}`,
      name: `Table ${i + 1}`,
      token: `tbl-${i + 1}-${Math.random().toString(36).slice(2, 8)}`,
    }));
    write(KEYS.tables, tables);
  }
  if (!localStorage.getItem(KEYS.settings))
    write<SelfOrderingSettings>(KEYS.settings, {
      enabled: true,
      mode: "online",
      bgColor: "#fdf6f0",
      bgImage: "",
    });
  if (!localStorage.getItem(KEYS.productPromos)) write<ProductPromotion[]>(KEYS.productPromos, []);
  if (!localStorage.getItem(KEYS.orderPromos)) write<OrderPromotion[]>(KEYS.orderPromos, []);
  if (!localStorage.getItem(KEYS.orders)) {
    // sample orders for analytics
    const now = Date.now();
    const sample: Order[] = Array.from({ length: 30 }, (_, i) => {
      const p = seedProducts[i % seedProducts.length];
      const qty = 1 + (i % 4);
      const subtotal = p.price * qty;
      const tax = +(subtotal * 0.05).toFixed(2);
      return {
        id: `o${i}`,
        number: `${2200 + i}`,
        items: [{ productId: p.id, name: p.name, price: p.price, qty }],
        subtotal,
        tax,
        discount: 0,
        total: subtotal + tax,
        status: "completed",
        employee: ["Alice", "Bob", "Carol"][i % 3],
        session: ["Morning", "Evening"][i % 2],
        createdAt: now - i * 3600_000 * 6,
      };
    });
    write(KEYS.orders, sample);
  }
  if (!localStorage.getItem(KEYS.ratings)) {
    const sampleRatings: CustomerRating[] = [
      {
        id: "r1",
        customerName: "Rajesh",
        orderNumber: "2201",
        rating: 5,
        comment: "Excellent Masala Tea and prompt service!",
        createdAt: Date.now() - 3600_000 * 2,
      },
      {
        id: "r2",
        customerName: "Priya",
        orderNumber: "2205",
        rating: 4,
        comment: "Burgers were delicious, but the beverage took slightly longer.",
        createdAt: Date.now() - 3600_000 * 12,
      },
      {
        id: "r3",
        customerName: "Amit",
        orderNumber: "2210",
        rating: 5,
        comment: "Amazing self-ordering experience, very smooth!",
        createdAt: Date.now() - 3600_000 * 24,
      },
    ];
    write(KEYS.ratings, sampleRatings);
  }
}

export const storeKeys = KEYS;
