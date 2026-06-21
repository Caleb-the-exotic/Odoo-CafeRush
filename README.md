# OdooCafé — Full Café / Restaurant Operating System

OdooCafé is a single web application that runs an entire café: the customer
landing page, customer self-ordering, the staff Point-of-Sale (POS), the
kitchen display, table service, an admin dashboard, coupons, promotions and
live order tracking — all sharing **one menu, one team and one database**.

This README is written so that **someone with zero programming knowledge** can:

1. Run the app on their own computer.
2. Understand what every important file/keyword does.
3. Understand *where data is stored* and *how objects are created and called*.
4. Re-create a similar project manually from scratch.

Read it top to bottom — each section builds on the previous one.

---

## 1. What technology is this built with? (The "Tech Stack")

Think of an app as a building. Each tool below is one part of the building.

| Tool | Plain-English job | Where you see it |
|------|-------------------|------------------|
| **React 19** | The library that draws the screen (buttons, text, images) and updates it when something changes. | Every `.tsx` file |
| **TanStack Start** | The full-stack framework. It runs React on the server first (faster, better for Google) and gives us "server functions" — code that runs on the server, not the visitor's browser. | `src/router.tsx`, `src/routes/` |
| **TanStack Router** | Decides which page to show based on the web address (URL). | `src/routes/` files |
| **Vite 8** | The "build tool". It bundles all our code into something a browser can run, and gives the instant live-reload while developing. | `vite.config.ts` |
| **TypeScript** | JavaScript + a safety net. It catches typos and wrong data before the app even runs. | Every `.ts` / `.tsx` file |
| **Tailwind CSS v4** | The styling system. Instead of separate CSS files, you write styling as short class names like `bg-white p-4`. | `className="..."` everywhere, config in `src/styles.css` |
| **Zustand** | "State management" — a small in-browser memory box that holds the current cart, logged-in user, menu, etc., and lets any screen read/write it. | `src/store/` |
| **MongoDB + Mongoose** | The permanent database in the cloud (MongoDB Atlas). Mongoose is the helper that describes the *shape* of the data and talks to MongoDB. | `src/lib/db.ts`, `src/models/` |
| **shadcn/ui + Radix UI** | Pre-made, accessible building blocks (dialogs, dropdowns, tabs...). | `src/components/ui/` |
| **Lucide React** | The icon set (little SVG icons). | imported as `import { X } from "lucide-react"` |
| **bcrypt** | Scrambles (hashes) passwords so we never store them in plain text. | `src/routes/dbStoreFn.ts` |
| **jsPDF / xlsx** | Generate PDF receipts and Excel reports. | POS / admin screens |
| **qrcode** | Generates QR codes for table self-ordering. | tables / admin |
| **GSAP** | Advanced animation engine. | landing-page animations |
| **Bun** (recommended) or **npm** | The "package manager" — downloads all the tools above and runs the project. | terminal commands |

> In short: **React draws it, TanStack routes & runs it, Zustand remembers it
> in the browser, MongoDB stores it forever, Tailwind styles it.**

---

## 2. How to run the app (step-by-step, zero experience needed)

### 2.1 Install the prerequisites (one time)

1. **Install Node.js** (version 20 or newer) from <https://nodejs.org> — this also
   gives you `npm`.
2. *(Optional but faster)* **Install Bun** from <https://bun.sh>.

To confirm it worked, open a terminal (Command Prompt on Windows, Terminal on
Mac) and type:

```bash
node -v
```

You should see a version number like `v20.x.x`.

### 2.2 Get the code and install dependencies

Inside the project folder, run **one** of these:

```bash
# Using Bun (recommended)
bun install

# OR using npm
npm install
```

This reads `package.json` and downloads every tool listed there into a folder
called `node_modules`. (You never edit `node_modules` by hand.)

### 2.3 Start the app in development mode

```bash
bun run dev
# OR
npm run dev
```

The terminal will print a local address, usually:

```
http://localhost:8080
```

Open that in your browser. The site is now live and will refresh automatically
whenever you change a file. On Windows you can also double-click `run_app.bat`.

### 2.4 The available commands (from `package.json` -> `scripts`)

