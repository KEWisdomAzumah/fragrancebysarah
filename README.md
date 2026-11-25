# Sarahs' Fragrance

A small two-page shop for home and office diffusers, room sprays and essence oils.
Built with plain HTML, CSS and JavaScript — no build step, no dependencies to install.

| Page | File | What it does |
| --- | --- | --- |
| Storefront | `index.html` | Catalogue, filters, quantity picker, order bag and the order-confirmation pop-up that sends the order to WhatsApp. |
| Admin | `admin.html` | Password-protected order tracking, stock control and listing management. |

## Run it locally

From the project folder, start any static server:

```bash
python -m http.server 5173
```

Then open <http://127.0.0.1:5173/>. A local server is recommended over opening the
files directly, so the admin session and saved data behave consistently.

## Configure — `js/config.js`

This is the only file you need to edit.

| Setting | Description |
| --- | --- |
| `storeName` | Shop name shown in the header, footer and order message. |
| `currency` | Currency prefix for every price. Default `GH₵` (Ghana cedi). |
| `whatsappNumber` | **Where orders are sent.** International format, digits only, no `+` and no leading `0`. A Ghanaian `024 123 4567` becomes `233241234567`. |
| `whatsappGreeting` | First message for the “Ask on WhatsApp” buttons. |
| `supabaseUrl` / `supabaseAnonKey` | Leave empty for demo mode. See below for live mode. Use the project URL plus the public key — either the legacy `anon` key or the newer `sb_publishable_…` key. |
| `demoAdminPassword` | Admin password while Supabase is not connected. Default `spring2026` — change it before sharing the site. |

If `whatsappNumber` is blank, the checkout button shows a “not connected yet” notice
instead of opening WhatsApp, so nothing breaks while the number is being set up.

## How ordering works

1. The customer picks a product and quantity, then adds it to the bag.
2. **Confirm order** opens a pop-up asking for name, phone number, delivery area and an optional note.
3. **Send order on WhatsApp** opens WhatsApp with a ready-made message containing:

   - an order reference (e.g. `SF-7K3MPQ`),
   - every item with quantity and line total,
   - the subtotal (`Delivery: to be agreed in chat`),
   - the customer's name, phone, area and note.

4. At the same time the order is saved to the **Orders** panel on the admin page with the
   status **New**, so it doesn't rely on scrolling back through WhatsApp.
5. Sarah replies in the same chat to confirm stock, delivery and payment. No payment is taken on the site.

## Orders and statuses

Every checkout creates an order record (reference, items, total, customer contact, note).
On the admin page, each order card has a status control:

- **New** — just arrived, payment not confirmed yet.
- **Paid** — payment has been confirmed in the WhatsApp chat.
- **Processed** — packed, collected or delivered.

Changing the status saves immediately. The filter chips above the cards (All / New / Paid /
Processed) show how many orders sit in each state, so unpaid or unfulfilled orders are easy to spot.
Marking an order **Processed** is what declares it paid and fully handled; you can move it back to
**Paid** or **New** if it was a mistake.

In demo mode orders live in this browser only. With Supabase connected they are stored in the
`orders` table, visible only to the signed-in admin. The WhatsApp message remains the source of
truth for the order; the dashboard record is what you use to track payment and fulfilment.

## Admin page

Open `admin.html` (linked as “Store admin” in the footer).

- **Demo mode:** password is `demoAdminPassword` (`spring2026` by default). Orders and listings are saved in that browser only.
- **Live mode:** sign in with the Supabase user whose email is listed in `public.admins` (step 4 below). Any other account is sent back to the sign-in form with a plain message, and the attempt is logged.

On the dashboard you can:

- review incoming orders and set each to **New**, **Paid** or **Processed**,
- filter orders by status and see counts for each stage,
- search listings by name or category,
- edit stock inline with the `−` / `+` buttons or by typing a number (saves automatically),
- switch a listing **Live / hidden** without deleting it,
- add a new listing or edit/remove an existing one,
- see totals for listings, units in stock, low stock (5 or fewer) and sold out.

New listing images can be any public image URL. Uploaded files can be hosted in
Supabase Storage or any image host; the local starter images live in `assets/`.

## Connect Supabase (live shop for every visitor)

Demo mode is per-browser. To share one catalogue and one order list between all visitors
and the admin:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, then **Run**.
   This creates the `products`, `orders`, `admins` and `error_logs` tables, row-level security and
   six starter products (starter products are only inserted when the table is empty, so it is safe
   to re-run). If you ran an earlier version of this file, run it again — it adds the newer tables
   without touching existing products.
