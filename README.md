# Sarahs' Fragrance

A small two-page shop for home and office diffusers, room sprays and essence oils.
Built with plain HTML, CSS and JavaScript — no build step, no dependencies to install.

| Page | File | What it does |
| --- | --- | --- |
| Storefront | `index.html` | Catalogue, filters, quantity picker, order bag and the order-confirmation pop-up that sends the order to WhatsApp. |
| Admin | `admin.html` | Password-protected stock and listing management. |

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
| `supabaseUrl` / `supabaseAnonKey` | Leave empty for demo mode. See below for live mode. |
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

4. Sarah replies in the same chat to confirm stock, delivery and payment. No payment is taken on the site.

## Admin page

Open `admin.html` (linked as “Store admin” in the footer).

- **Demo mode:** password is `demoAdminPassword` (`spring2026` by default). Listings are saved in that browser only.
- **Live mode:** sign in with the email and password of the Supabase user you create below.

On the dashboard you can:

- search listings by name or category,
- edit stock inline with the `−` / `+` buttons or by typing a number (saves automatically),
- switch a listing **Live / hidden** without deleting it,
- add a new listing or edit/remove an existing one,
- see totals for listings, units in stock, low stock (5 or fewer) and sold out.

New listing images can be any public image URL. Uploaded files can be hosted in
Supabase Storage or any image host; the local starter images live in `assets/`.

## Connect Supabase (live stock for every visitor)

Demo mode is per-browser. To share one catalogue between all visitors and the admin:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, then **Run**.
   This creates the `products` table, row-level security and six starter products
   (only inserted when the table is empty, so it is safe to re-run).
3. Go to **Authentication → Users → Add user**, create the admin email and password,
   and enable “Auto Confirm User”.
4. Go to **Authentication → Sign In / Providers** and turn off **Allow new users to sign up** —
   only Sarah should have an account.
5. Go to **Project Settings → API** and copy:
   - **Project URL** into `supabaseUrl`,
   - **anon public** key into `supabaseAnonKey`.
6. Reload the site. Both pages switch to live mode automatically.

### Security notes

- The `anon` key is meant to be public in front-end code. It is restricted by the
  row-level security policies in `schema.sql`: everyone can read the shop, but only
  signed-in users can add, edit or delete listings.
- Never put the `service_role` key in `js/config.js` or anywhere in this project.
- Change `demoAdminPassword` before hosting, even if you plan to use Supabase.

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
├── supabase/schema.sql Table, RLS policies and starter data
└── assets/             Hero image and product photos
```

## Notes

- The palette uses three spring colours — cream, blossom pink and sage green — with
  tints and shades. The sun/moon button in the top-right corner switches light and dark
  mode and remembers the choice in the browser.
- The bag is kept in `localStorage`, so it survives a page refresh.
- Prices are formatted with `Intl.NumberFormat("en-GH")`.
- Site design and build by [Kwame Elorm](https://wa.me/233507007324).
