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

-- ---------------------------------------------------------------------------
-- Who is allowed in as the shop admin. After creating the auth user in
-- Authentication → Users, run (replace with that email):
--   insert into public.admins (email) values ('you@example.com');
-- Every other account stays a shopper, even if it can sign in.
-- ---------------------------------------------------------------------------

create table if not exists public.admins (
  email text primary key check (position('@' in email) > 1)
);

alter table public.admins enable row level security;

drop policy if exists "Admins read the admin list" on public.admins;
create policy "Admins read the admin list"
  on public.admins for select
  to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'wisdomazumah1784@gmail.com', 'Quami@2020')));

-- True only for the email in public.admins. SECURITY DEFINER lets the
-- policies read that list even though row-level security is switched on.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'wisdomazumah1784@gmail.com', 'Quami@2020'))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
grant select on public.admins to authenticated;

drop policy if exists "Shop is public" on public.products;
create policy "Shop is public"
  on public.products for select
  using (true);

drop policy if exists "Admin adds listings" on public.products;
create policy "Admin adds listings"
  on public.products for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admin edits listings" on public.products;
create policy "Admin edits listings"
  on public.products for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin removes listings" on public.products;
create policy "Admin removes listings"
  on public.products for delete
  to authenticated
  using (public.is_admin());

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
  using (public.is_admin());

drop policy if exists "Admin updates orders" on public.orders;
create policy "Admin updates orders"
  on public.orders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;

-- ---------------------------------------------------------------------------
-- Error log. Every handled problem lands here with the short reference code
-- the shop shows the customer; only the signed-in admin can read it.
-- ---------------------------------------------------------------------------

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  area text not null default 'general',
  message text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists error_logs_created_at_idx on public.error_logs (created_at desc);

alter table public.error_logs enable row level security;

-- Any visitor can record a problem (checkout failures happen before sign-in).
drop policy if exists "Anyone logs an error" on public.error_logs;
create policy "Anyone logs an error"
  on public.error_logs for insert
  to anon, authenticated
  with check (true);

-- The log holds technical detail, so only the admin reads it. No update or
-- delete policy exists: entries are append-only.
drop policy if exists "Admin reads the log" on public.error_logs;
create policy "Admin reads the log"
  on public.error_logs for select
  to authenticated
  using (public.is_admin());

grant insert on public.error_logs to anon, authenticated;
grant select on public.error_logs to authenticated;