3. Go to **Authentication → Users → Add user**, create the admin email and password,
   and enable “Auto Confirm User”.
4. In **SQL Editor → New query**, add that same email as the shop admin, then **Run**:

   ```sql
   insert into public.admins (email) values ('you@example.com');
   ```

   Replace the address with the one from step 3. Only emails in this table may open the
   dashboard, read orders or change the shop. Any other account is refused by the database,
   even if it can sign in.
5. Go to **Authentication → Sign In / Providers** and turn off **Allow new users to sign up** —
   only Sarah should have an account.
6. Go to **Project Settings → API** (or **API Keys**) and copy:
   - **Project URL** into `supabaseUrl`,
   - the **public** key (`anon` or `sb_publishable_…`) into `supabaseAnonKey`.
7. Reload the site. Both pages switch to live mode automatically.

### Security notes

- The public key (`anon` / `sb_publishable_…`) is meant to be public in front-end code. It is
  restricted by the row-level security policies in `schema.sql`: everyone can read the shop, but
  only the email listed in `public.admins` can add, edit or delete listings.
- Customers may only create a **new** order; order details (names, phone numbers, notes)
  can only be read and updated by the admin email. No order data is exposed to other visitors.
- If someone signs in with another account, the dashboard sends them back to the sign-in form
  with a plain “This account isn't set up as the shop admin” message. Every refused attempt is
  recorded in the error log with the signed-in email and marked **Access**.
- Never put the `service_role` key in `js/config.js` or anywhere in this project.
- Demo mode is local to one browser. Its password lives in `js/config.js`, so treat it as a
  convenience lock, not a security boundary — live mode with the `admins` table is the real one.
- If the Supabase library can't load over HTTPS (CDN blocked, certificate problem), the site
  reports a connection problem and logs it instead of quietly switching to demo mode.
- Change `demoAdminPassword` before hosting, even if you plan to use Supabase.

## Errors, the system log and refused access

Shoppers never see technical wording. Any handled problem becomes one plain sentence plus a
short reference, for example:

> The shop can't connect right now. Check your internet and try again.
> Reference **ERR-7K3M** — quote it if you message Sarah.

The same problem in the admin dashboard adds a collapsible **Technical details** block with the
raw server message, HTTP status, reference and time. Customers never get that block.

Every handled problem is also written to the `error_logs` table (or to this browser when Supabase
isn't connected, or if writing the log itself fails):

- **Reference** — the code shown on screen, so an event can be matched to a message,
- **Where** — shop catalogue, checkout save, admin orders, stock, listing form, sign in, access check…
- **Message** — the raw server text,
- **Details** — HTTP status, Postgres error code, page, demo/live mode and the signed-in email.

The **System log** panel at the bottom of the dashboard lists the latest 50 entries, newest first.
It is append-only (no update or delete policy). To keep the table small, clear old rows from the
SQL Editor if you ever need to.

Statuses are translated to plain messages: `400`/`422` → “Some of the details weren't accepted”,
`401` → “Please sign in again”, `403` → “This account isn't set up as the shop admin”, `404` →
“That item isn't available any more”, `409` → “That order is already recorded”, `429` → “Too many
attempts, wait a moment”, `5xx` → “The shop hit a problem, try again”, plus offline and TLS
certificate failures → “The secure connection failed”. Attempts to force access without the admin
account are refused by the database and appear in the log with an **Access** tag.

## Deploy

The site is fully static. Upload the whole folder to Netlify, Vercel, Cloudflare Pages,
GitHub Pages or any web host — no build command and no environment variables are needed.
Keep the folder structure (`css/`, `js/`, `assets/`) intact.

## Project structure

```
SarahsFragrance/
├── index.html          Storefront
├── admin.html          Admin dashboard
├── css/styles.css      Design system, light + dark themes, responsive layout
├── js/config.js        Shop settings (edit this)
├── js/store.js         Data layer: Supabase live mode or localStorage demo mode
├── js/ui.js            Shared helpers: icons, money format, dialogs, theme toggle
├── js/shop.js          Catalogue, bag and WhatsApp checkout
├── js/admin.js         Login, stats, stock editing and listing CRUD
├── supabase/schema.sql Tables, RLS policies and starter data
└── assets/             Hero image and product photos
```

## Notes

- The palette uses three spring colours — cream, blossom pink and sage green — with
  tints and shades. The sun/moon button in the top-right corner switches light and dark
  mode and remembers the choice in the browser.
- The bag is kept in `localStorage`, so it survives a page refresh.
- Prices are formatted with `Intl.NumberFormat("en-GH")`.
- Site design and build by [Kwame Elorm](https://wa.me/233507007324).
