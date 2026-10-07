-- 0005: buyer-seller chat
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);
create index chats_buyer_idx on public.chats (buyer_id);
create index chats_seller_idx on public.chats (seller_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_chat_created_idx on public.messages (chat_id, created_at);
create index messages_sender_idx on public.messages (sender_id);

alter table public.chats enable row level security;
alter table public.messages enable row level security;

create policy "Participants read chats" on public.chats for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));
create policy "Buyer starts chat with real seller" on public.chats for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and seller_id = (select l.seller_id from public.listings l where l.id = listing_id)
  );

create policy "Participants read messages" on public.messages for select to authenticated
  using (exists (select 1 from public.chats c where c.id = chat_id
                 and (select auth.uid()) in (c.buyer_id, c.seller_id)));
create policy "Participants send as themselves" on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (select 1 from public.chats c where c.id = chat_id
                and (select auth.uid()) in (c.buyer_id, c.seller_id))
  );

create function public.bump_chat_last_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.chats set last_message_at = new.created_at where id = new.chat_id;
  return new;
end; $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.bump_chat_last_message();

grant select, insert on public.chats to authenticated;
grant select, insert on public.messages to authenticated;

alter publication supabase_realtime add table public.messages, public.chats;
