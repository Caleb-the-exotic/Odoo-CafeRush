// Barrel exports for the unified store.
//
// State is split by module to prevent cross-module data leaks:
//   - POS module:    src/store/pos
//   - Tables module: src/store/tables
//
// Persist keys are namespaced (`suite.pos.*`, `suite.tables.*`) so
// localStorage from each module never overwrites another.
//
// Hook naming convention:
//   POS    -> usePos<Slice>     (usePosAuth, usePosOrders, usePosMenu, ...)
//   Tables -> useTables<Slice>  (useTablesAuth, useTablesData)
//
// Admin module currently has no global state; add `src/store/admin` when needed.

export * from "./pos";
export * from "./tables";
