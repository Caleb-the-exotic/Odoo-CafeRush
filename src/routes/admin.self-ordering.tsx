import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/admin/Layout";
import { usePersisted, storeKeys, type SelfOrderingSettings, type Table } from "@/store/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/self-ordering")({
  head: () => ({ meta: [{ title: "Self Ordering — Bistro POS" }] }),
  component: SelfOrderingPage,
});

function SelfOrderingPage() {
  const [settings, setSettings] = usePersisted<SelfOrderingSettings>(storeKeys.settings, {
    enabled: true,
    mode: "online",
    bgColor: "#fdf6f0",
    bgImage: "",
  });
  const [tables, setTables] = usePersisted<Table[]>(storeKeys.tables, []);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (tables.length === 0) {
      const seeded: Table[] = Array.from({ length: 6 }, (_, i) => ({
        id: crypto.randomUUID(),
        name: `Table ${i + 1}`,
        token: `table-${i + 1}-${Math.random().toString(36).slice(2, 8)}`,
      }));
      setTables(seeded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTable = () => {
    if (!newName.trim()) return;
    setTables([
      ...tables,
      {
        id: crypto.randomUUID(),
        name: newName,
        token: `${newName.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 8)}`,
      },
    ]);
    setNewName("");
  };

  return (
    <Layout>
      <div className="max-w-5xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Self Ordering</h1>
          <p className="text-muted-foreground text-sm">
            Let guests scan a table QR and order from their phone.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Self Ordering</Label>
                <p className="text-xs text-muted-foreground">
                  Master switch for customer ordering pages.
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
              />
            </div>
            <div>
              <Label>Mode</Label>
              <Select
                value={settings.mode}
                onValueChange={(v: "online" | "qr_only") => setSettings({ ...settings, mode: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online Ordering (full flow)</SelectItem>
                  <SelectItem value="qr_only">QR Menu Only (read-only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Customers scan a table QR and are taken straight to the menu — no splash screen.</p>
            <p>
              Orders submitted from the customer flow appear in the Kitchen Display (KDS) in real
              time on this device.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-end gap-3 justify-between mb-4">
            <div>
              <h2 className="font-semibold">Tables & QR Codes</h2>
              <p className="text-sm text-muted-foreground">Each table gets a unique URL.</p>
            </div>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Table 7"
                className="w-40"
              />
              <Button onClick={addTable}>
                <Plus className="size-4 mr-1" /> Add Table
              </Button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((t) => (
              <TableCard
                key={t.id}
                table={t}
                onDelete={() => setTables(tables.filter((x) => x.id !== t.id))}
              />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function TableCard({ table, onDelete }: { table: Table; onDelete: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = `${window.location.origin}/admin/s/${table.token}`;
    setUrl(u);
    if (ref.current)
      QRCode.toCanvas(ref.current, u, {
        width: 180,
        margin: 1,
        color: { dark: "#5c2a4a", light: "#ffffff" },
      });
  }, [table.token]);

  const download = () => {
    if (!ref.current) return;
    const link = document.createElement("a");
    link.download = `${table.name}-qr.png`;
    link.href = ref.current.toDataURL();
    link.click();
  };

  return (
    <div className="rounded-lg border p-4 flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between">
        <div className="font-semibold">{table.name}</div>
        <Button size="icon" variant="ghost" onClick={onDelete}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
      <canvas ref={ref} />
      <a
        href={url}
        target="_blank"
        className="text-xs text-accent break-all text-center hover:underline"
      >
        {url}
      </a>
      <Button variant="outline" size="sm" className="w-full" onClick={download}>
        <Download className="size-4 mr-1" /> Download QR
      </Button>
    </div>
  );
}
