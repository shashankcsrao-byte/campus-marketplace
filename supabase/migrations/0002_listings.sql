-- 0002: listings with constraints, indexes, RLS and realtime
create type public.listing_category as enum ('Electronics','Books','Furniture','Vehicles',
  'Clothing','Accessories','Sports','Hostel Essentials','Academic','Other');
create type public.listing_status as enum ('available','sold');

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 100),
  description text not null check (char_length(trim(description)) between 10 and 2000),
  price integer not null check (price > 0 and price <= 10000000),
  category public.listing_category not null,
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 5),
  status public.listing_status not null default 'available',
  location_name text check (char_length(location_name) <= 120),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_status_created_idx on public.listings (status, created_at desc);
create index listings_category_idx on public.listings (category);
create index listings_price_idx on public.listings (price);
create index listings_seller_idx on public.listings (seller_id);

-- Lock fields that must never change, and maintain updated_at
create function public.protect_listing_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.seller_id  := old.seller_id;
  new.created_at := old.created_at;
  return new;
end; $$;
create trigger listings_before_update before update on public.listings
  for each row execute function public.protect_listing_fields();

alter table public.listings enable row level security;
create policy "Listings are public" on public.listings
  for select using (true);
create policy "Create own listings" on public.listings
  for insert to authenticated with check (seller_id = (select auth.uid()));
create policy "Update own listings" on public.listings
  for update to authenticated
  using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy "Delete own listings" on public.listings
  for delete to authenticated using (seller_id = (select auth.uid()));

grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;

alter publication supabase_realtime add table public.listings;
