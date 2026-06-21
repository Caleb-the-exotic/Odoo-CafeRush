import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AuditEntry,
  CashDrawerSession,
  InventoryItem,
  MenuItem,
  Order,
  OrderLine,
  Payment,
  Table,
  User,
  Role,
} from "@/lib/pos/types";
import { seedInventory, seedMenu, seedTables, seedUsers } from "@/lib/pos/seed";
import { uid } from "@/lib/pos/format";
import { markLocalTouch } from "@/lib/pos/syncTracker";
import { getOrderCookInfo } from "@/lib/pos/dishTimings";

/* ---------------- Auth ---------------- */
interface AuthState {
  users: User[];
  currentUserId: string | null;
  pendingTwoFactorUserId: string | null;
  loginWithPin: (pin: string) => { ok: true } | { ok: false; error: string };
  loginWithPassword: (
    username: string,
    password: string,
  ) => { ok: boolean; error?: string; user?: User };
  registerUser: (
    username: string,
    password: string,
    email: string,
    role?: Role,
  ) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>;
  verifyTwoFactor: (code: string) => boolean;
  logout: () => void;
  requestPasswordReset: (email: string) => { ok: boolean; token?: string };
  resetPassword: (token: string, newPassword: string) => boolean | Promise<boolean>;
  resetTokens: Record<string, string>; // token -> userId
  /** Admin: create a new employee account */
  createEmployee: (name: string, username: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /** Admin: delete an employee by user id */
  deleteEmployee: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  /** Admin: reset employee password */
  resetEmployeePassword: (userId: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
}

export const usePosAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      users: seedUsers,
      currentUserId: null,
      pendingTwoFactorUserId: null,
      resetTokens: {},
      loginWithPin: (pin) => {
        const u = get().users.find((u) => u.pin === pin);
        if (!u) return { ok: false, error: "Invalid PIN" };
        if (u.twoFactorEnabled) {
          set({ pendingTwoFactorUserId: u.id });
          return { ok: true };
        }
        set({ currentUserId: u.id, pendingTwoFactorUserId: null });
        usePosAudit.getState().log("login", `${u.name} signed in`, u.id, u.name);
        return { ok: true };
      },
      loginWithPassword: (username, password) => {
        const u = get().users.find(
          (x) => x.username?.toLowerCase() === username.toLowerCase() && x.password === password,
        );
        if (!u) return { ok: false, error: "Invalid username or password" };
        set({ currentUserId: u.id, pendingTwoFactorUserId: null });
        usePosAudit.getState().log("login", `${u.name} signed in`, u.id, u.name);
        return { ok: true, user: u };
      },
      registerUser: async (username, password, email, role = "customer") => {
        const users = get().users;
        if (users.some((u) => u.username?.toLowerCase() === username.toLowerCase())) {
          return { ok: false, error: "Username already exists" };
        }
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
          return { ok: false, error: "Email already registered" };
        }
        const newUser: User = {
          id: uid("u"),
          name: username,
          email,
          role,
          pin: Math.floor(1000 + Math.random() * 9000).toString(),
          username,
          password,
        };
        try {
          const { dbSaveUserFn } = await import("../../routes/dbStoreFn");
          const res = await dbSaveUserFn({ data: { user: newUser } });
          if (!res.ok) {
            return { ok: false, error: res.error || "Failed to save user to MongoDB" };
          }
          set({ users: [...users, newUser] });
          usePosAudit.getState().log("signup", `User ${username} registered`);
          return { ok: true };
        } catch (e: any) {
          return { ok: false, error: e.message || String(e) };
        }
      },
      verifyTwoFactor: (code) => {
        if (code !== "000000") return false;
        const id = get().pendingTwoFactorUserId;
        if (!id) return false;
        const u = get().users.find((x) => x.id === id);
        set({ currentUserId: id, pendingTwoFactorUserId: null });
        if (u) usePosAudit.getState().log("login_2fa", `${u.name} passed 2FA`, u.id, u.name);
        return true;
      },
      logout: () => {
        const u = get().users.find((x) => x.id === get().currentUserId);
        if (u) usePosAudit.getState().log("logout", `${u.name} signed out`, u.id, u.name);
        set({ currentUserId: null, pendingTwoFactorUserId: null });
      },
      requestPasswordReset: (email) => {
        const u = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!u) return { ok: false };
        const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit verification code
        set({ resetTokens: { ...get().resetTokens, [token]: u.id } });
        usePosAudit.getState().log("password_reset_requested", `for ${u.email}`);
        return { ok: true, token };
      },
      resetPassword: async (token, newPassword) => {
        const userId = get().resetTokens[token];
        if (!userId) return false;
        const targetUser = get().users.find((u) => u.id === userId);
        if (!targetUser) return false;
        const updatedUser = {
          ...targetUser,
          password: newPassword,
          pin: Math.floor(1000 + Math.random() * 9000).toString(),
        };
        try {
          const { dbSaveUserFn } = await import("../../routes/dbStoreFn");
          const res = await dbSaveUserFn({ data: { user: updatedUser } });
          if (!res.ok) return false;
          set({
            users: get().users.map((u) => (u.id === userId ? updatedUser : u)),
            resetTokens: Object.fromEntries(
              Object.entries(get().resetTokens).filter(([k]) => k !== token),
            ),
          });
          usePosAudit.getState().log("password_reset", `user ${userId}`);
          return true;
        } catch {
          return false;
        }
      },
      createEmployee: async (name, username, email, password) => {
        const users = get().users;
        if (users.some((u) => u.username?.toLowerCase() === username.toLowerCase())) {
          return { ok: false, error: "Username already exists" };
        }
        const newUser: User = {
          id: uid("u"),
          name,
          email,
          role: "server",
          pin: Math.floor(1000 + Math.random() * 9000).toString(),
          username,
          password,
        };
        try {
          const { dbSaveUserFn } = await import("../../routes/dbStoreFn");
          const res = await dbSaveUserFn({ data: { user: newUser } });
          if (!res.ok) return { ok: false, error: res.error || "DB error" };
          set({ users: [...users, newUser] });
          usePosAudit.getState().log("employee_create", `Created employee ${username}`);
          return { ok: true };
        } catch (e: any) {
          return { ok: false, error: e.message || String(e) };
        }
      },
      deleteEmployee: async (userId) => {
        const user = get().users.find((u) => u.id === userId);
        if (!user) return { ok: false, error: "User not found" };
        try {
          const { dbDeleteUserFn } = await import("../../routes/dbStoreFn");
          const res = await dbDeleteUserFn({ data: { userId } });
          if (!res.ok) return { ok: false, error: res.error || "DB error" };
          set({ users: get().users.filter((u) => u.id !== userId) });
          usePosAudit.getState().log("employee_delete", `Deleted employee ${user.username}`);
          return { ok: true };
        } catch (e: any) {
          return { ok: false, error: e.message || String(e) };
        }
      },
      resetEmployeePassword: async (userId, newPassword) => {
        const user = get().users.find((u) => u.id === userId);
        if (!user) return { ok: false, error: "User not found" };
        const updatedUser = { ...user, password: newPassword, pin: Math.floor(1000 + Math.random() * 9000).toString() };
        try {
          const { dbSaveUserFn } = await import("../../routes/dbStoreFn");
          const res = await dbSaveUserFn({ data: { user: updatedUser } });
          if (!res.ok) return { ok: false, error: res.error || "DB error" };
          set({ users: get().users.map((u) => (u.id === userId ? updatedUser : u)) });
          usePosAudit.getState().log("employee_password_reset", `Reset password for ${user.username}`);
          return { ok: true };
        } catch (e: any) {
          return { ok: false, error: e.message || String(e) };
        }
      },
    }),
    {
      name: "suite.pos.auth",
      version: 6,
      migrate: (persistedState: any, version: number) => {
        if (version < 5) {
          const dummyUser = seedUsers.find((u) => u.username === "dummy");
          if (dummyUser && persistedState && Array.isArray(persistedState.users)) {
            const hasDummy = persistedState.users.some((u: any) => u.username === "dummy");
            if (!hasDummy) {
              persistedState.users.push(dummyUser);
            }
          }
        }
        if (version < 6) {
          if (persistedState && Array.isArray(persistedState.users)) {
            persistedState.users = persistedState.users.map((u: any) => {
              if (u.username === "dummy") {
                return { ...u, role: "customer" };
              }
              return u;
            });
          }
        }
        return persistedState;
      },
    },
  ),
);

