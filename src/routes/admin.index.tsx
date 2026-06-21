import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Layout } from "@/components/admin/Layout";
import {
  usePersisted,
  storeKeys,
  type Order,
  type CustomerRating,
} from "@/store/admin";
import { usePosOrders, usePosAuth, usePosMenu } from "@/store";
import { computeTotals } from "@/lib/pos/format";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { FileDown, FileSpreadsheet, Trash2, KeyRound, UserPlus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — Bistro POS" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [authed] = usePersisted<boolean>("bistro.admin.authed", false);
  if (!authed) return <Navigate to="/login" search={{ redirect: "/admin" }} />;
  return <ReportsPage />;
}

type RangeKey = "today" | "week" | "month" | "custom";

const CHART_COLORS = [
  "oklch(0.42 0.06 340)",
  "oklch(0.68 0.13 190)",
  "oklch(0.65 0.17 145)",
  "oklch(0.78 0.16 75)",
  "oklch(0.55 0.18 25)",
];

const INITIAL_HISTORICAL_ORDERS = [
  {
    id: "hist-1",
    number: "2211",
    createdAt: new Date("2026-06-18T19:45:00").getTime(),
    employee: "Carol",
    session: "Evening",
    total: 1675.80,
    items: [
      { productId: "m15", name: "Special Biryani", price: 399, qty: 4 },
    ]
  },
  {
    id: "hist-2",
    number: "2207",
    createdAt: new Date("2026-06-19T20:15:00").getTime(),
    employee: "Bob",
    session: "Evening",
    total: 1465.80,
    items: [
      { productId: "m5", name: "Kunafa", price: 349, qty: 4 },
    ]
  },
  {
    id: "hist-3",
    number: "2226",
    createdAt: new Date("2026-06-14T13:30:00").getTime(),
    employee: "Carol",
    session: "Morning",
    total: 1256.85,
    items: [
      { productId: "m15", name: "Special Biryani", price: 399, qty: 3 },
    ]
  },
  {
    id: "hist-4",
    number: "2215",
    createdAt: new Date("2026-06-17T12:00:00").getTime(),
    employee: "Alice",
    session: "Morning",
    total: 1255.80,
    items: [
      { productId: "m6", name: "Cheese Burger", price: 299, qty: 4 },
    ]
  },
  {
    id: "hist-5",
    number: "2222",
    createdAt: new Date("2026-06-15T18:40:00").getTime(),
    employee: "Bob",
    session: "Evening",
    total: 1099.35,
    items: [
      { productId: "m5", name: "Kunafa", price: 349, qty: 3 },
    ]
  },
  {
    id: "hist-6",
    number: "2201",
    createdAt: new Date("2026-06-21T11:15:00").getTime(),
    employee: "Bob",
    session: "Morning",
    total: 1047.90,
    items: [
      { productId: "m7", name: "Pizza", price: 499, qty: 2 },
    ]
  },
  {
    id: "hist-7",
    number: "2223",
    createdAt: new Date("2026-06-15T21:05:00").getTime(),
    employee: "Carol",
    session: "Evening",
    total: 1045.80,
    items: [
      { productId: "m4", name: "Blueberry Milkshake", price: 249, qty: 4 },
    ]
  },
  {
    id: "hist-8",
    number: "2227",
    createdAt: new Date("2026-06-14T11:45:00").getTime(),
    employee: "Alice",
    session: "Morning",
    total: 835.80,
    items: [
      { productId: "m10", name: "Pav Bhaji", price: 199, qty: 4 },
    ]
  },
  {
    id: "hist-9",
    number: "2214",
    createdAt: new Date("2026-06-17T17:50:00").getTime(),
    employee: "Carol",
    session: "Evening",
    total: 784.35,
    items: [
      { productId: "m13", name: "Cake", price: 249, qty: 3 },
    ]
  },
  {
    id: "hist-10",
    number: "2203",
    createdAt: new Date("2026-06-20T09:30:00").getTime(),
    employee: "Alice",
    session: "Morning",
    total: 625.80,
    items: [
      { productId: "m2", name: "Coffee", price: 149, qty: 4 },
    ]
  },
  // Additional smaller orders to distribute quantities exactly for targets
  {
    id: "hist-11",
    number: "2202",
    createdAt: new Date("2026-06-18T10:15:00").getTime(),
    employee: "Bob",
    session: "Morning",
    total: 523.95,
    items: [
      { productId: "m7", name: "Pizza", price: 499, qty: 1 },
    ]
  },
  {
    id: "hist-12",
    number: "2204",
    createdAt: new Date("2026-06-19T11:00:00").getTime(),
    employee: "Alice",
    session: "Morning",
    total: 313.95,
    items: [
      { productId: "m6", name: "Cheese Burger", price: 299, qty: 1 },
    ]
  },
  {
    id: "hist-13",
    number: "2205",
    createdAt: new Date("2026-06-20T14:20:00").getTime(),
    employee: "Carol",
    session: "Morning",
    total: 261.45,
    items: [
      { productId: "m4", name: "Blueberry Milkshake", price: 249, qty: 1 },
    ]
  },
  {
    id: "hist-14",
    number: "2206",
    createdAt: new Date("2026-06-14T17:15:00").getTime(),
    employee: "Bob",
    session: "Evening",
    total: 522.90,
    items: [
      { productId: "m13", name: "Cake", price: 249, qty: 2 },
    ]
  },
  {
    id: "hist-15",
    number: "2208",
    createdAt: new Date("2026-06-15T09:45:00").getTime(),
    employee: "Alice",
    session: "Morning",
    total: 469.35,
    items: [
      { productId: "m2", name: "Coffee", price: 149, qty: 3 },
    ]
  },
  {
    id: "hist-16",
    number: "2209",
    createdAt: new Date("2026-06-16T15:10:00").getTime(),
    employee: "Carol",
    session: "Morning",
    total: 208.95,
    items: [
      { productId: "m10", name: "Pav Bhaji", price: 199, qty: 1 },
    ]
  },
  {
    id: "hist-17",
    number: "2210",
    createdAt: new Date("2026-06-17T11:30:00").getTime(),
    employee: "Bob",
    session: "Morning",
    total: 406.35,
    items: [
      { productId: "m8", name: "Maggie", price: 129, qty: 3 },
    ]
  },
  {
    id: "hist-18",
    number: "2212",
    createdAt: new Date("2026-06-18T13:40:00").getTime(),
    employee: "Alice",
    session: "Morning",
    total: 270.90,
    items: [
      { productId: "m8", name: "Maggie", price: 129, qty: 2 },
    ]
  },
  {
    id: "hist-19",
    number: "2213",
    createdAt: new Date("2026-06-19T14:15:00").getTime(),
    employee: "Carol",
    session: "Morning",
    total: 417.90,
    items: [
      { productId: "m3", name: "Mango Lassi", price: 199, qty: 2 },
    ]
  },
  {
    id: "hist-20",
    number: "2216",
    createdAt: new Date("2026-06-14T18:50:00").getTime(),
    employee: "Bob",
    session: "Evening",
    total: 417.90,
    items: [
      { productId: "m3", name: "Mango Lassi", price: 199, qty: 2 },
    ]
  },
  {
    id: "hist-21",
    number: "2217",
    createdAt: new Date("2026-06-15T12:30:00").getTime(),
    employee: "Alice",
    session: "Morning",
    total: 624.75,
    items: [
      { productId: "m3", name: "Mango Lassi", price: 199, qty: 1 },
      { productId: "m1", name: "Masala Tea", price: 99, qty: 4 },
    ]
  },
  {
    id: "hist-22",
    number: "2218",
    createdAt: new Date("2026-06-16T16:40:00").getTime(),
    employee: "Carol",
    session: "Morning",
    total: 415.80,
    items: [
      { productId: "m1", name: "Masala Tea", price: 99, qty: 4 },
    ]
  },
  {
    id: "hist-23",
    number: "2219",
    createdAt: new Date("2026-06-17T18:25:00").getTime(),
    employee: "Bob",
    session: "Evening",
    total: 519.75,
    items: [
      { productId: "m9", name: "Pani Puri", price: 99, qty: 5 },
    ]
  },
  {
    id: "hist-24",
    number: "2220",
    createdAt: new Date("2026-06-18T12:05:00").getTime(),
    employee: "Alice",
    session: "Morning",
    total: 51.45,
    items: [
      { productId: "m12", name: "Puff", price: 49, qty: 1 },
    ]
  },
  {
    id: "hist-25",
    number: "2221",
    createdAt: new Date("2026-06-19T15:20:00").getTime(),
    employee: "Carol",
    session: "Morning",
    total: 939.75,
    items: [
      { productId: "m11", name: "Mojito", price: 179, qty: 5 },
    ]
  },
  {
    id: "hist-26",
    number: "2224",
    createdAt: new Date("2026-06-20T17:15:00").getTime(),
    employee: "Bob",
    session: "Evening",
    total: 91.35,
    items: [
      { productId: "m14", name: "Ice Water", price: 29, qty: 3 },
    ]
  }
];

