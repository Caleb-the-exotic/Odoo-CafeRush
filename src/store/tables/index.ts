import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TablesRole = "admin" | "employee";

export interface TablesUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: TablesRole;
  status: "active" | "disabled" | "archived";
}

export interface TablesCategory {
  id: string;
  name: string;
  color: string;
}

export interface TablesProduct {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  unit: string;
  tax: number;
  description: string;
  active: boolean;
}

export interface TablesPaymentMethod {
  id: string;
  name: string;
  type: "Cash" | "Card" | "UPI";
  upiId?: string;
  active: boolean;
}

export interface TablesCoupon {
  id: string;
  code: string;
  discount: number;
  active: boolean;
}

export interface TablesFloor {
  id: string;
  name: string;
}
export interface TablesTable {
  id: string;
  number: string;
  seats: number;
  floorId: string;
  active: boolean;
}

export const CATEGORY_COLORS = [
  "#60a5fa",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

interface AuthState {
  currentUser: TablesUser | null;
  login: (email: string, password: string) => TablesUser | null;
  signup: (name: string, email: string, password: string) => TablesUser;
  logout: () => void;
  resetPassword: (email: string, newPassword: string) => boolean;
}

interface DataState {
  users: TablesUser[];
  categories: TablesCategory[];
  products: TablesProduct[];
  payments: TablesPaymentMethod[];
  coupons: TablesCoupon[];
  floors: TablesFloor[];
  tables: TablesTable[];

  addUser: (u: Omit<TablesUser, "id">) => void;
  updateUser: (id: string, patch: Partial<TablesUser>) => void;
  deleteUser: (id: string) => void;

  addCategory: (c: Omit<TablesCategory, "id">) => TablesCategory;
  updateCategory: (id: string, patch: Partial<TablesCategory>) => void;
  deleteCategory: (id: string) => void;

  addProduct: (p: Omit<TablesProduct, "id">) => void;
  updateProduct: (id: string, patch: Partial<TablesProduct>) => void;
  deleteProduct: (id: string) => void;

  updatePayment: (id: string, patch: Partial<TablesPaymentMethod>) => void;
  addPayment: (p: Omit<TablesPaymentMethod, "id">) => void;
  deletePayment: (id: string) => void;

  addCoupon: (c: Omit<TablesCoupon, "id">) => void;
  updateCoupon: (id: string, patch: Partial<TablesCoupon>) => void;
  deleteCoupon: (id: string) => void;

  addFloor: (name: string) => void;
  updateFloor: (id: string, name: string) => void;
  deleteFloor: (id: string) => void;

  addTable: (t: Omit<TablesTable, "id">) => void;
  updateTable: (id: string, patch: Partial<TablesTable>) => void;
  deleteTable: (id: string) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const seedUsers: TablesUser[] = [
  {
    id: "u1",
    name: "Admin",
    email: "admin@pos.com",
    password: "admin123",
    role: "admin",
    status: "active",
  },
  {
    id: "u2",
    name: "Eric",
    email: "eric@pos.com",
    password: "eric123",
    role: "employee",
    status: "active",
  },
  {
    id: "u3",
    name: "Sara",
    email: "sara@pos.com",
    password: "sara123",
    role: "employee",
    status: "disabled",
  },
];
const seedCats: TablesCategory[] = [
  { id: "c1", name: "Food", color: "#60a5fa" },
  { id: "c2", name: "Drink", color: "#f59e0b" },
  { id: "c3", name: "Quick Bites", color: "#10b981" },
];
const seedProducts: TablesProduct[] = [
  {
    id: "p1",
    name: "Masala Tea",
    categoryId: "c1",
    price: 65,
    unit: "cup",
    tax: 5,
    description: "",
    active: true,
  },
  {
    id: "p2",
    name: "Coffee",
    categoryId: "c2",
    price: 65,
    unit: "cup",
    tax: 5,
    description: "",
    active: true,
  },
  {
    id: "p3",
    name: "Lassi",
    categoryId: "c2",
    price: 65,
    unit: "glass",
    tax: 5,
    description: "",
    active: true,
  },
];

export const useTablesAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      login: (email, password) => {
        const u = useTablesData
          .getState()
          .users.find(
            (x) =>
              x.email.toLowerCase() === email.toLowerCase() &&
              x.password === password &&
              x.status === "active",
          );
        if (u) set({ currentUser: u });
        return u || null;
      },
      signup: (name, email, password) => {
        const user: TablesUser = {
          id: uid(),
          name,
          email,
          password,
          role: "admin",
          status: "active",
        };
        useTablesData.getState().addUser(user);
        set({ currentUser: user });
        return user;
      },
      logout: () => set({ currentUser: null }),
      resetPassword: (email, newPassword) => {
        const u = useTablesData
          .getState()
          .users.find((x) => x.email.toLowerCase() === email.toLowerCase());
        if (!u) return false;
        useTablesData.getState().updateUser(u.id, { password: newPassword });
        return true;
      },
    }),
    { name: "suite.tables.auth" },
  ),
);