export const usePosCurrentUser = () => {
  const { users, currentUserId } = usePosAuth();
  return users.find((u) => u.id === currentUserId) ?? null;
};

/* ---------------- Audit ---------------- */
interface AuditState {
  entries: AuditEntry[];
  log: (action: string, detail?: string, userId?: string, userName?: string) => void;
  clear: () => void;
}
export const usePosAudit = create<AuditState>()(
  persist(
    (set) => ({
      entries: [],
      log: (action, detail, userId, userName) =>
        set((s) => ({
          entries: [
            { id: uid("a"), at: Date.now(), action, detail, userId, userName },
            ...s.entries,
          ].slice(0, 500),
        })),
      clear: () => set({ entries: [] }),
    }),
    { name: "suite.pos.audit" },
  ),
);

/* ---------------- Menu & Inventory ---------------- */
interface MenuState {
  items: MenuItem[];
  toggleAvailable: (id: string) => void;
  addItem: (item: Omit<MenuItem, "id">) => void;
  removeItem: (id: string) => void;
}
export const usePosMenu = create<MenuState>()(
  persist(
    (set, get) => ({
      items: seedMenu,
      toggleAvailable: (id) =>
        set((s) => ({
          items: s.items.map((i) => {
            if (i.id === id) {
              const updated = { ...i, available: !i.available };
              import("../../routes/dbStoreFn")
                .then((m) => m.dbSaveMenuItemFn({ data: { menuItem: updated } }))
                .catch((err) => console.error("MongoDB menu item sync failed:", err));
              return updated;
            }
            return i;
          }),
        })),
      addItem: (item) => {
        const newItem: MenuItem = { ...item, id: uid("m") };
        set((s) => ({ items: [...s.items, newItem] }));
        import("../../routes/dbStoreFn")
          .then((m) => m.dbSaveMenuItemFn({ data: { menuItem: newItem } }))
          .catch((err) => console.error("MongoDB add menu item failed:", err));
      },
      removeItem: (id) => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },
    }),
    { name: "suite.pos.menu", version: 4 },
  ),
);

