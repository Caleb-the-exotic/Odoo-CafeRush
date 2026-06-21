import { useEffect } from "react";
import { getInitialDataFn, dbFetchOrdersFn } from "../routes/dbStoreFn";
import { usePosAuth, usePosMenu, usePosOrders } from "../store/pos";
import { usePersisted, storeKeys } from "../store/admin";
import { recentlyTouched } from "../lib/pos/syncTracker";

export function DbHydrator({ children }: { children: React.ReactNode }) {
  const [, setRatings] = usePersisted<any[]>(storeKeys.ratings, []);

  useEffect(() => {
    let active = true;

    // ── Initial full hydration (users, menu, orders, ratings + seed) ──────────
    async function initialHydrate() {
      try {
        console.log("[DbHydrator] Initial hydration from MongoDB...");
        const res = await getInitialDataFn({});
        if (res && res.ok && active) {
          if (res.users)     usePosAuth.setState({ users: res.users });
          if (res.menuItems) usePosMenu.setState({ items: res.menuItems });
          if (res.orders)    usePosOrders.setState({ orders: res.orders });
          if (res.ratings)   setRatings(res.ratings);
        }
      } catch (err) {
        console.error("[DbHydrator] Initial hydration error:", err);
      }
    }

    // ── Background poll: only fetch orders and MERGE ──────────────────────────
    // Merge strategy: DB is the authority for persisted orders.
    // Local-only orders (not yet saved to DB) are preserved by checking updatedAt.
    async function pollOrders() {
      try {
        const res = await dbFetchOrdersFn({});
        if (!res || !res.ok || !res.orders || !active) return;

        const dbOrders: any[] = res.orders;

        usePosOrders.setState((state) => {
          const localOrders = state.orders;

          // Build a map of DB orders by id
          const dbMap = new Map(dbOrders.map((o: any) => [o.id, o]));

          // Merge strategy (clock-skew proof):
          // The database is the single source of truth. We only keep the local
          // version when THIS device just edited the order (within the grace
          // window) so the editor's own change isn't briefly reverted by a poll
          // that races the in-flight save. We deliberately do NOT compare
          // updatedAt across devices, because phone/laptop clocks drift and that
          // drift was silently dropping tracker updates on the customer's screen.
          const merged = localOrders
            .map((local) => {
              const remote = dbMap.get(local.id);
              if (recentlyTouched(local.id)) return local; // protect in-flight edit / fresh local order
              if (!remote) return null; // deleted on another device — drop it locally too
              return remote; // DB is authoritative — always reflect remote changes
            })
            .filter((o): o is NonNullable<typeof o> => o !== null);

          // Add any DB orders not present locally (e.g. created in another tab)
          for (const dbOrder of dbOrders) {
            if (!merged.find((o) => o.id === dbOrder.id)) {
              merged.push(dbOrder);
            }
          }

          // Sort by number descending (newest first)
          merged.sort((a, b) => (b.number ?? 0) - (a.number ?? 0));

          return { orders: merged };
        });
      } catch (err) {
        // silently ignore poll errors — connection might be momentarily unavailable
      }
    }

    initialHydrate();

    // Poll orders every 3 seconds after initial load
    const interval = setInterval(() => {
      pollOrders();
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
export default DbHydrator;
