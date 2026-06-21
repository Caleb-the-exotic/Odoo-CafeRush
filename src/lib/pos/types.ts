export type Role = "admin" | "manager" | "server" | "cashier" | "customer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  pin: string;
  twoFactorEnabled?: boolean;
  username?: string;
  password?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  /** ingredients consume inventory on sale: { ingredientId: qty } */
  recipe?: Record<string, number>;
}

export interface OrderLine {
  id: string;
  itemId: string;
  name: string;
  unitPrice: number;
  qty: number;
  notes?: string;
  /** percent discount on this line, 0-100 */
  discountPct?: number;
  prepared?: boolean;
}

export type OrderStatus = "open" | "sent" | "paid" | "void";
export type OrderChannel = "dine-in" | "takeaway" | "online";

export interface Payment {
  method: "cash" | "card" | "wallet" | "gift";
  amount: number;
  ref?: string;
  at: number;
}

export interface Order {
  id: string;
  number: number;
  channel: OrderChannel;
  tableId?: string;
  guests?: number;
  serverId?: string;
  lines: OrderLine[];
  status: OrderStatus;
  prepStatus?: "to_cook" | "preparing" | "completed";
  /** customer-facing delivery tracking stage */
  deliveryStatus?: "received" | "preparing" | "ready" | "served";
  /** timestamp when payment was confirmed */
  paidAt?: number;
  /** epoch ms: when cooking is expected to finish (Date.now() + max dish cook time) */
  cookEndAt?: number;
  /** order-level discount percent */
  discountPct?: number;
  tipAmount?: number;
  payments: Payment[];
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
  customerName?: string;
}

export interface Table {
  id: string;
  label: string;
  seats: number;
  x: number;
  y: number;
  token: string;
  /** if merged into another table, points to root table id */
  mergedInto?: string;
  /** ids of tables merged INTO this one */
  mergedFrom?: string[];
  orderId?: string;
  status: "free" | "seated" | "billed";
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  qty: number;
  parLevel: number;
}

export interface CashDrawerSession {
  id: string;
  openedAt: number;
  closedAt?: number;
  openingFloat: number;
  countedCash?: number;
  expectedCash?: number;
  variance?: number;
  notes?: string;
  userId: string;
}

export interface AuditEntry {
  id: string;
  at: number;
  userId?: string;
  userName?: string;
  action: string;
  detail?: string;
}
