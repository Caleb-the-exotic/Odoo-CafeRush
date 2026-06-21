import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/pos")({
  head: () => ({ meta: [{ title: "POS — OdooCafé" }] }),
  component: () => <Outlet />,
});