interface InventoryState {
  items: InventoryItem[];
  decrementForItem: (menuItemId: string, qty: number) => void;
  adjust: (id: string, delta: number, note?: string) => void;
}
export const usePosInventory = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: seedInventory,
      decrementForItem: (menuItemId, qty) => {
        const menuItem = usePosMenu.getState().items.find((m) => m.id === menuItemId);
        if (!menuItem?.recipe) return;
        const recipe = menuItem.recipe;
        set({
          items: get().items.map((inv) => {
            const used = (recipe[inv.id] ?? 0) * qty;
            return used ? { ...inv, qty: Math.max(0, inv.qty - used) } : inv;
          }),
        });
      },
      adjust: (id, delta, note) => {
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i,
          ),
        });
        usePosAudit
          .getState()
          .log("inventory_adjust", `${id} ${delta > 0 ? "+" : ""}${delta} ${note ?? ""}`);
      },
    }),
    { name: "suite.pos.inventory" },
  ),
);

/* ---------------- Orders ---------------- */
interface OrderState {
  orders: Order[];
  nextNumber: number;
  createOrder: (init: Partial<Order> & { channel: Order["channel"] }) => Order;
  addLine: (orderId: string, item: MenuItem, qty?: number) => void;
  updateLine: (orderId: string, lineId: string, patch: Partial<OrderLine>) => void;
  removeLine: (orderId: string, lineId: string) => void;
  setOrderDiscount: (orderId: string, pct: number) => void;
  setTip: (orderId: string, amount: number) => void;
  addPayment: (orderId: string, payment: Payment) => void;
  closeOrder: (orderId: string) => void;
  voidOrder: (orderId: string) => void;
  /** transfer all lines of one order onto another */
  mergeOrders: (sourceId: string, destinationId: string) => void;
  /** KDS: advance the overall prep status of an order */
  updatePrepStatus: (orderId: string, status: "to_cook" | "preparing" | "completed") => void;
  /** KDS: toggle individual line-item prepared flag */
  toggleLinePrepared: (orderId: string, lineId: string) => void;
  /** Employee: advance the customer-facing delivery tracker */
  updateDeliveryStatus: (orderId: string, status: "received" | "preparing" | "ready" | "served") => void;
  /** Employee: reassign which table an order belongs to */
  setOrderTable: (orderId: string, tableId: string | undefined) => void;
  /** Employee: permanently delete an order (after completion) */
  deleteOrder: (orderId: string) => void;
  createOnlineOrder: (init: {
    customerName: string;
    tableId?: string;
    items: Array<{ item: MenuItem; qty: number }>;
  }) => Order;
}

