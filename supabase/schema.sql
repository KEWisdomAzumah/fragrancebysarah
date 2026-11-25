-- Sarahs' Fragrance — Supabase schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Diffusers',
  description text not null default '',
  price numeric(10, 2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists products_created_at_idx on public.products (created_at);

-- Customers can read the shop; only signed-in admins can change it.
alter table public.products enable row level security;

drop policy if exists "Shop is public" on public.products;
create policy "Shop is public"
  on public.products for select
  using (true);

drop policy if exists "Admin adds listings" on public.products;
create policy "Admin adds listings"
  on public.products for insert
  to authenticated
  with check (true);

drop policy if exists "Admin edits listings" on public.products;
create policy "Admin edits listings"
  on public.products for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admin removes listings" on public.products;
create policy "Admin removes listings"
  on public.products for delete
  to authenticated
  using (true);

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

-- Starter catalogue. Only fills an empty table, so it is safe to re-run.
insert into public.products (name, category, description, price, stock, image_url)
select seed.name, seed.category, seed.description, seed.price, seed.stock, seed.image_url
from (values
  ('Blossom Reed Diffuser', 'Diffusers',
   'Peony and pink pepper on rattan reeds — up to eight weeks of scent in any room.',
   120.00, 14, 'assets/reed-diffuser.png'),
  ('Sage & Lily Ultrasonic Diffuser', 'Diffusers',
   'A quiet ceramic mist diffuser for bedrooms and offices. Add water and a few drops of essence.',
   260.00, 6, 'assets/ultrasonic-diffuser.png'),
  ('Linen & Petal Room Spray', 'Sprays',
   'A fine mist for bedding, curtains and sofas. Fresh petals over soft linen. 250 ml.',
   85.00, 9, 'assets/room-spray.png'),
  ('Citrus Bloom Essence Oil', 'Essence oils',
   'Bright citrus and orange blossom concentrate for diffusers and burners. 15 ml.',
   70.00, 24, 'assets/essence-oil.png'),
  ('Rosewood Car Diffuser', 'Diffusers',
   'A small hanging diffuser with a wooden cap — keeps the car gently scented for weeks.',
   95.00, 11, 'assets/car-diffuser.png'),
  ('Spring Bloom Gift Set', 'Gift sets',
   'Reed diffuser, essence oil and note card in a ribboned box. Ready to give.',
   320.00, 4, 'assets/gift-set.png')
) as seed(name, category, description, price, stock, image_url)
where not exists (select 1 from public.products);

-- ---------------------------------------------------------------------------
-- Orders. Checkout writes one row; the admin marks it paid, then processed.
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_area text not null default '',
  note text not null default '',
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  status text not null default 'new' check (status in ('new', 'paid', 'processed')),
  created_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

-- Anyone can leave an order, but only as a brand-new one.
drop policy if exists "Customers place orders" on public.orders;
create policy "Customers place orders"
  on public.orders for insert
  to anon, authenticated
  with check (status = 'new');

-- Order details include customer contact information, so only the admin reads them.
drop policy if exists "Admin reads orders" on public.orders;
create policy "Admin reads orders"
  on public.orders for select
  to authenticated
  using (true);

drop policy if exists "Admin updates orders" on public.orders;
create policy "Admin updates orders"
  on public.orders for update
  to authenticated
  using (true)
  with check (true);

grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;
