// Tracks which orders this device mutated locally, so the background DB poll
// (DbHydrator) can treat the server as the source of truth for everything else
// WITHOUT depending on cross-device wall-clock timestamps (which drift between
// phones/laptops and caused tracker updates to be silently dropped).
const touches = new Map<string, number>();

/** Mark an order as just-modified on THIS device. */
export function markLocalTouch(id: string) {
  if (id) touches.set(id, Date.now());
}

/**
 * Was this order changed locally within the grace window?
 * Uses only this device's own clock, so it is immune to clock skew.
 * Default window covers ~2 poll cycles (poll runs every 3s).
 */
export function recentlyTouched(id: string, windowMs = 7000): boolean {
  const t = touches.get(id);
  if (t === undefined) return false;
  if (Date.now() - t > windowMs) {
    touches.delete(id);
    return false;
  }
  return true;
}
