import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CustomerChatbot } from "@/components/CustomerChatbot";
import ScrollFrameSequence from "@/components/ScrollFrameSequence";
import { usePosMenu } from "@/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OdooCafé — One stack for service, kitchen and floor" },
      {
        name: "description",
        content:
          "A unified operating system for hospitality. POS, kitchen display, table service, coupons and self-ordering — sharing one menu, one team, one ledger.",
      },
      { property: "og:title", content: "OdooCafé" },
      {
        property: "og:description",
        content: "POS, Admin and Tables — one stack for service, kitchen and floor.",
      },
    ],
  }),
  component: Hero,
});

const DISHES = [
  {
    name: "Masala Tea",
    img: "/masala tea.jpeg",
    desc: "Spiced Indian chai brewed with ginger, cardamom & milk",
    price: "₹99",
    oldPrice: "₹149",
  },
  {
    name: "Coffee",
    img: "/Coffee.jpeg",
    desc: "Rich, freshly brewed coffee served hot or cold",
    price: "₹149",
    oldPrice: "₹199",
  },
  {
    name: "Mango Lassi",
    img: "/mango lassi.jpeg",
    desc: "Creamy yoghurt blended with ripe Alphonso mangoes",
    price: "₹199",
    oldPrice: "₹249",
  },
  {
    name: "Blueberry Milkshake",
    img: "/blue milkshake.jpeg",
    desc: "Thick, chilled milkshake bursting with fresh blueberries",
    price: "₹249",
    oldPrice: "₹299",
  },
  {
    name: "Kunafa",
    img: "/Kunfa.jpeg",
    desc: "Crispy shredded pastry soaked in rose syrup with cheese",
    price: "₹349",
    oldPrice: "₹449",
  },
  {
    name: "Cheese Burger",
    img: "/cheese burger.jpeg",
    desc: "Juicy patty stacked with melted cheese, lettuce & sauce",
    price: "₹299",
    oldPrice: "₹399",
  },
  {
    name: "Pizza",
    img: "/Pizza.jpeg",
    desc: "Stone-baked pizza with fresh toppings and mozzarella",
    price: "₹499",
    oldPrice: "₹599",
  },
  {
    name: "Maggie",
    img: "/Maggie.jpeg",
    desc: "Classic instant noodles tossed with veggies & masala",
    price: "₹129",
    oldPrice: "₹179",
  },
  {
    name: "Pani Puri",
    img: "/Pani Puri.jpeg",
    desc: "Crispy puris filled with tangy tamarind and spiced water",
    price: "₹99",
    oldPrice: "₹149",
  },
  {
    name: "Pav Bhaji",
    img: "/pav bhaji.jpeg",
    desc: "Spiced vegetable mash served with buttery toasted buns",
    price: "₹199",
    oldPrice: "₹249",
  },
  {
    name: "Mojito",
    img: "/mojito.jpeg",
    desc: "Refreshing mint & lime cooler, virgin or classic",
    price: "₹179",
    oldPrice: "₹229",
  },
  {
    name: "Puff",
    img: "/Puff.jpeg",
    desc: "Flaky pastry puff filled with spiced potato or veg",
    price: "₹49",
    oldPrice: "₹79",
  },
  {
    name: "Cake",
    img: "/Cake.jpeg",
    desc: "Moist, freshly baked slices in seasonal flavours",
    price: "₹249",
    oldPrice: "₹299",
  },
  {
    name: "Ice Water",
    img: "/Ice water.jpeg",
    desc: "Chilled mineral water served with a squeeze of lemon",
    price: "₹29",
    oldPrice: "₹49",
  },
];