export const usePosOrders = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      nextNumber: 1001,
      createOnlineOrder: (init) => {
        const lines = init.items.map((l) => ({
          id: uid("l"),
          itemId: l.item.id,
          name: l.item.name,
          unitPrice: l.item.price,
          qty: l.qty,
        }));
        // Compute cook time: max duration among all ordered dishes
        const { maxSec } = getOrderCookInfo(init.items.map((l) => l.item.id));
        const now = Date.now();
        const o: Order = {
          id: uid("o"),
          number: get().nextNumber,
          channel: "online",
          tableId: init.tableId,
          guests: 1,
          lines,
          status: "open",
          payments: [],
          deliveryStatus: "received",
          cookEndAt: maxSec > 0 ? now + maxSec * 1000 : undefined,
          createdAt: now,
          updatedAt: now,
          customerName: init.customerName,
        };
        set({ orders: [o, ...get().orders], nextNumber: get().nextNumber + 1 });
        usePosAudit.getState().log("order_create", `#${o.number} (online)`);
        
        markLocalTouch(o.id);
        import("../../routes/dbStoreFn")
          .then((m) => m.dbSaveOrderFn({ data: { order: o } }))
          .catch((err) => console.error("MongoDB online order sync failed:", err));
          
        return o;
      },
      createOrder: (init) => {
        const o: Order = {
          id: uid("o"),
          number: get().nextNumber,
          channel: init.channel,
          tableId: init.tableId,
          guests: init.guests ?? 1,
          serverId: init.serverId,
          lines: [],
          status: "open",
          payments: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          customerName: init.customerName,
        };
        set({ orders: [o, ...get().orders], nextNumber: get().nextNumber + 1 });
        usePosAudit.getState().log("order_create", `#${o.number} (${o.channel})`);
        
        markLocalTouch(o.id);
        import("../../routes/dbStoreFn")
          .then((m) => m.dbSaveOrderFn({ data: { order: o } }))
          .catch((err) => console.error("MongoDB order sync failed:", err));
          
        return o;
      },
      addLine: (orderId, item, qty = 1) =>
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            const existing = o.lines.find(
              (l) => l.itemId === item.id && !l.notes && !l.discountPct,
            );
            const lines = existing
              ? o.lines.map((l) => (l.id === existing.id ? { ...l, qty: l.qty + qty } : l))
              : [
                  ...o.lines,
                  { id: uid("l"), itemId: item.id, name: item.name, unitPrice: item.price, qty },
                ];
            const updatedOrder = { ...o, lines, updatedAt: Date.now() };
            
            markLocalTouch(updatedOrder.id);
            import("../../routes/dbStoreFn")
              .then((m) => m.dbSaveOrderFn({ data: { order: updatedOrder } }))
              .catch((err) => console.error("MongoDB order sync failed:", err));
              
            return updatedOrder;
          }),
        }),
      updateLine: (orderId, lineId, patch) =>
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            const lines = o.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l));
            const updatedOrder = { ...o, lines, updatedAt: Date.now() };
            
            markLocalTouch(updatedOrder.id);
            import("../../routes/dbStoreFn")
              .then((m) => m.dbSaveOrderFn({ data: { order: updatedOrder } }))
              .catch((err) => console.error("MongoDB order sync failed:", err));
              
            return updatedOrder;
          }),
        }),
      removeLine: (orderId, lineId) =>
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            const lines = o.lines.filter((l) => l.id !== lineId);
            const updatedOrder = { ...o, lines, updatedAt: Date.now() };
            
            markLocalTouch(updatedOrder.id);
            import("../../routes/dbStoreFn")
              .then((m) => m.dbSaveOrderFn({ data: { order: updatedOrder } }))
              .catch((err) => console.error("MongoDB order sync failed:", err));
              
            return updatedOrder;
          }),
        }),
      setOrderDiscount: (orderId, pct) =>
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            const updatedOrder = { ...o, discountPct: pct, updatedAt: Date.now() };
            
            markLocalTouch(updatedOrder.id);
            import("../../routes/dbStoreFn")
              .then((m) => m.dbSaveOrderFn({ data: { order: updatedOrder } }))
              .catch((err) => console.error("MongoDB order sync failed:", err));
              
            return updatedOrder;
          }),
        }),
      setTip: (orderId, amount) =>
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            const updatedOrder = { ...o, tipAmount: amount, updatedAt: Date.now() };
            
            markLocalTouch(updatedOrder.id);
            import("../../routes/dbStoreFn")
              .then((m) => m.dbSaveOrderFn({ data: { order: updatedOrder } }))
              .catch((err) => console.error("MongoDB order sync failed:", err));
              
            return updatedOrder;
          }),
        }),
      addPayment: (orderId, payment) =>
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            const updatedOrder = { ...o, payments: [...o.payments, payment], updatedAt: Date.now() };
            
            markLocalTouch(updatedOrder.id);
            import("../../routes/dbStoreFn")
              .then((m) => m.dbSaveOrderFn({ data: { order: updatedOrder } }))
              .catch((err) => console.error("MongoDB order sync failed:", err));
              
            return updatedOrder;
          }),
        }),
      closeOrder: (orderId) => {
        const o = get().orders.find((x) => x.id === orderId);
        if (!o) return;
        o.lines.forEach((l) => usePosInventory.getState().decrementForItem(l.itemId, l.qty));
        const paidAt = Date.now();
        set({
          orders: get().orders.map((x) => {
            if (x.id !== orderId) return x;
            const updatedOrder: Order = {
              ...x,
              status: "paid",
              closedAt: paidAt,
              paidAt,
              deliveryStatus: "received",
              updatedAt: paidAt,
            };
            
            markLocalTouch(updatedOrder.id);
            import("../../routes/dbStoreFn")
              .then((m) => m.dbSaveOrderFn({ data: { order: updatedOrder } }))
              .catch((err) => console.error("MongoDB order sync failed:", err));
              
            return updatedOrder;
          }),
        });
        usePosAudit.getState().log("order_paid", `#${o.number}`);
      },
      voidOrder: (orderId) => {
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            const updatedOrder: Order = { ...o, status: "void", updatedAt: Date.now() };
            
            markLocalTouch(updatedOrder.id);
            import("../../routes/dbStoreFn")
              .then((m) => m.dbSaveOrderFn({ data: { order: updatedOrder } }))
              .catch((err) => console.error("MongoDB order sync failed:", err));
              
            return updatedOrder;
          }),
        });
        usePosAudit.getState().log("order_void", orderId);
      },
      mergeOrders: (sourceId, destinationId) => {
        const src = get().orders.find((o) => o.id === sourceId);
        const dst = get().orders.find((o) => o.id === destinationId);
        if (!src || !dst) return;
        set({
          orders: get()
            .orders.map((o) => {
              if (o.id === destinationId) {
                const updatedOrder = { ...o, lines: [...o.lines, ...src.lines], updatedAt: Date.now() };
                
                markLocalTouch(updatedOrder.id);
                import("../../routes/dbStoreFn")
                  .then((m) => m.dbSaveOrderFn({ data: { order: updatedOrder } }))
                  .catch((err) => console.error("MongoDB order sync failed:", err));
                  
                return updatedOrder;
              }
              return o;
            })
            .filter((o) => o.id !== sourceId),
        });
        
        markLocalTouch(src.id);
        import("../../routes/dbStoreFn")
          .then((m) => {
            const srcVoided: Order = { ...src, status: "void" as const, updatedAt: Date.now() };
            return m.dbSaveOrderFn({ data: { order: srcVoided } });
          })
          .catch((err) => console.error("MongoDB order void sync failed during merge:", err));
          
        usePosAudit.getState().log("order_merge", `#${src.number} → #${dst.number}`);
      },
      updatePrepStatus: (orderId, status) =>
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            // Mirror kitchen status onto the customer-facing delivery tracker so
            // the customer always sees progress no matter which screen the
            // employee uses (KDS or Tracker).
            const mirroredDelivery =
              status === "preparing"
                ? "preparing"
                : status === "completed"
                  ? "ready"
                  : o.deliveryStatus;
            const updatedOrder = {
              ...o,
              prepStatus: status,
              deliveryStatus: mirroredDelivery as Order["deliveryStatus"],
              updatedAt: Date.now(),
            };
            markLocalTouch(updatedOrder.id);
            import("../../routes/dbStoreFn")
              .then((m) => m.dbSaveOrderFn({ data: { order: updatedOrder } }))
              .catch((err) => console.error("MongoDB order prep sync failed:", err));
            return updatedOrder;
          }),
        }),
      toggleLinePrepared: (orderId, lineId) =>
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            const lines = o.lines.map((l) =>
              l.id === lineId ? { ...l, prepared: !l.prepared } : l,
            );
            // auto-advance prepStatus when all lines are prepared
            const allDone = lines.every((l) => l.prepared);
            const newPrep = allDone
              ? ("completed" as const)
              : o.prepStatus === "to_cook"
                ? ("preparing" as const)
                : o.prepStatus;
            // Keep the customer delivery tracker in sync with kitchen progress.
            const mirroredDelivery =
              newPrep === "completed"
                ? "ready"
                : newPrep === "preparing"
                  ? "preparing"
                  : o.deliveryStatus;
            const updatedOrder = {
              ...o,
              lines,
              prepStatus: newPrep,
              deliveryStatus: mirroredDelivery as Order["deliveryStatus"],
              updatedAt: Date.now(),
            };
            markLocalTouch(updatedOrder.id);
            import("../../routes/dbStoreFn")
              .then((m) => m.dbSaveOrderFn({ data: { order: updatedOrder } }))
              .catch((err) => console.error("MongoDB order line sync failed:", err));
            return updatedOrder;
          }),
        }),
      updateDeliveryStatus: (orderId, status) =>
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            const updatedOrder = { ...o, deliveryStatus: status, updatedAt: Date.now() };
            markLocalTouch(updatedOrder.id);
            import("../../routes/dbStoreFn")
              .then((m) => m.dbSaveOrderFn({ data: { order: updatedOrder } }))
              .catch((err) => console.error("MongoDB delivery status sync failed:", err));
            return updatedOrder;
          }),
        }),
      setOrderTable: (orderId, tableId) =>
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            const updatedOrder = { ...o, tableId, updatedAt: Date.now() };
            markLocalTouch(updatedOrder.id);
            import("../../routes/dbStoreFn")
              .then((m) => m.dbSaveOrderFn({ data: { order: updatedOrder } }))
              .catch((err) => console.error("MongoDB order table sync failed:", err));
            usePosAudit
              .getState()
              .log("order_table_change", `#${o.number} → ${tableId ? "Table " + tableId.replace("t", "") : "no table"}`);
            return updatedOrder;
          }),
        }),
      deleteOrder: (orderId) => {
        const o = get().orders.find((x) => x.id === orderId);
        set({ orders: get().orders.filter((x) => x.id !== orderId) });
        import("../../routes/dbStoreFn")
          .then((m) => m.dbDeleteOrderFn({ data: { orderId } }))
          .catch((err) => console.error("MongoDB order delete sync failed:", err));
        if (o) usePosAudit.getState().log("order_delete", `#${o.number}`);
      },
    }),
    { name: "suite.pos.orders" },
  ),
);

