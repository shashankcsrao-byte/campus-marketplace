-- 0001: profiles + auto-create trigger
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 60),
  campus text check (char_length(campus) <= 80),
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are public" on public.profiles
  for select using (true);
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- No insert policy on purpose: only the trigger below creates profiles.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, campus)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name', 'Student'),
          new.raw_user_meta_data->>'campus');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Explicit grants (RLS still decides which rows)
grant select on public.profiles to anon, authenticated;
grant update (name, campus, avatar_url) on public.profiles to authenticated;