function TrendingDishesCarousel() {
  const [startIndex, setStartIndex] = useState(0);
  const navigate = useNavigate();
  const menuItems = usePosMenu((s) => s.items);

  useEffect(() => {
    const interval = setInterval(() => {
      setStartIndex((prev) => (prev + 3 >= DISHES.length ? 0 : prev + 3));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const visibleDishes = DISHES.slice(startIndex, startIndex + 3);

  const handleAddToOrder = (dishName: string) => {
    const customer = sessionStorage.getItem("cafe.customer");
    sessionStorage.setItem("pending_add_to_cart_item", dishName);

    if (customer) {
      navigate({ to: "/pos/menu" });
    } else {
      if (window.confirm("You need to sign in to place an order. Would you like to sign in now?")) {
        navigate({ to: "/login", search: { redirect: "/pos/menu" } });
      }
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 pb-6 w-full">
      {visibleDishes.map((dish, i) => {
        const rating = (startIndex + i) % 3 === 0 ? 4 : 5;
        const matchingMenuItem = menuItems.find(
          (it) => it.name.toLowerCase() === dish.name.toLowerCase()
        );
        const isAvailable = matchingMenuItem ? matchingMenuItem.available : true;

        return (
          <div
            key={startIndex + i}
            className="w-full rounded-xl bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-4 duration-500"
          >
            <div className="relative h-44 w-full overflow-hidden bg-gray-100">
              <img
                src={dish.img}
                alt={dish.name}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
              {!isAvailable && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xs font-bold uppercase tracking-wide bg-black/60 px-2 py-1 rounded">
                    Unavailable
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col p-4 grow">
              <div className="flex justify-between items-start gap-2 mb-1">
                <h3 className="font-semibold text-[#111827] text-sm leading-snug">
                  {dish.name}
                </h3>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-[#111827]">{dish.price}</div>
                </div>
              </div>
              <p className="text-xs text-[#6b7280] line-clamp-2 leading-relaxed mb-3">{dish.desc}</p>
              <div className="mt-auto flex items-center justify-between pt-2">
                {!isAvailable ? (
                  <button
                    disabled
                    className="rounded-full bg-muted text-muted-foreground text-xs font-semibold px-4 py-1.5 cursor-not-allowed border"
                  >
                    Unavailable
                  </button>
                ) : (
                  <button
                    onClick={() => handleAddToOrder(dish.name)}
                    className="rounded-full bg-[#5D1E31] text-white text-xs font-semibold px-4 py-1.5 inline-flex items-center gap-1 hover:bg-[#3d1323] transition"
                  >
                    Add to order
                  </button>
                )}
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`size-3.5 ${
                        star <= rating
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
  );
}

function Hero() {
  const nav = useNavigate();
  const [customer, setCustomer] = useState<{ name: string; email: string; avatar?: string } | null>(
    null,
  );
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("cafe.customer");
      if (stored) setCustomer(JSON.parse(stored));
    } catch {}
  }, []);

  const handleSignOut = () => {
    sessionStorage.removeItem("cafe.customer");
    sessionStorage.removeItem("cafe.customer.table");
    setCustomer(null);
    setShowUserMenu(false);
  };

  return (
    <>
      <main className="min-h-screen bg-paper font-sans text-ink antialiased">
        {/* Top bar */}
        <header className="border-b border-ink/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2.5 md:px-10">
            <div className="flex items-center gap-2">
              <img
                src="/Odoocafe.png"
                alt="OdooCafé"
                className="h-10 w-auto object-contain"
              />
            </div>
            <nav className="hidden items-center gap-8 text-sm text-ink/70 md:flex">
              {customer ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    className="flex items-center gap-2 rounded-full border border-ink/20 pl-3 pr-1 py-1 text-xs font-medium text-ink hover:bg-ink/5 transition"
                  >
                    <span className="max-w-[120px] truncate">{customer.name}</span>
                    {customer.avatar ? (
                      <img
                        src={customer.avatar}
                        alt={customer.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[#5D1E31] text-white grid place-items-center font-semibold text-sm">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-ink/10 shadow-lg z-50 py-1 text-sm">
                      <div className="px-4 py-2 text-xs text-ink/60 border-b">{customer.email}</div>
                      <button
                        onClick={() => nav({ to: "/pos/menu" })}
                        className="w-full text-left px-4 py-2 hover:bg-ink/5 transition"
                      >
                        Order Menu
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  search={{ redirect: "/" }}
                  className="inline-flex items-center rounded-full bg-[#5D1E31] px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-white transition hover:bg-[#3d1323]"
                >
                  Sign in
                </Link>
              )}
            </nav>
            {/* Mobile */}
            {!customer && (
              <Link
                to="/login"
                search={{ redirect: "/" }}
                className="inline-flex items-center rounded-full bg-[#5D1E31] px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white transition hover:bg-[#3d1323] md:hidden"
              >
                Sign in
              </Link>
            )}
          </div>
        </header>

        {/* Hero split-screen */}
        <section className="border-b border-ink/10 overflow-hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] items-center">
            {/* Left: type */}
            <div className="flex flex-col justify-between gap-12 px-6 py-16 md:px-10 md:py-24 lg:pr-14">
              <div>
                <h1 className="font-display text-[clamp(2.75rem,6vw,5.5rem)] leading-[0.95] tracking-tight text-ink-deep">
                  One stack for <em className="italic text-ink/80">service</em>,{" "}
                  <span className="whitespace-nowrap">the kitchen</span> &amp;{" "}
                  <em className="italic text-ink/80">the floor</em>.
                </h1>
              </div>

              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                <Link
                  to="/pos/menu"
                  className="group inline-flex items-center gap-3 rounded-full bg-ink px-6 py-3.5 text-sm font-medium uppercase tracking-[0.14em] text-paper transition hover:bg-ink-deep"
                >
                  Open the menu
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>
            </div>

            {/* Right: image */}
            <div className="flex items-center justify-end p-6 md:p-10 lg:pl-20 translate-y-44 translate-x-28">
              <img
                src="/2blackberry.png"
                alt="Blackberry POS"
                className="w-full max-w-none scale-150 origin-right object-contain animate-slide-in-right"
              />
            </div>
          </div>
        </section>

        {/* Principles */}
        <section id="principles" className="bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 md:grid-cols-2 md:gap-16 md:px-10 md:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div className="flex flex-col justify-center">
              <h2 className="font-display text-4xl leading-[1.05] text-ink-deep md:text-5xl max-w-sm">
                Built the way a service actually moves.
              </h2>
              {/* Compact scroll-driven frame sequence — slides in from the left */}
              <div className="mt-8">
                <ScrollFrameSequence />
              </div>
            </div>
            <dl className="space-y-10 flex flex-col justify-center">
              {[
                {
                  t: "One menu, everywhere.",
                  d: "Products, modifiers and prices live once. Edits land in the POS, the KDS and the self-order link at the same second.",
                },
                {
                  t: "Audit before analytics.",
                  d: "Every ticket, void and cash movement is signed and traceable. Reports come later — accountability comes first.",
                },
                {
                  t: "Keyboard-fast, paper-quiet.",
                  d: "Designed for one-handed phones on the floor and full keyboards behind the bar. No animations that slow a closing shift.",
                },
              ].map((p, i) => (
                <div
                  key={p.t}
                  className="grid grid-cols-[auto_1fr] items-baseline gap-6 border-t border-ink/10 pt-6"
                >
                  <dt className="font-display text-2xl text-ink/35">0{i + 1}</dt>
                  <div>
                    <p className="font-display text-2xl text-ink-deep">{p.t}</p>
                    <dd className="mt-3 text-sm leading-relaxed text-ink/70">{p.d}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Featured Dishes Section */}
        <section id="dishes" className="bg-[#f9fafb] overflow-hidden pt-12 pb-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <div className="mb-10 text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#111827] md:text-4xl">
                Featured Dishes
              </h2>
              <p className="mt-2 text-sm text-[#4b5563]">
                Our most loved pieces recently added to the collection.
              </p>
            </div>
            {/* 3-column cards grid */}
            <div className="overflow-hidden">
              <TrendingDishesCarousel />
            </div>
            {/* View All below the 2nd (centre) dish */}
            <div className="mt-8 flex justify-center">
              <Link
                to="/pos/menu"
                className="inline-flex items-center justify-center rounded-full bg-[#5D1E31] px-8 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-transform hover:scale-105 hover:bg-[#3d1323]"
              >
                View All
              </Link>
            </div>
          </div>
        </section>

      </main>
      <CustomerChatbot />
    </>
  );
}
