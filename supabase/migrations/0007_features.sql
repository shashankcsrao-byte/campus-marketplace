-- 0007: item condition, listing reports, unread message tracking.
-- Run once in the Supabase SQL Editor after 0006. Safe to re-run.

-- 1. Item condition. Optional at the database level so existing listings stay
--    valid; the form requires it for new and edited listings.
do $$ begin
  create type public.listing_condition as enum ('new', 'like_new', 'used', 'for_parts');
exception when duplicate_object then null; end $$;
alter table public.listings add column if not exists condition public.listing_condition;

-- 2. Reports. Anyone logged in can report someone else's listing once; only the
--    project owner reads them (Supabase dashboard → Table Editor → reports).
do $$ begin
  create type public.report_reason as enum ('scam', 'prohibited', 'wrong_info', 'offensive', 'already_sold', 'other');
exception when duplicate_object then null; end $$;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reason public.report_reason not null,
  details text check (char_length(details) <= 500),
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);
create index if not exists reports_created_idx on public.reports (created_at desc);
alter table public.reports enable row level security;

drop policy if exists "Report others' listings" on public.reports;
create policy "Report others' listings" on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (select 1 from public.listings l
                where l.id = listing_id and l.seller_id <> (select auth.uid()))
  );
-- Reporters can see their own reports (so the button can say "Reported").
drop policy if exists "Read own reports" on public.reports;
create policy "Read own reports" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

revoke all on public.reports from anon;
grant select, insert on public.reports to authenticated;

drop trigger if exists reports_before_insert on public.reports;
create trigger reports_before_insert before insert on public.reports
  for each row execute function public.set_created_at();

create or replace function public.limit_reports() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.reports
      where reporter_id = new.reporter_id and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'RATE_LIMIT_REPORTS';
  end if;
  return new;
end; $$;
drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit before insert on public.reports
  for each row execute function public.limit_reports();
revoke execute on function public.limit_reports() from public, anon, authenticated;

-- 3. Unread messages. Each side of a chat has a "last read" time; messages from
--    the other person after it are unread. Existing chats start fully read.
alter table public.chats add column if not exists buyer_last_read_at timestamptz not null default now();
alter table public.chats add column if not exists seller_last_read_at timestamptz not null default now();

-- New chats: the server sets every timestamp (replaces the 0006 version).
create or replace function public.chats_before_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  new.last_message_at := now();
  new.buyer_last_read_at := now();
  new.seller_last_read_at := now();
  return new;
end; $$;

-- Chats have no update policy, so "mark as read" goes through this function,
-- which only ever touches the caller's own column.
create or replace function public.mark_chat_read(p_chat_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  update public.chats set
    buyer_last_read_at  = case when buyer_id  = uid then now() else buyer_last_read_at  end,
    seller_last_read_at = case when seller_id = uid then now() else seller_last_read_at end
  where id = p_chat_id and uid in (buyer_id, seller_id);
end; $$;
revoke execute on function public.mark_chat_read(uuid) from public, anon;
grant execute on function public.mark_chat_read(uuid) to authenticated;

-- Unread count per chat for the current user (RLS still applies: invoker rights).
create or replace function public.my_unread_counts()
returns table (chat_id uuid, unread bigint)
language sql stable set search_path = '' as $$
  select c.id, count(m.id)
  from public.chats c
  join public.messages m
    on m.chat_id = c.id
   and m.sender_id <> (select auth.uid())
   and m.created_at > case when c.buyer_id = (select auth.uid())
                           then c.buyer_last_read_at else c.seller_last_read_at end
  where (select auth.uid()) in (c.buyer_id, c.seller_id)
  group by c.id;
$$;
revoke execute on function public.my_unread_counts() from public, anon;
grant execute on function public.my_unread_counts() to authenticated;
