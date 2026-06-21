import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/admin/Layout";
import { usePersisted, storeKeys, type Coupon } from "@/store/admin";
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
import { Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/coupons")({
  head: () => ({ meta: [{ title: "Coupons — Bistro POS" }] }),
  component: CouponsPage,
});

function CouponsPage() {
  const [coupons, setCoupons] = usePersisted<Coupon[]>(storeKeys.coupons, []);
  const [form, setForm] = useState<Omit<Coupon, "id">>({
    code: "",
    discountType: "percentage",
    value: 10,
    active: true,
  });

  const add = () => {
    if (!form.code.trim()) {
      toast.error("Coupon code required");
      return;
    }
    if (form.value <= 0) {
      toast.error("Value must be > 0");
      return;
    }
    setCoupons([...coupons, { ...form, code: form.code.toUpperCase(), id: crypto.randomUUID() }]);
    setForm({ code: "", discountType: "percentage", value: 10, active: true });
    toast.success("Coupon added");
  };

  const toggle = (id: string) =>
    setCoupons(coupons.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  const remove = (id: string) => setCoupons(coupons.filter((c) => c.id !== id));

  return (
    <Layout>
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <p className="text-muted-foreground text-sm">
          Discount codes employees apply at checkout or customers enter in self-order.
        </p>

        <div className="mt-6 grid lg:grid-cols-[1fr_2fr] gap-6">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold mb-4">New Coupon</h2>
            <div className="space-y-3">
              <div>
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="SUMMER20"
                />
              </div>
              <div>
                <Label>Discount Type</Label>
                <Select
                  value={form.discountType}
                  onValueChange={(v: "percentage" | "fixed") =>
                    setForm({ ...form, discountType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: +e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
              </div>
              <Button className="w-full" onClick={add}>
                <Plus className="size-4 mr-1" /> Add Coupon
              </Button>
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b font-semibold">All Coupons ({coupons.length})</div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Code</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-left px-4 py-2">Value</th>
                  <th className="text-left px-4 py-2">Active</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      No coupons yet
                    </td>
                  </tr>
                )}
                {coupons.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-2 font-mono font-semibold">{c.code}</td>
                    <td className="px-4 py-2 capitalize">{c.discountType}</td>
                    <td className="px-4 py-2">
                      {c.discountType === "percentage" ? `${c.value}%` : `₹${c.value}`}
                    </td>
                    <td className="px-4 py-2">
                      <Switch checked={c.active} onCheckedChange={() => toggle(c.id)} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