/* ---------------- Tables ---------------- */
interface TableState {
  tables: Table[];
  seat: (tableId: string, orderId: string) => void;
  release: (tableId: string) => void;
  mergeTables: (sourceId: string, targetId: string) => void;
  unmerge: (tableId: string) => void;
  transferOrder: (fromTableId: string, toTableId: string) => void;
}
export const usePosTables = create<TableState>()(
  persist(
    (set, get) => ({
      tables: seedTables,
      seat: (tableId, orderId) =>
        set({
          tables: get().tables.map((t) =>
            t.id === tableId ? { ...t, status: "seated", orderId } : t,
          ),
        }),
      release: (tableId) =>
        set({
          tables: get().tables.map((t) =>
            t.id === tableId ? { ...t, status: "free", orderId: undefined } : t,
          ),
        }),
      mergeTables: (sourceId, targetId) => {
        if (sourceId === targetId) return;
        const target = get().tables.find((t) => t.id === targetId);
        if (!target) return;
        set({
          tables: get().tables.map((t) => {
            if (t.id === sourceId)
              return { ...t, mergedInto: targetId, orderId: undefined, status: "free" };
            if (t.id === targetId) return { ...t, mergedFrom: [...(t.mergedFrom ?? []), sourceId] };
            return t;
          }),
        });
        usePosAudit.getState().log("table_merge", `${sourceId} â†’ ${targetId}`);
      },
      unmerge: (tableId) => {
        set({
          tables: get().tables.map((t) => {
            if (t.id === tableId) return { ...t, mergedInto: undefined };
            if (t.mergedFrom?.includes(tableId))
              return { ...t, mergedFrom: t.mergedFrom.filter((id) => id !== tableId) };
            return t;
          }),
        });
      },
      transferOrder: (fromTableId, toTableId) => {
        const from = get().tables.find((t) => t.id === fromTableId);
        if (!from?.orderId) return;
        const orderId = from.orderId;
        set({
          tables: get().tables.map((t) => {
            if (t.id === fromTableId) return { ...t, status: "free", orderId: undefined };
            if (t.id === toTableId) return { ...t, status: "seated", orderId };
            return t;
          }),
        });
        usePosOrders.setState({
          orders: usePosOrders
            .getState()
            .orders.map((o) => (o.id === orderId ? { ...o, tableId: toTableId } : o)),
        });
        usePosAudit.getState().log("table_transfer", `${fromTableId} â†’ ${toTableId}`);
      },
    }),
    { name: "suite.pos.tables" },
  ),
);

