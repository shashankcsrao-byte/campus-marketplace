-- 0004: favourites
create table public.favorites (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index favorites_listing_idx on public.favorites (listing_id);

alter table public.favorites enable row level security;
create policy "Read own favorites" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Add own favorites" on public.favorites
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Remove own favorites" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.favorites to authenticated;