| Command | What it does |
|---------|--------------|
| `dev` | Run the app locally with live reload (for building). |
| `build` | Create the optimized production version. |
| `build:dev` | Production build using development settings. |
| `preview` | Preview the production build locally. |
| `lint` | Check the code for mistakes/style problems. |
| `format` | Auto-format all the code neatly. |

Run any of them with `bun run <name>` or `npm run <name>`.

### 2.5 The database connection

The app connects to a cloud MongoDB database. The connection text (called a
**connection string**) lives in `src/lib/db.ts`. In a real deployment you would
put this secret in an environment variable named `MONGODB_URI` instead of in the
code:

```bash
# example .env file
MONGODB_URI="mongodb+srv://USER:PASSWORD@your-cluster.mongodb.net/Odoo-Cafe"
```

The code reads it with `process.env.MONGODB_URI` and falls back to a default if
it is missing.

---

## 3. The big picture: how a request flows

```text
   Visitor's browser
        |  types a URL, e.g. /pos/menu
        v
   TanStack Router  -- matches the URL to a file in src/routes/
        |
        v
   React component renders the page (.tsx)
        |  reads/writes quick data from  -->  Zustand store (src/store)
        |  needs permanent data? calls   -->  a "server function"
        v
   Server function (src/routes/dbStoreFn.ts)   [runs ONLY on the server]
        |  uses Mongoose models (src/models)
        v
   MongoDB Atlas (the cloud database)  -- saves / returns the data
```

Two kinds of "memory" — don't mix them up:

- **Zustand store** = *temporary, in the browser*. Fast. Lost on a hard refresh
  unless "persisted". Used for the live cart, current screen, logged-in user.
- **MongoDB** = *permanent, in the cloud*. Survives forever. Used for orders,
  users, menu items, ratings.

---

## 4. Folder-by-folder map (what is saved where)

```text
src/
|-- routes/            <- every PAGE and every server function
|   |-- __root.tsx     <- the shell wrapping every page (<html>, <head>, providers)
|   |-- index.tsx      <- the public landing/home page ("/")
|   |-- login.tsx      <- sign in / sign up page ("/login")
|   |-- pos.tsx        <- layout for all staff POS pages ("/pos")
|   |-- pos.menu.tsx   <- customer ordering menu ("/pos/menu")
|   |-- pos.tracker.tsx<- live order tracking ("/pos/tracker")
|   |-- pos.tables.tsx <- table management ("/pos/tables")
|   |-- pos.display.tsx<- kitchen/customer display ("/pos/display")
|   |-- admin.tsx      <- layout for admin pages ("/admin")
|   |-- admin.*.tsx    <- admin dashboards (kds, coupons, promotions...)
|   `-- dbStoreFn.ts   <- * ALL server functions that talk to MongoDB
|
|-- models/            <- the SHAPE of each database table (Mongoose schemas)
|   |-- User.ts        <- staff & customer accounts
|   |-- MenuItem.ts    <- dishes/drinks for sale
|   |-- Order.ts       <- placed orders + their lines + status
|   `-- Rating.ts      <- customer ratings/reviews
|
|-- store/             <- Zustand stores (browser memory)
|   |-- index.ts       <- re-exports the hooks (usePosMenu, usePosAuth, ...)
|   |-- pos/index.ts   <- the main store: auth, cart, orders, tables, inventory
|   |-- admin/index.ts <- admin-specific state (coupons, promotions)
|   `-- tables/index.ts<- table-service state
|
|-- lib/               <- reusable helper code (no UI)
|   |-- db.ts          <- opens & caches the MongoDB connection
|   |-- dbSeed.ts      <- fills an empty database with starter data
|   |-- pos/types.ts   <- TypeScript type definitions (Order, MenuItem, User...)
|   |-- pos/seed.ts    <- default menu, users, tables used before DB loads
|   |-- pos/format.ts  <- helpers like uid() (unique id) & money formatting
|   |-- pos/syncTracker.ts <- tracks locally-changed records during sync
|   `-- pos/dishTimings.ts <- estimates cooking time per dish
|
|-- components/        <- reusable UI pieces
|   |-- ui/            <- shadcn building blocks (button, dialog, card...)
|   |-- DbHydrator.tsx <- loads DB data into the store when the app starts
|   |-- ScrollFrameSequence.tsx <- scroll-driven image animation on home page
|   |-- CustomerChatbot.tsx     <- floating help chatbot
|   `-- pos/, admin/, tables/   <- feature-specific UI
|
|-- styles.css         <- Tailwind import + theme colors/fonts (design tokens)
|-- router.tsx         <- creates the router + React Query client
|-- server.ts          <- the server entry point (handles every request)
`-- start.ts           <- server middleware (error handling)

public/                <- static files served as-is (images, /frames, logo)
```

