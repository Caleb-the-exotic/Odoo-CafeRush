/**
 * Cooking duration in SECONDS for each menu item (by item id).
 * The tracker computes cookEndAt = orderCreatedAt + max(durations of ordered items).
 */
export const DISH_COOK_SECS: Record<string, number> = {
  m1:  5 * 60,   // Masala Tea      — 5 min
  m2:  4 * 60,   // Coffee          — 4 min
  m3:  3 * 60,   // Mango Lassi     — 3 min
  m4:  3 * 60,   // Blueberry Milkshake — 3 min
  m5: 18 * 60,   // Kunafa          — 18 min
  m6: 12 * 60,   // Cheese Burger   — 12 min
  m7: 20 * 60,   // Pizza           — 20 min
  m8:  8 * 60,   // Maggie          — 8 min
  m9:  5 * 60,   // Pani Puri       — 5 min
  m10:15 * 60,   // Pav Bhaji       — 15 min
  m11: 4 * 60,   // Mojito          — 4 min
  m12:10 * 60,   // Puff            — 10 min
  m13: 5 * 60,   // Cake            — 5 min
  m14: 1 * 60,   // Ice Water       — 1 min
  m15:25 * 60,   // Special Biryani — 25 min (longest)
};

/** Label shown to customer: "~X min" */
export const DISH_COOK_LABEL: Record<string, string> = {
  m1:  "~5 min",
  m2:  "~4 min",
  m3:  "~3 min",
  m4:  "~3 min",
  m5:  "~18 min",
  m6:  "~12 min",
  m7:  "~20 min",
  m8:  "~8 min",
  m9:  "~5 min",
  m10: "~15 min",
  m11: "~4 min",
  m12: "~10 min",
  m13: "~5 min",
  m14: "~1 min",
  m15: "~25 min",
};

/**
 * Given an array of itemIds in an order, returns:
 * - maxSec: the cook time of the slowest dish (seconds)
 * - label:  human-readable e.g. "~25 min"
 */
export function getOrderCookInfo(itemIds: string[]): { maxSec: number; label: string } {
  if (itemIds.length === 0) return { maxSec: 0, label: "" };
  const maxSec = Math.max(...itemIds.map((id) => DISH_COOK_SECS[id] ?? 0));
  const mins = Math.ceil(maxSec / 60);
  return { maxSec, label: `~${mins} min` };
}