/* ---------------- Cash Drawer ---------------- */
interface CashState {
  sessions: CashDrawerSession[];
  openSession: (openingFloat: number, userId: string) => CashDrawerSession;
  closeSession: (id: string, countedCash: number, notes?: string) => void;
}
export const useCash = create<CashState>()(
  persist(
    (set, get) => ({
      sessions: [],
      openSession: (openingFloat, userId) => {
        const s: CashDrawerSession = {
          id: uid("cd"),
          openedAt: Date.now(),
          openingFloat,
          userId,
        };
        set({ sessions: [s, ...get().sessions] });
        usePosAudit.getState().log("cash_open", `float ${openingFloat}`, userId);
        return s;
      },
      closeSession: (id, countedCash, notes) => {
        const s = get().sessions.find((x) => x.id === id);
        if (!s) return;
        const cashFromOrders = usePosOrders
          .getState()
          .orders.filter((o) => o.status === "paid" && (o.closedAt ?? 0) >= s.openedAt)
          .flatMap((o) => o.payments)
          .filter((p) => p.method === "cash")
          .reduce((sum, p) => sum + p.amount, 0);
        const expected = s.openingFloat + cashFromOrders;
        const variance = countedCash - expected;
        set({
          sessions: get().sessions.map((x) =>
            x.id === id
              ? { ...x, closedAt: Date.now(), countedCash, expectedCash: expected, variance, notes }
              : x,
          ),
        });
        usePosAudit
          .getState()
          .log(
            "cash_close",
            `expected ${expected.toFixed(2)} counted ${countedCash.toFixed(2)} var ${variance.toFixed(2)}`,
          );
      },
    }),
    { name: "suite.pos.cash" },
  ),
);

/* ---------------- Settings (i18n, customer display) ---------------- */
interface SettingsState {
  locale: "en" | "es" | "fr";
  taxRate: number;
  restaurantName: string;
  slideshowEnabled: boolean;
  slideshowIntervalSec: number;
  emailReceiptsEnabled: boolean;
  paymentGatewayMode: "demo" | "live";
  setLocale: (l: SettingsState["locale"]) => void;
  set: (patch: Partial<SettingsState>) => void;
}
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      locale: "en",
      taxRate: 0.08,
      restaurantName: "OdooCafé",
      slideshowEnabled: true,
      slideshowIntervalSec: 5,
      emailReceiptsEnabled: true,
      paymentGatewayMode: "demo",
      setLocale: (locale) => set({ locale }),
      set: (patch) => set(patch),
    }),
    { name: "suite.pos.settings" },
  ),
);
