-- 0006: hardening — server-set timestamps, no anonymous writes, rate limits, category counts.
-- Run once in the Supabase SQL Editor after 0001–0005. Safe to re-run.

-- 1. Timestamps always come from the server. Before this, a client could insert a
--    listing with created_at in the future and stay first in "Newest" forever.
create or replace function public.listings_before_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists listings_before_insert on public.listings;
create trigger listings_before_insert before insert on public.listings
  for each row execute function public.listings_before_insert();

create or replace function public.chats_before_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  new.last_message_at := now();
  return new;
end; $$;
drop trigger if exists chats_before_insert on public.chats;
create trigger chats_before_insert before insert on public.chats
  for each row execute function public.chats_before_insert();

create or replace function public.set_created_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  return new;
end; $$;
drop trigger if exists messages_before_insert on public.messages;
create trigger messages_before_insert before insert on public.messages
  for each row execute function public.set_created_at();
drop trigger if exists favorites_before_insert on public.favorites;
create trigger favorites_before_insert before insert on public.favorites
  for each row execute function public.set_created_at();

-- 2. Logged-out visitors can only read. RLS already blocked their writes; this
--    removes the privilege too, so a table that ever loses RLS is still safe.
revoke insert, update, delete, truncate on all tables in schema public from anon;
alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon;

-- 3. Rate limits (per user). The app shows a friendly message for each code.
--    security definer: the counts must see all of the user's rows.
create or replace function public.limit_listings() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.listings
      where seller_id = new.seller_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'RATE_LIMIT_LISTINGS';
  end if;
  return new;
end; $$;
drop trigger if exists listings_rate_limit on public.listings;
create trigger listings_rate_limit before insert on public.listings
  for each row execute function public.limit_listings();

create or replace function public.limit_messages() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'RATE_LIMIT_MESSAGES';
  end if;
  return new;
end; $$;
drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit before insert on public.messages
  for each row execute function public.limit_messages();

create or replace function public.limit_chats() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.chats
      where buyer_id = new.buyer_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'RATE_LIMIT_CHATS';
  end if;
  return new;
end; $$;
drop trigger if exists chats_rate_limit on public.chats;
create trigger chats_rate_limit before insert on public.chats
  for each row execute function public.limit_chats();

-- Trigger functions are not meant to be called directly.
revoke execute on function public.limit_listings(), public.limit_messages(), public.limit_chats() from public, anon, authenticated;

-- 4. Available listings per category, counted in the database (the landing page
--    used to download every row, which also hit the 1,000-row response cap).
create or replace function public.category_counts()
returns table (category public.listing_category, total bigint)
language sql stable set search_path = '' as $$
  select l.category, count(*) from public.listings l
  where l.status = 'available'
  group by l.category;
$$;
grant execute on function public.category_counts() to anon, authenticated;