function ReportsPage() {
  const [orders] = usePersisted<Order[]>(storeKeys.orders, []);
  const [ratings] = usePersisted<CustomerRating[]>(storeKeys.ratings, []);

  // Pull live order data from the POS store for truly dynamic dashboard
  const { orders: liveOrders } = usePosOrders();
  // Live menu items — used to map dish names → correct categories
  const menuItems = usePosMenu((s) => s.items);
  const users = usePosAuth((s) => s.users);

  const [activeSubTab, setActiveSubTab] = useState<"overview" | "feedback" | "employees">("overview");
  const [range, setRange] = useState<RangeKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [employee, setEmployee] = useState<string>("all");
  const [session, setSession] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [selectedBillOrder, setSelectedBillOrder] = useState<any | null>(null);

  // Normalize and merge live POS orders with historical data
  const normalizedOrders = useMemo(() => {
    // 1. Fetch live paid orders
    const paidLiveOrders = liveOrders.filter((o) => o.status === "paid").map((o) => {
      const server = users.find((u) => u.id === o.serverId);
      const employeeName = server ? server.name : (o.customerName || "Server");
      const hour = new Date(o.createdAt).getHours();
      const sessionName = hour < 16 ? "Morning" : "Evening";
      const totals = computeTotals(o.lines, o.discountPct, o.tipAmount);
      return {
        id: o.id,
        number: String(o.number),
        createdAt: o.createdAt,
        employee: employeeName,
        session: sessionName,
        total: totals.total,
        items: o.lines.map((l) => ({
          productId: l.itemId,
          name: l.name,
          price: l.unitPrice,
          qty: l.qty,
        })),
        isLive: true,
      };
    });

    // 2. Fetch historical seed orders
    const mappedSeedOrders = INITIAL_HISTORICAL_ORDERS.map((o) => ({
      id: o.id,
      number: o.number,
      createdAt: o.createdAt,
      employee: o.employee,
      session: o.session,
      total: o.total,
      items: o.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        qty: i.qty,
      })),
      isLive: false,
    }));

    // Merge both!
    return [...paidLiveOrders, ...mappedSeedOrders];
  }, [liveOrders, users]);

  const employees = Array.from(new Set(normalizedOrders.map((o) => o.employee).filter(Boolean) as string[]));
  const sessions = Array.from(new Set(normalizedOrders.map((o) => o.session).filter(Boolean) as string[]));

  const filtered = useMemo(() => {
    const now = Date.now();
    const day = 86400_000;
    let from = 0,
      to = Infinity;
    if (range === "today") {
      from = now - day;
    } else if (range === "week") {
      from = now - 7 * day;
    } else if (range === "month") {
      from = now - 30 * day;
    } else if (range === "custom") {
      from = customFrom ? new Date(customFrom).getTime() : 0;
      to = customTo ? new Date(customTo).getTime() + day : Infinity;
    }
    return normalizedOrders.filter((o) => {
      if (o.createdAt < from || o.createdAt > to) return false;
      if (employee !== "all" && o.employee !== employee) return false;
      if (session !== "all" && o.session !== session) return false;
      if (productFilter !== "all" && !o.items.some((i) => i.productId === productFilter))
        return false;
      return true;
    });
  }, [normalizedOrders, range, customFrom, customTo, employee, session, productFilter]);

  // ── Live POS aggregates (from real active/paid in-app purchases) ───────────
  const activeLiveOrders = useMemo(
    () => liveOrders.filter((o) => o.status === "open" || o.status === "sent").length,
    [liveOrders],
  );

  const liveRevenue = useMemo(
    () =>
      liveOrders.filter((o) => o.status === "paid").reduce((s, o) => {
        const totals = computeTotals(o.lines, o.discountPct, o.tipAmount);
        return s + totals.total;
      }, 0),
    [liveOrders],
  );

  // ── Normalized aggregates ──────────────────────────────────────────────────
  const totalOrders = filtered.length;
  const revenue = filtered.reduce((s, o) => s + o.total, 0);
  const avg = totalOrders ? revenue / totalOrders : 0;

  // Use the filtered metrics for dashboard tiles
  const displayRevenue = revenue;
  const displayOrders = totalOrders;
  const displayAvg = avg;

  // sales trend by day
  const trend = useMemo(() => {
    const buckets: Record<string, { date: string; orders: number; revenue: number }> = {};
    filtered.forEach((o) => {
      const d = new Date(o.createdAt).toISOString().slice(0, 10);
      buckets[d] ||= { date: d, orders: 0, revenue: 0 };
      buckets[d].orders++;
      buckets[d].revenue += o.total;
    });
    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  // top products
  const productAgg = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    filtered.forEach((o) =>
      o.items.forEach((i) => {
        map[i.productId] ||= { name: i.name, qty: 0, revenue: 0 };
        map[i.productId].qty += i.qty;
        map[i.productId].revenue += i.qty * i.price;
      }),
    );
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  // Category breakdown: uses menu items for accurate cafe categories
  const categoryAgg = useMemo(() => {
    const map: Record<string, { name: string; revenue: number }> = {};
    filtered.forEach((o) => {
      o.items.forEach((i) => {
        const menuItem = menuItems.find(
          (m) => m.id === i.productId || m.name.toLowerCase() === i.name.toLowerCase(),
        );
        const cat = menuItem?.category ?? "Others";
        map[cat] ||= { name: cat, revenue: 0 };
        map[cat].revenue += i.qty * i.price;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filtered, menuItems]);

  const topOrders = [...filtered].sort((a, b) => b.total - a.total).slice(0, 10);

  const feedbackStats = useMemo(() => {
    if (ratings.length === 0)
      return { avgRating: 0, totalReviews: 0, positivePct: 0, breakdown: [] };
    const total = ratings.length;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const avg = sum / total;

    const counts = [0, 0, 0, 0, 0];
    ratings.forEach((r) => {
      const starVal = Math.max(1, Math.min(5, Math.round(r.rating)));
      counts[starVal - 1]++;
    });

    const positiveCount = counts[3] + counts[4];
    const positivePct = total ? (positiveCount / total) * 100 : 0;

    return {
      avgRating: avg,
      totalReviews: total,
      positivePct,
      breakdown: [
        { name: "5 Stars", count: counts[4] },
        { name: "4 Stars", count: counts[3] },
        { name: "3 Stars", count: counts[2] },
        { name: "2 Stars", count: counts[1] },
        { name: "1 Star", count: counts[0] },
      ],
    };
  }, [ratings]);

  const downloadSingleBillPDF = async (order: any) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 190]
    });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("CafeRush", 40, 12, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Savor the Spices of India", 40, 16, { align: "center" });
    doc.text("123 Tech Park, Bangalore", 40, 20, { align: "center" });
    doc.text("GSTIN: 29AAAAA1111A1Z1", 40, 24, { align: "center" });
    
    doc.text("--------------------------------------------------", 40, 28, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    doc.text(`Bill No: #${order.number}`, 8, 33);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`, 8, 37);
    doc.text(`Server: ${order.employee || "System"}`, 8, 41);
    
    doc.text("--------------------------------------------------", 40, 45, { align: "center" });
    
    let y = 50;
    doc.setFont("helvetica", "bold");
    doc.text("Item", 8, y);
    doc.text("Qty", 48, y);
    doc.text("Total", 64, y);
    doc.setFont("helvetica", "normal");
    
    y += 5;
    order.items.forEach((item: any) => {
      doc.text(item.name.substring(0, 20), 8, y);
      doc.text(String(item.qty), 48, y);
      doc.text(`Rs. ${(item.qty * item.price).toFixed(2)}`, 64, y);
      y += 5;
    });
    
    doc.text("--------------------------------------------------", 40, y, { align: "center" });
    y += 4;
    
    const subtotal = order.total / 1.05;
    const cgst = subtotal * 0.025;
    const sgst = subtotal * 0.025;
    
    doc.text("Subtotal:", 8, y);
    doc.text(`Rs. ${subtotal.toFixed(2)}`, 64, y);
    y += 4;
    doc.text("CGST (2.5%):", 8, y);
    doc.text(`Rs. ${cgst.toFixed(2)}`, 64, y);
    y += 4;
    doc.text("SGST (2.5%):", 8, y);
    doc.text(`Rs. ${sgst.toFixed(2)}`, 64, y);
    y += 5;
    
    doc.setFont("helvetica", "bold");
    doc.text("Grand Total:", 8, y);
    doc.text(`Rs. ${order.total.toFixed(2)}`, 64, y);
    
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text("--------------------------------------------------", 40, y, { align: "center" });
    y += 5;
    
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for dining with us!", 40, y, { align: "center" });
    y += 4;
    doc.text("Visit again!", 40, y, { align: "center" });
    
    doc.save(`CafeRush-Bill-${order.number}.pdf`);
  };

  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("CafeRush — Sales Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Range: ${range}`, 14, 26);
    doc.text(
      `Total Orders: ${totalOrders}    Revenue: ₹${revenue.toFixed(2)}    AOV: ₹${avg.toFixed(2)}`,
      14,
      34,
    );
    const autoTable = (await import("jspdf-autotable")).default;
    autoTable(doc, {
      startY: 42,
      head: [["Order #", "Date", "Items", "Total"]],
      body: topOrders.map((o) => [
        o.number,
        new Date(o.createdAt).toLocaleString(),
        o.items.length,
        `₹${o.total.toFixed(2)}`,
      ]),
    });
    autoTable(doc, {
      head: [["Product", "Qty", "Revenue"]],
      body: productAgg.slice(0, 10).map((p) => [p.name, p.qty, `₹${p.revenue.toFixed(2)}`]),
    });
    autoTable(doc, {
      head: [["Category", "Revenue"]],
      body: categoryAgg.map((c) => [c.name, `₹${c.revenue.toFixed(2)}`]),
    });
    doc.save("caferush-report.pdf");
  };

  const exportXLS = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        filtered.map((o) => ({
          order: o.number,
          date: new Date(o.createdAt).toLocaleString(),
          items: o.items.length,
          total: o.total,
          employee: o.employee,
        })),
      ),
      "Orders",
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productAgg), "Top Products");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categoryAgg), "Top Categories");
    XLSX.writeFile(wb, "caferush-report.xlsx");
  };

  return (
    <Layout>
      <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground">
            Real-time metrics across orders, products & categories.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPDF}>
            <FileDown className="size-4 mr-1" /> PDF Report
          </Button>
          <Button variant="outline" onClick={exportXLS}>
            <FileSpreadsheet className="size-4 mr-1" /> Excel Report
          </Button>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-4 border-b pb-2 mb-6">
        {([
          { key: "overview", label: "Overview & Reports" },
          { key: "feedback", label: `Customer Feedback (${ratings.length})` },
          { key: "employees", label: "Employee Management" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveSubTab(t.key)}
            className={`pb-2 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeSubTab === t.key
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeSubTab === "overview" ? (
        <>
          {/* Live KPI bar */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-primary/5 p-5 flex items-center gap-4">
              <div className="size-12 rounded-full bg-primary/20 grid place-items-center text-2xl animate-pulse">📦</div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Live Orders</div>
                <div className="text-3xl font-bold text-primary">{activeLiveOrders}</div>
              </div>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-5 flex items-center gap-4">
              <div className="size-12 rounded-full bg-emerald-500/20 grid place-items-center text-2xl">₹</div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Live POS Revenue (paid)</div>
                <div className="text-3xl font-bold text-emerald-600">₹{liveRevenue.toFixed(0)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 grid md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div>
              <Label className="text-xs">Range</Label>
              <Select value={range} onValueChange={(v: RangeKey) => setRange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {range === "custom" && (
              <>
                <div>
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </div>
              </>
            )}
            <div>
              <Label className="text-xs">Employee</Label>
              <Select value={employee} onValueChange={setEmployee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Session</Label>
              <Select value={session} onValueChange={setSession}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Product</Label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {menuItems.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <Metric label="Total Orders" value={displayOrders.toString()} />
            <Metric label="Revenue" value={`₹${displayRevenue.toFixed(0)}`} />
            <Metric label="Average Order Value" value={`₹${displayAvg.toFixed(0)}`} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Sales Trend">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_COLORS[0]}
                    fill="url(#g1)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Top Selling Categories">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={categoryAgg} dataKey="revenue" nameKey="name" outerRadius={90} label>
                    {categoryAgg.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Revenue Trend">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke={CHART_COLORS[1]} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Top Products">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={productAgg.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill={CHART_COLORS[2]} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden mb-4">
            <div className="px-5 py-3 border-b font-semibold">Top Orders (highest value)</div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Order #</th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Employee</th>
                  <th className="text-left px-4 py-2">Items</th>
                  <th className="text-left px-4 py-2">Total</th>
                  <th className="text-right px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {topOrders.map((o) => (
                  <tr key={o.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 font-mono">#{o.number}</td>
                    <td className="px-4 py-2">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{o.employee || "—"}</td>
                    <td className="px-4 py-2">{o.items.length}</td>
                    <td className="px-4 py-2 font-semibold">₹{o.total.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedBillOrder(o)}
                        className="h-7 text-xs"
                      >
                        <FileDown className="size-3.5 mr-1" /> Bill
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

  const feedbackStats = useMemo(() => {
    if (ratings.length === 0)
      return { avgRating: 0, totalReviews: 0, positivePct: 0, breakdown: [] };
    const total = ratings.length;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const avg = sum / total;

    const counts = [0, 0, 0, 0, 0];
    ratings.forEach((r) => {
      const starVal = Math.max(1, Math.min(5, Math.round(r.rating)));
      counts[starVal - 1]++;
    });

    const positiveCount = counts[3] + counts[4];
    const positivePct = total ? (positiveCount / total) * 100 : 0;

    return {
      avgRating: avg,
      totalReviews: total,
      positivePct,
      breakdown: [
        { name: "5 Stars", count: counts[4] },
        { name: "4 Stars", count: counts[3] },
        { name: "3 Stars", count: counts[2] },
        { name: "2 Stars", count: counts[1] },
        { name: "1 Star", count: counts[0] },
      ],
    };
  }, [ratings]);

  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Bistro POS — Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Range: ${range}`, 14, 26);
    doc.text(
      `Total Orders: ${totalOrders}    Revenue: ₹${revenue.toFixed(2)}    AOV: ₹${avg.toFixed(2)}`,
      14,
      34,
    );
    const autoTable = (await import("jspdf-autotable")).default;
    autoTable(doc, {
      startY: 42,
      head: [["Order #", "Date", "Items", "Total"]],
      body: topOrders.map((o) => [
        o.number,
        new Date(o.createdAt).toLocaleString(),
        o.items.length,
        `₹${o.total.toFixed(2)}`,
      ]),
    });
    autoTable(doc, {
      head: [["Product", "Qty", "Revenue"]],
      body: productAgg.slice(0, 10).map((p) => [p.name, p.qty, `₹${p.revenue.toFixed(2)}`]),
    });
    autoTable(doc, {
      head: [["Category", "Revenue"]],
      body: categoryAgg.map((c) => [c.name, `₹${c.revenue.toFixed(2)}`]),
    });
    doc.save("bistro-report.pdf");
  };

  const exportXLS = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        filtered.map((o) => ({
          order: o.number,
          date: new Date(o.createdAt).toLocaleString(),
          items: o.items.length,
          total: o.total,
          status: o.status,
          employee: o.employee,
        })),
      ),
      "Orders",
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productAgg), "Top Products");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categoryAgg), "Top Categories");
    XLSX.writeFile(wb, "bistro-report.xlsx");
  };

  return (
    <Layout>
      <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground">
            Real-time metrics across orders, products & categories.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPDF}>
            <FileDown className="size-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" onClick={exportXLS}>
            <FileSpreadsheet className="size-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-4 border-b pb-2 mb-6">
        {([
          { key: "overview", label: "Overview & Reports" },
          { key: "feedback", label: `Customer Feedback (${ratings.length})` },
          { key: "employees", label: "Employee Management" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveSubTab(t.key)}
            className={`pb-2 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeSubTab === t.key
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeSubTab === "overview" ? (
        <>
          {/* Live KPI bar */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-primary/5 p-5 flex items-center gap-4">
              <div className="size-12 rounded-full bg-primary/20 grid place-items-center text-2xl">📦</div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Live Orders</div>
                <div className="text-3xl font-bold text-primary">{activeLiveOrders}</div>
              </div>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-5 flex items-center gap-4">
              <div className="size-12 rounded-full bg-emerald-500/20 grid place-items-center text-2xl">₹</div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Live POS Revenue (paid)</div>
                <div className="text-3xl font-bold text-emerald-600">₹{liveRevenue.toFixed(0)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 grid md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div>
              <Label className="text-xs">Range</Label>
              <Select value={range} onValueChange={(v: RangeKey) => setRange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {range === "custom" && (
              <>
                <div>
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </div>
              </>
            )}
            <div>
              <Label className="text-xs">Employee</Label>
              <Select value={employee} onValueChange={setEmployee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Session</Label>
              <Select value={session} onValueChange={setSession}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Product</Label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {menuItems.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <Metric label="Total Orders" value={displayOrders.toString()} />
            <Metric label="Revenue" value={`₹${displayRevenue.toFixed(0)}`} />
            <Metric label="Average Order Value" value={`₹${displayAvg.toFixed(0)}`} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Sales Trend">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_COLORS[0]}
                    fill="url(#g1)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Top Selling Categories">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={categoryAgg} dataKey="revenue" nameKey="name" outerRadius={90} label>
                    {categoryAgg.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Revenue Trend">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke={CHART_COLORS[1]} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Top Products">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={productAgg.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill={CHART_COLORS[2]} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden mb-4">
            <div className="px-5 py-3 border-b font-semibold">Top Orders (highest value)</div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Order #</th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Employee</th>
                  <th className="text-left px-4 py-2">Items</th>
                  <th className="text-right px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {topOrders.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="px-4 py-2 font-mono">#{o.number}</td>
                    <td className="px-4 py-2">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{o.employee || "—"}</td>
                    <td className="px-4 py-2">{o.items.length}</td>
                    <td className="px-4 py-2 text-right font-semibold">₹{o.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b font-semibold">Top Products</div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Product</th>
                    <th className="text-left px-4 py-2">Qty</th>
                    <th className="text-right px-4 py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {productAgg.slice(0, 8).map((p) => (
                    <tr key={p.name} className="border-t">
                      <td className="px-4 py-2">{p.name}</td>
                      <td className="px-4 py-2">{p.qty}</td>
                      <td className="px-4 py-2 text-right">₹{p.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b font-semibold">Top Categories</div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Category</th>
                    <th className="text-right px-4 py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryAgg.map((c) => (
                    <tr key={c.name} className="border-t">
                      <td className="px-4 py-2">{c.name}</td>
                      <td className="px-4 py-2 text-right">₹{c.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeSubTab === "feedback" ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-5 flex flex-col justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Average Rating
                </div>
                <div className="text-4xl font-bold mt-2 text-primary flex items-baseline gap-2">
                  {feedbackStats.avgRating.toFixed(1)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
                </div>
              </div>
              <div className="flex gap-0.5 mt-4">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= Math.round(feedbackStats.avgRating);
                  return (
                    <svg
                      key={star}
                      className={`size-5 ${filled ? "text-[#fbbf24] fill-[#fbbf24]" : "text-muted-foreground/35"}`}
                      fill={filled ? "currentColor" : "none"}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  );
                })}
              </div>
            </div>
            <Metric label="Total Reviews" value={feedbackStats.totalReviews.toString()} />
            <Metric label="Positive Sentiment" value={`${feedbackStats.positivePct.toFixed(0)}%`} />
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* Reviews List */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b font-semibold flex justify-between items-center">
                <span>Recent Reviews</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Showing {ratings.length} entries
                </span>
              </div>

              {ratings.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  No customer reviews have been submitted yet.
                </div>
              ) : (
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {ratings.map((r) => (
                    <div key={r.id} className="p-5 hover:bg-secondary/10 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold grid place-items-center shrink-0">
                          {r.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2 flex-wrap">
                            <div>
                              <h4 className="font-semibold text-sm text-foreground">
                                {r.customerName}
                              </h4>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Order #{r.orderNumber}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex gap-0.5 my-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`size-3.5 ${
                                  star <= r.rating
                                    ? "text-[#fbbf24] fill-[#fbbf24]"
                                    : "text-muted-foreground/35"
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          {r.comment ? (
                            <p className="text-xs text-muted-foreground leading-relaxed mt-2 bg-secondary/20 p-3 rounded-lg border border-border/50">
                              "{r.comment}"
                            </p>
                          ) : (
                            <p className="text-xs italic text-muted-foreground mt-1">
                              No comment written
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Breakdown Chart card */}
            <div className="rounded-xl border bg-card p-5 space-y-4 h-fit">
              <h3 className="font-semibold text-sm">Rating Distribution</h3>
              <div className="space-y-3">
                {feedbackStats.breakdown.map((b) => {
                  const pct = feedbackStats.totalReviews
                    ? (b.count / feedbackStats.totalReviews) * 100
                    : 0;
                  return (
                    <div key={b.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span>{b.name}</span>
                        <span className="text-muted-foreground">
                          {b.count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-secondary/50 rounded-full h-2">
                        <div
                          className="bg-[#fbbf24] h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmployeeManagement />
      )}

      {/* Graphic Design Bill / Receipt Modal */}
      {selectedBillOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-md p-6 relative my-8">
            <button
              onClick={() => setSelectedBillOrder(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer text-xl font-bold border-none bg-transparent"
            >
              &times;
            </button>
            
            <div className="bg-white text-black p-6 rounded-xl border border-gray-200 shadow-inner font-sans max-w-sm mx-auto flex flex-col items-center">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold tracking-tight text-gray-900">CafeRush</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5 font-semibold">Savor the Spices of India</p>
                <p className="text-[10px] text-gray-400 mt-1">123 Tech Park, Bangalore</p>
                <p className="text-[10px] text-gray-400 font-mono">GSTIN: 29AAAAA1111A1Z1</p>
              </div>
              
              <div className="w-full border-t border-dashed border-gray-300 my-2" />
              
              <div className="w-full text-xs text-gray-600 space-y-1 my-2">
                <div className="flex justify-between">
                  <span>Bill No: <strong>#{selectedBillOrder.number}</strong></span>
                  <span>Dine-in</span>
                </div>
                <div className="flex justify-between">
                  <span>Date: {new Date(selectedBillOrder.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Server: {selectedBillOrder.employee || "System"}</span>
                </div>
              </div>
              
              <div className="w-full border-t border-dashed border-gray-300 my-2" />
              
              <div className="w-full text-xs my-2">
                <table className="w-full text-gray-800">
                  <thead>
                    <tr className="border-b border-gray-200 pb-1 text-gray-500 text-left">
                      <th className="font-semibold pb-1">Item</th>
                      <th className="text-center font-semibold pb-1">Qty</th>
                      <th className="text-right font-semibold pb-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBillOrder.items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-100/50 py-1.5">
                        <td className="py-1 text-left">{item.name}</td>
                        <td className="py-1 text-center">{item.qty}</td>
                        <td className="py-1 text-right font-mono">₹{(item.qty * item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="w-full border-t border-dashed border-gray-300 my-2" />
              
              <div className="w-full text-xs text-gray-700 space-y-1.5 my-2">
                <div className="flex justify-between font-mono">
                  <span>Subtotal</span>
                  <span>₹{(selectedBillOrder.total / 1.05).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                  <span>CGST (2.5%)</span>
                  <span>₹{((selectedBillOrder.total / 1.05) * 0.025).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                  <span>SGST (2.5%)</span>
                  <span>₹{((selectedBillOrder.total / 1.05) * 0.025).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-gray-900 border-t pt-1.5 font-mono">
                  <span>Grand Total</span>
                  <span>₹{selectedBillOrder.total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="w-full border-t border-dashed border-gray-300 my-3" />
              
              {/* Stylized Barcode */}
              <div className="flex flex-col items-center gap-1 my-1">
                <div className="h-6 w-36 bg-repeating-linear-stripes border border-gray-300" style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px)'
                }} />
                <span className="text-[9px] text-gray-400 font-mono">#{selectedBillOrder.id}</span>
              </div>
              
              <div className="text-center text-[10px] text-gray-500 font-serif italic mt-3">
                <p>Thank you for dining with us!</p>
                <p className="mt-0.5">Please visit again</p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-center mt-6">
              <Button
                onClick={() => downloadSingleBillPDF(selectedBillOrder)}
                className="flex-1 cursor-pointer"
              >
                <FileDown className="size-4 mr-2" /> Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex-1 cursor-pointer"
              >
                Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

/* ─── Employee Management Panel ─────────────────────────────────────────────── */
function EmployeeManagement() {
  const { users, createEmployee, deleteEmployee, resetEmployeePassword } = usePosAuth();
  const employees = users.filter((u) => u.role === "server" || u.role === "cashier" || u.role === "manager");

  // Create form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reset password modal state
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await createEmployee(name, username, email, password);
    setCreating(false);
    if (res.ok) {
      toast.success(`Employee "${username}" created successfully`);
      setName(""); setUsername(""); setEmail(""); setPassword("");
    } else {
      toast.error(res.error || "Failed to create employee");
    }
  };

  const handleDelete = async (userId: string, uname: string) => {
    if (!confirm(`Delete employee "${uname}"? This cannot be undone.`)) return;
    const res = await deleteEmployee(userId);
    if (res.ok) toast.success(`Employee "${uname}" deleted`);
    else toast.error(res.error || "Failed to delete");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || !newPwd) return;
    const res = await resetEmployeePassword(resetTarget, newPwd);
    if (res.ok) {
      toast.success("Password reset successfully");
      setResetTarget(null);
      setNewPwd("");
    } else {
      toast.error(res.error || "Failed to reset password");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Create Employee Form */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <UserPlus className="size-5 text-primary" />
          <h2 className="font-semibold text-lg">Create New Employee</h2>
        </div>
        <form onSubmit={handleCreate} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <Label className="text-xs mb-1 block">Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="johndoe" required />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@cafe.com" required />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Password</Label>
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 chars"
                minLength={6}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={creating} className="md:col-span-2 lg:col-span-4 w-fit">
            <UserPlus className="size-4 mr-2" />
            {creating ? "Creating..." : "Create Employee"}
          </Button>
        </form>
      </div>

      {/* Employee List */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b font-semibold flex items-center justify-between">
          <span>Employees ({employees.length})</span>
          <span className="text-xs text-muted-foreground font-normal">
            Roles: server, cashier, manager
          </span>
        </div>
        {employees.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No employees yet. Create one above.
          </div>
        ) : (
          <div className="divide-y">
            {employees.map((emp) => (
              <div key={emp.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                <div className="size-10 rounded-full bg-primary/10 text-primary font-bold grid place-items-center shrink-0 uppercase">
                  {emp.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{emp.name}</div>
                  <div className="text-xs text-muted-foreground">
                    @{emp.username ?? emp.name} · {emp.email} · PIN: {emp.pin}
                  </div>
                </div>
                <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 capitalize font-medium">
                  {emp.role}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setResetTarget(emp.id); setNewPwd(""); }}
                  >
                    <KeyRound className="size-3.5 mr-1" /> Reset Password
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(emp.id, emp.username ?? emp.name)}
                  >
                    <Trash2 className="size-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-lg mb-1">Reset Password</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Set a new password for{" "}
              <strong>{employees.find((e) => e.id === resetTarget)?.name}</strong>.
            </p>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label className="text-xs mb-1 block">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPwd ? "text" : "password"}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Min 6 characters"
                    minLength={6}
                    required
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="flex-1 font-semibold">Save Password</Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setResetTarget(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-bold mt-2 text-primary">{value}</div>
    </div>
  );
}
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}
