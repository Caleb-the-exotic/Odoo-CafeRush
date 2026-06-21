import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/admin/Layout";
import {
  usePersisted,
  storeKeys,
  type ProductPromotion,
  type OrderPromotion,
  type Product,
} from "@/store/admin";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/promotions")({
  head: () => ({ meta: [{ title: "Promotions — Bistro POS" }] }),
  component: PromotionsPage,
});

function PromotionsPage() {
  const [products] = usePersisted<Product[]>(storeKeys.products, []);
  const [pp, setPP] = usePersisted<ProductPromotion[]>(storeKeys.productPromos, []);
  const [op, setOP] = usePersisted<OrderPromotion[]>(storeKeys.orderPromos, []);

  const [pf, setPf] = useState<Omit<ProductPromotion, "id">>({
    name: "",
    productId: products[0]?.id || "",
    minQty: 2,
    discountType: "percentage",
    value: 10,
    active: true,
  });
  const [of, setOf] = useState<Omit<OrderPromotion, "id">>({
    name: "",
    minAmount: 500,
    discountType: "percentage",
    value: 10,
    active: true,
  });

  return (
    <Layout>
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold">Promotions</h1>
        <p className="text-muted-foreground text-sm">
          Auto-applied at checkout — no coupon required.
        </p>

        <Tabs defaultValue="product" className="mt-6">
          <TabsList>
            <TabsTrigger value="product">Product Promotions</TabsTrigger>
            <TabsTrigger value="order">Order Promotions</TabsTrigger>
          </TabsList>

          <TabsContent value="product" className="mt-4 grid lg:grid-cols-[1fr_2fr] gap-6">
            <div className="rounded-xl border bg-card p-5 space-y-3 h-fit">
              <h2 className="font-semibold">New Product Promotion</h2>
              <div>
                <Label>Name</Label>
                <Input
                  value={pf.name}
                  onChange={(e) => setPf({ ...pf, name: e.target.value })}
                  placeholder="Buy 2 Burgers"
                />
              </div>
              <div>
                <Label>Product</Label>
                <Select value={pf.productId} onValueChange={(v) => setPf({ ...pf, productId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Minimum Quantity</Label>
                <Input
                  type="number"
                  value={pf.minQty}
                  onChange={(e) => setPf({ ...pf, minQty: +e.target.value })}
                />
              </div>
              <div>
                <Label>Discount Type</Label>
                <Select
                  value={pf.discountType}
                  onValueChange={(v: "percentage" | "fixed") => setPf({ ...pf, discountType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  type="number"
                  value={pf.value}
                  onChange={(e) => setPf({ ...pf, value: +e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={pf.active} onCheckedChange={(v) => setPf({ ...pf, active: v })} />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!pf.name.trim() || !pf.productId) {
                    toast.error("Fill all fields");
                    return;
                  }
                  setPP([...pp, { ...pf, id: crypto.randomUUID() }]);
                  toast.success("Promotion added");
                  setPf({ ...pf, name: "" });
                }}
              >
                <Plus className="size-4 mr-1" /> Add
              </Button>
            </div>
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-left px-4 py-2">Product</th>
                    <th className="text-left px-4 py-2">Min Qty</th>
                    <th className="text-left px-4 py-2">Discount</th>
                    <th className="text-left px-4 py-2">Active</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pp.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No product promotions
                      </td>
                    </tr>
                  )}
                  {pp.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2">
                        {products.find((x) => x.id === p.productId)?.name || "—"}
                      </td>
                      <td className="px-4 py-2">{p.minQty}</td>
                      <td className="px-4 py-2">
                        {p.discountType === "percentage" ? `${p.value}%` : `₹${p.value}`}
                      </td>
                      <td className="px-4 py-2">
                        <Switch
                          checked={p.active}
                          onCheckedChange={() =>
                            setPP(pp.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)))
                          }
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPP(pp.filter((x) => x.id !== p.id))}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="order" className="mt-4 grid lg:grid-cols-[1fr_2fr] gap-6">
            <div className="rounded-xl border bg-card p-5 space-y-3 h-fit">
              <h2 className="font-semibold">New Order Promotion</h2>
              <div>
                <Label>Name</Label>
                <Input
                  value={of.name}
                  onChange={(e) => setOf({ ...of, name: e.target.value })}
                  placeholder="Spend ₹500"
                />
              </div>
              <div>
                <Label>Minimum Order Amount</Label>
                <Input
                  type="number"
                  value={of.minAmount}
                  onChange={(e) => setOf({ ...of, minAmount: +e.target.value })}
                />
              </div>
              <div>
                <Label>Discount Type</Label>
                <Select
                  value={of.discountType}
                  onValueChange={(v: "percentage" | "fixed") => setOf({ ...of, discountType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  type="number"
                  value={of.value}
                  onChange={(e) => setOf({ ...of, value: +e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={of.active} onCheckedChange={(v) => setOf({ ...of, active: v })} />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!of.name.trim()) {
                    toast.error("Name required");
                    return;
                  }
                  setOP([...op, { ...of, id: crypto.randomUUID() }]);
                  toast.success("Promotion added");
                  setOf({ ...of, name: "" });
                }}
              >
                <Plus className="size-4 mr-1" /> Add
              </Button>
            </div>
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-left px-4 py-2">Min ₹</th>
                    <th className="text-left px-4 py-2">Discount</th>
                    <th className="text-left px-4 py-2">Active</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {op.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No order promotions
                      </td>
                    </tr>
                  )}
                  {op.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2">₹{p.minAmount}</td>
                      <td className="px-4 py-2">
                        {p.discountType === "percentage" ? `${p.value}%` : `₹${p.value}`}
                      </td>
                      <td className="px-4 py-2">
                        <Switch
                          checked={p.active}
                          onCheckedChange={() =>
                            setOP(op.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)))
                          }
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setOP(op.filter((x) => x.id !== p.id))}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