---

## 5. The most important keywords, explained

These words appear all over the code. Learn them once and the whole project
becomes readable.

### `createFileRoute(...)` — defines a page
Every file in `src/routes/` exports a `Route` made with this. The file's name
becomes the URL. Dots mean slashes:

- `index.tsx` -> `/`
- `pos.menu.tsx` -> `/pos/menu`
- `admin.coupons.tsx` -> `/admin/coupons`

```tsx
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "OdooCafé" }] }), // page <title> & SEO tags
  component: Hero,                                  // the React function to draw
});
```

### `createServerFn(...)` — secure server-only code (* key concept)
Browsers can't be trusted with database passwords. So any code that touches
MongoDB lives in a **server function**. The browser *calls* it like a normal
function, but it actually runs on the server. All of these live in
`src/routes/dbStoreFn.ts`.

```ts
export const dbFetchOrdersFn = createServerFn({ method: "POST" })
  .inputValidator((d) => d)          // 1. check/clean the incoming data
  .handler(async () => {             // 2. the code that runs on the server
    await connectToDatabase();       //    open MongoDB
    const orders = await Order.find({}).lean();   // read every order
    return { ok: true, orders: JSON.parse(JSON.stringify(orders)) };
  });
```

The chain is always `createServerFn(...).inputValidator(...).handler(...)`.
`JSON.parse(JSON.stringify(...))` turns Mongoose objects into plain data that is
safe to send to the browser.

### `create(...)` from Zustand — the browser memory box
A store is created once and any component can read it as a hook.

```ts
export const usePosMenu = create<MenuState>()(
  persist(                                // persist = also save to localStorage
    (set, get) => ({
      items: seedMenu,                    // the data
      addItem: (item) =>                  // a function to change the data
        set((s) => ({ items: [...s.items, item] })),
    }),
    { name: "pos-menu" },                 // the localStorage key
  ),
);
```

Used inside a component like this:

```tsx
const menuItems = usePosMenu((s) => s.items);   // read
const addItem   = usePosMenu((s) => s.addItem); // get an action to call
```

`set(...)` updates the memory and instantly re-draws every screen using it.
`get()` reads the current value inside an action.

### `new mongoose.Schema(...)` / `mongoose.model(...)` — database shapes
A **model** describes what one record looks like and becomes the table.

```ts
// src/models/Order.ts (simplified)
const OrderSchema = new mongoose.Schema({
  id:     { type: String, required: true },
  total:  { type: Number, required: true },
  status: { type: String, default: "preparing" },
  lines:  [{ name: String, qty: Number, price: Number }],
}, { timestamps: true });

export const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
```

`mongoose.models.Order || mongoose.model(...)` means "reuse the model if it was
already created, otherwise create it" — this avoids errors on hot reload.
You then **call** it to talk to the database:

- `Order.find({})` -> read records
- `Order.create({...})` -> make a new record
- `Order.findOneAndUpdate({...}, {...})` -> change a record
- `Order.deleteOne({...})` -> remove a record

### `connectToDatabase()` — open the DB once, reuse it
Defined in `src/lib/db.ts`. It caches the connection on `globalThis` so the
server doesn't reconnect on every request. Every server function calls it first.

### `uid()` — make a unique id
From `src/lib/pos/format.ts`. Every order/item gets its own id string so we can
find and update exactly that one record.

### `className="..."` — Tailwind styling
Styling is written inline as utility classes:
`bg-white` (white background), `p-4` (padding), `flex justify-end` (lay out and
push to the right), `rounded-full` (pill shape). Colors like `bg-ink`,
`text-paper`, `bg-paper` are **custom theme tokens** defined in `src/styles.css`
— never hardcode hex colors when a token exists.