export const useTablesData = create<DataState>()(
  persist(
    (set) => ({
      users: seedUsers,
      categories: seedCats,
      products: seedProducts,
      payments: [
        { id: "pm1", name: "Cash", type: "Cash", active: true },
        { id: "pm2", name: "Card", type: "Card", active: true },
        { id: "pm3", name: "UPI", type: "UPI", upiId: "merchant@upi", active: true },
      ],
      coupons: [
        { id: "co1", code: "SAVE30", discount: 30, active: true },
        { id: "co2", code: "HALF50", discount: 50, active: true },
      ],
      floors: [
        { id: "f1", name: "Ground Floor" },
        { id: "f2", name: "Terrace" },
      ],
      tables: [
        { id: "t1", number: "T1", seats: 4, floorId: "f1", active: true },
        { id: "t2", number: "T2", seats: 2, floorId: "f1", active: true },
        { id: "t3", number: "T3", seats: 6, floorId: "f2", active: false },
      ],

      addUser: (u) => set((s) => ({ users: [...s.users, { ...u, id: uid() } as TablesUser] })),
      updateUser: (id, patch) =>
        set((s) => ({ users: s.users.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteUser: (id) => set((s) => ({ users: s.users.filter((x) => x.id !== id) })),

      addCategory: (c) => {
        const cat = { ...c, id: uid() };
        set((s) => ({ categories: [...s.categories, cat] }));
        return cat;
      },
      updateCategory: (id, patch) =>
        set((s) => ({
          categories: s.categories.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      deleteCategory: (id) => set((s) => ({ categories: s.categories.filter((x) => x.id !== id) })),

      addProduct: (p) => set((s) => ({ products: [...s.products, { ...p, id: uid() }] })),
      updateProduct: (id, patch) =>
        set((s) => ({ products: s.products.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter((x) => x.id !== id) })),

      updatePayment: (id, patch) =>
        set((s) => ({ payments: s.payments.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      addPayment: (p) => set((s) => ({ payments: [...s.payments, { ...p, id: uid() }] })),
      deletePayment: (id) => set((s) => ({ payments: s.payments.filter((x) => x.id !== id) })),

      addCoupon: (c) => set((s) => ({ coupons: [...s.coupons, { ...c, id: uid() }] })),
      updateCoupon: (id, patch) =>
        set((s) => ({ coupons: s.coupons.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteCoupon: (id) => set((s) => ({ coupons: s.coupons.filter((x) => x.id !== id) })),

      addFloor: (name) => set((s) => ({ floors: [...s.floors, { id: uid(), name }] })),
      updateFloor: (id, name) =>
        set((s) => ({ floors: s.floors.map((x) => (x.id === id ? { ...x, name } : x)) })),
      deleteFloor: (id) =>
        set((s) => ({
          floors: s.floors.filter((x) => x.id !== id),
          tables: s.tables.filter((t) => t.floorId !== id),
        })),

      addTable: (t) => set((s) => ({ tables: [...s.tables, { ...t, id: uid() }] })),
      updateTable: (id, patch) =>
        set((s) => ({ tables: s.tables.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteTable: (id) => set((s) => ({ tables: s.tables.filter((x) => x.id !== id) })),
    }),
    { name: "suite.tables.data" },
  ),
);
