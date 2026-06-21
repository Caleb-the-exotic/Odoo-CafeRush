import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/pos/AppShell";
import { usePosMenu } from "@/store";
import { currency } from "@/lib/pos/format";
import { usePersisted, storeKeys, type CustomerRating } from "@/store/admin";
import { useState, useRef } from "react";
import { PlusCircle, X, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos/menu-admin")({
  head: () => ({ meta: [{ title: "Menu — OdooCafé" }] }),
  component: MenuAdmin,
});

const CATEGORIES = ["Drinks", "Mains", "Snacks", "Desserts", "Others"];

function MenuAdmin() {
  const { items, toggleAvailable, addItem, removeItem } = usePosMenu();
  const cats = Array.from(new Set(items.map((i) => i.category)));
  const [ratings] = usePersisted<CustomerRating[]>(storeKeys.ratings, []);
  const [showModal, setShowModal] = useState(false);

  // Form state for new dish
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Mains",
    image: "",
  });
  const [imagePreview, setImagePreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setForm((f) => ({ ...f, image: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrl = (url: string) => {
    setForm((f) => ({ ...f, image: url }));
    setImagePreview(url);
  };

  const resetForm = () => {
    setForm({ name: "", description: "", price: "", category: "Mains", image: "" });
    setImagePreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(form.price);
    if (!form.name.trim()) return toast.error("Name is required");
    if (isNaN(priceNum) || priceNum <= 0) return toast.error("Enter a valid price");

    setSaving(true);
    addItem({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: priceNum,
      category: form.category,
      image: form.image || undefined,
      available: true,
    });
    setSaving(false);
    toast.success(`"${form.name.trim()}" added to menu`);
    resetForm();
    setShowModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the menu? This cannot be undone.`)) return;
    removeItem(id);
    toast.success(`"${name}" removed`);
  };

  return (
    <AppShell>
      <PageHeader title="Menu Management" subtitle="Add, toggle or remove menu items." />

      {/* Add Dish Button */}
      <div className="px-6 pt-2 pb-0 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-full bg-[#5D1E31] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#3d1323] shadow-sm"
        >
          <PlusCircle className="size-4" />
          Add New Dish
        </button>
      </div>

      {/* Category sections */}
      <div className="p-6 space-y-10">
        {cats.map((c) => (
          <section key={c}>
            <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight border-b pb-2 mb-1">
              {c}
            </h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items
                .filter((i) => i.category === c)
                .map((i) => {
                  const itemRatings = ratings.filter((r) => (r as any).itemId === i.id);
                  const avgRating =
                    itemRatings.length > 0
                      ? itemRatings.reduce((s, r) => s + r.rating, 0) / itemRatings.length
                      : 0;
                  const displayRating =
                    avgRating > 0 ? avgRating : 4 + (i.id.charCodeAt(0) % 10) / 10;

                  return (
                    <div
                      key={i.id}
                      className="w-full rounded-xl bg-card shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col"
                    >
                      {/* Image */}
                      <div className="relative h-44 w-full overflow-hidden bg-muted">
                        {i.image ? (
                          <img
                            src={i.image}
                            alt={i.name}
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-4xl bg-muted/50">
                            🍽️
                          </div>
                        )}
                        {!i.available && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-xs font-bold uppercase tracking-wide bg-black/60 px-2 py-1 rounded">
                              Unavailable
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex flex-col p-4 grow">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h3 className="font-semibold text-foreground text-sm leading-snug">
                            {i.name}
                          </h3>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-foreground">
                              {currency(i.price)}
                            </div>
                          </div>
                        </div>

                        {i.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                            {i.description}
                          </p>
                        )}

                        <div className="mt-auto flex items-center justify-between pt-2 gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleAvailable(i.id)}
                              className={`rounded-full text-xs font-semibold px-4 py-1.5 transition ${
                                i.available
                                  ? "bg-success/15 text-success hover:bg-success/25 border border-success/30"
                                  : "bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30"
                              }`}
                            >
                              {i.available ? "Available" : "Unavailable"}
                            </button>
                            <button
                              onClick={() => handleDelete(i.id, i.name)}
                              className="rounded-full p-1.5 text-destructive hover:bg-destructive/10 transition"
                              title="Remove dish"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>

                          {/* Star Rating */}
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`size-3.5 ${
                                  star <= Math.round(displayRating)
                                    ? "text-[#fbbf24] fill-[#fbbf24]"
                                    : "text-[#d1d5db] fill-[#d1d5db]"
                                }`}
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}
      </div>

      {/* ─── Add New Dish Modal ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-lg">Add New Dish</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fill in the details below — it will appear on the menu immediately.
                </p>
              </div>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="rounded-full p-1.5 hover:bg-muted transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              {/* Image section */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">
                  Dish Image
                </label>
                {/* Preview */}
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative h-40 w-full rounded-xl overflow-hidden bg-muted/50 border-2 border-dashed border-border hover:border-primary/50 transition cursor-pointer flex items-center justify-center group"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-foreground transition">
                      <Upload className="size-8" />
                      <span className="text-xs font-medium">Click to upload image</span>
                    </div>
                  )}
                  {imagePreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">Change Image</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFile}
                />
                {/* OR paste URL */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or paste URL</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={form.image.startsWith("data:") ? "" : form.image}
                  onChange={(e) => handleImageUrl(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                  Dish Name <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Veg Biryani"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Short description shown to customers…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Price & Category row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                    Price (₹) <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                    Category <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#5D1E31] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d1323] disabled:opacity-60"
                >
                  <PlusCircle className="size-4" />
                  {saving ? "Adding…" : "Add Dish"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