---

## 6. Walk-through: the life of one order (objects created & called)

This ties everything together. Follow a single order from tap to kitchen.

1. **Customer browses** `/pos/menu` (`src/routes/pos.menu.tsx`). The dish list
   comes from the Zustand store `usePosMenu`.
2. **Customer taps "Add to order".** A component calls a store action that adds
   the dish to the current cart (an array held in the Zustand store). The screen
   re-draws instantly because the store changed.
3. **Customer checks out.** The store builds an `Order` **object** — a plain JS
   object shaped like the type in `src/lib/pos/types.ts`, with a fresh `uid()`,
   the chosen lines, a total, and `status: "preparing"`.
4. **Save to the cloud.** The component calls a server function
   (in `dbStoreFn.ts`). That function runs on the server, calls
   `connectToDatabase()`, then `Order.create(order)` (or `findOneAndUpdate`) to
   write it into MongoDB using the model from `src/models/Order.ts`.
5. **Everyone stays in sync.** `DbHydrator.tsx` and the polling function
   `dbFetchOrdersFn` periodically read orders back from MongoDB and merge them
   into the store, so the staff **tracker** (`pos.tracker.tsx`) and **kitchen
   display** see the new order.
6. **Staff update status.** Marking an order "preparing -> ready -> served" calls
   another server function that updates the same MongoDB record. The customer's
   tracker reflects it on the next poll.
7. **Deletion.** When served, the order can be deleted (`Order.deleteOne`) —
   removed from MongoDB and filtered out of the store.

So: **types define the shape -> a plain object is created in the browser -> a
server function writes it through a Mongoose model -> MongoDB stores it ->
polling reads it back into the store -> React re-draws every screen.**

---

## 7. How to build your own version manually (the recipe)

1. **Create the project skeleton** with a TanStack Start + Vite + TypeScript
   template, then `bun install`.
2. **Add Tailwind v4**: `@import "tailwindcss";` at the top of `src/styles.css`
   and put your colors/fonts under `@theme`. Load web fonts with a `<link>` in
   `src/routes/__root.tsx` (never `@import` a font URL in CSS on this stack).
3. **Make the shell**: `src/routes/__root.tsx` (html/head/body + providers),
   `src/router.tsx`, and `src/routes/index.tsx` (home page).
4. **Add pages** by creating files in `src/routes/` (`about.tsx`,
   `pos.menu.tsx`, ...). Link between them with `<Link to="/pos/menu">`.
5. **Add browser state** with Zustand: `create(...)` a store in `src/store/`,
   wrap with `persist` if it should survive refresh, and read it in components
   with the generated hook.
6. **Add the database**: write Mongoose schemas in `src/models/`, a
   `connectToDatabase()` helper in `src/lib/db.ts`, and put the connection
   string in an environment variable `MONGODB_URI`.
7. **Add server functions** in a route file using
   `createServerFn().inputValidator().handler()` — these are the only place that
   imports your models and touches the DB. Call them from components.
8. **Seed starter data** so a fresh database isn't empty (see `dbSeed.ts`).
9. **Style** with Tailwind classes and reuse the shadcn components in
   `src/components/ui/`.
10. **Run** `bun run dev`, open `http://localhost:3000`, and iterate.

---

## 8. Quick troubleshooting

| Problem | Likely fix |
|---------|-----------|
| `command not found` | Node.js/Bun not installed — redo section 2.1. |
| Blank page / module not found | Run `bun install` again; make sure every imported file exists. |
| Database errors / no data | Check `MONGODB_URI` and your internet connection. |
| `window is not defined` on server | Browser-only code (e.g. `sessionStorage`) ran during server render — guard it with `typeof window !== "undefined"`. |
| Styles look broken | Confirm `src/styles.css` has `@import "tailwindcss";` and the dev server restarted. |

---

### Folder cheat-sheet (memorize these five)

- **`src/routes/`** -> pages + server functions
- **`src/models/`** -> database shapes (permanent storage)
- **`src/store/`** -> browser memory (temporary state)
- **`src/lib/`** -> helpers (DB connection, types, formatting)
- **`src/components/`** -> reusable UI

Happy building!
