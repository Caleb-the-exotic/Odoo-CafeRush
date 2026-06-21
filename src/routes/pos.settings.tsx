import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/pos/AppShell";
import { useSettings } from "@/store";

export const Route = createFileRoute("/pos/settings")({
  head: () => ({ meta: [{ title: "Settings — OdooCafé" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const s = useSettings();
  return (
    <AppShell>
      <PageHeader title="Settings" subtitle="Restaurant configuration." />
      <div className="p-6 max-w-2xl space-y-6">
        <section className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">General</h2>
          <Field label="Restaurant name">
            <input
              value={s.restaurantName}
              onChange={(e) => s.set({ restaurantName: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Tax rate (decimal, e.g. 0.08)">
            <input
              type="number"
              step="0.001"
              value={s.taxRate}
              onChange={(e) => s.set({ taxRate: Number(e.target.value) || 0 })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            />
          </Field>
          <Field label="Language">
            <select
              value={s.locale}
              onChange={(e) => s.setLocale(e.target.value as typeof s.locale)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="es">EspaÃ±ol</option>
              <option value="fr">FranÃ§ais</option>
            </select>
          </Field>
        </section>

        <section className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">Customer display</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.slideshowEnabled}
              onChange={(e) => s.set({ slideshowEnabled: e.target.checked })}
            />
            Enable image slideshow
          </label>
          <Field label="Slide interval (seconds)">
            <input
              type="number"
              min={2}
              value={s.slideshowIntervalSec}
              onChange={(e) =>
                s.set({ slideshowIntervalSec: Math.max(2, Number(e.target.value) || 5) })
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            />
          </Field>
        </section>

        <section className="bg-card border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">Payments & receipts</h2>
          <Field label="Payment gateway mode">
            <select
              value={s.paymentGatewayMode}
              onChange={(e) =>
                s.set({ paymentGatewayMode: e.target.value as typeof s.paymentGatewayMode })
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="demo">Demo (no real charges)</option>
              <option value="live">Live (mock live integration)</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.emailReceiptsEnabled}
              onChange={(e) => s.set({ emailReceiptsEnabled: e.target.checked })}
            />
            Enable email receipts (SMTP)
          </label>
          <p className="text-xs text-muted-foreground">
            In production these connect to a payment provider and SMTP relay. Here they're simulated
            client-side.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
