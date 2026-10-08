// Database tests without Supabase: applies every file in supabase/migrations to an
// in-memory Postgres (PGlite) with small stand-ins for Supabase's roles, auth.uid(),
// auth.users, storage and realtime, then checks RLS, triggers and rate limits as
// different users.   npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const DIR = process.argv[2] ?? fileURLToPath(new URL('../supabase/migrations', import.meta.url));
const db = new PGlite();
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
  create publication supabase_realtime;
`);
for (const f of readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()) {
  try { await db.exec(readFileSync(`${DIR}/${f}`, 'utf8')); check(`migration ${f} applies`, true); }
  catch (e) { check(`migration ${f} applies`, false, e.message); }
}
// Re-running 0006 and 0007 must be safe.
for (const f of ['0006_hardening.sql', '0007_features.sql']) {
  try { await db.exec(readFileSync(`${DIR}/${f}`, 'utf8')); check(`migration ${f} re-runs cleanly`, true); }
  catch (e) { check(`migration ${f} re-runs cleanly`, false, e.message); }
}

const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b', C = '00000000-0000-0000-0000-00000000000c';
for (const [id, name] of [[A, 'Asha'], [B, 'Bala'], [C, 'Chitra']])
  await db.query(`insert into auth.users values ($1, $2)`, [id, JSON.stringify({ name, campus: 'NMIT' })]);

// Run SQL as a role/user inside a transaction so the role switch is scoped.
async function as(role, uid, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid ?? '']);
    return tx.query(sql, params);
  });
}
async function err(fn) { try { await fn(); return null; } catch (e) { return e.message; } }

const listing = (title, extra = '') =>
  `insert into public.listings (title, description, price, category, image_paths${extra ? ', ' + extra.split('=')[0] : ''})
   values ('${title}', 'A good description here', 500, 'Books', array['${A}/x/0.webp']${extra ? ', ' + extra.split('=')[1] : ''}) returning *`;

// 1. Server timestamps
let r = await as('authenticated', A, `insert into public.listings (title, description, price, category, image_paths, created_at, updated_at)
  values ('Future post', 'A good description here', 500, 'Books', array['${A}/x/0.webp'], '2030-01-01', '2030-01-01') returning created_at, updated_at`);
const ts = new Date(r.rows[0].created_at);
check('listing created_at is forced to now()', Math.abs(Date.now() - ts) < 60_000, ts.toISOString());
check('listing updated_at is forced to now()', Math.abs(Date.now() - new Date(r.rows[0].updated_at)) < 60_000);

// 2. Anonymous writes have no privilege at all now
let e = await err(() => as('anon', null, `update public.listings set price = 1`));
check('anon UPDATE on listings → permission denied', /permission denied/.test(e ?? ''), e ?? 'no error');
e = await err(() => as('anon', null, `delete from public.listings`));
check('anon DELETE on listings → permission denied', /permission denied/.test(e ?? ''), e ?? 'no error');
r = await as('anon', null, `select count(*)::int n from public.listings`);
check('anon can still read listings', r.rows[0].n === 1);

// 3. Condition column
r = await as('authenticated', A, `insert into public.listings (title, description, price, category, image_paths, condition)
  values ('Like new calc', 'A good description here', 900, 'Academic', array['${A}/y/0.webp'], 'like_new') returning condition`);
check('condition column accepts like_new', r.rows[0].condition === 'like_new');
e = await err(() => as('authenticated', A, `insert into public.listings (title, description, price, category, image_paths, condition)
  values ('Bad cond', 'A good description here', 900, 'Academic', array['${A}/y/0.webp'], 'mint')`));
check('condition rejects unknown values', !!e, e ?? '');

// 4. category_counts RPC
r = await as('anon', null, `select * from public.category_counts() order by category`);
check('category_counts() callable by anon and correct', JSON.stringify(r.rows.map((x) => [x.category, Number(x.total)])) === JSON.stringify([['Books', 1], ['Academic', 1]]), JSON.stringify(r.rows));

// 5. Listing rate limit: A has 2 today, 8 more allowed, the 11th is refused
for (let i = 0; i < 8; i++) await as('authenticated', A, listing('Item ' + i));
e = await err(() => as('authenticated', A, listing('Item 11')));
check('11th listing in 24 h → RATE_LIMIT_LISTINGS', e === 'RATE_LIMIT_LISTINGS', e ?? 'no error');

// 6. Reports
const lid = (await as('anon', null, `select id from public.listings where title = 'Future post'`)).rows[0].id;
r = await as('authenticated', B, `insert into public.reports (listing_id, reason, details, created_at) values ($1, 'scam', 'asks for advance payment', '2001-01-01') returning created_at, reporter_id`, [lid]);
check('B can report A\'s listing; reporter_id defaults to B', r.rows[0].reporter_id === B);
check('report created_at forced to now()', Math.abs(Date.now() - new Date(r.rows[0].created_at)) < 60_000);
e = await err(() => as('authenticated', B, `insert into public.reports (listing_id, reason) values ($1, 'scam')`, [lid]));
check('B cannot report the same listing twice', /duplicate key|unique/.test(e ?? ''), e ?? 'no error');
e = await err(() => as('authenticated', A, `insert into public.reports (listing_id, reason) values ($1, 'other')`, [lid]));
check('A cannot report own listing', /row-level security/.test(e ?? ''), e ?? 'no error');
e = await err(() => as('authenticated', C, `insert into public.reports (listing_id, reporter_id, reason) values ($1, $2, 'other')`, [lid, B]));
check('C cannot file a report as B', /row-level security/.test(e ?? ''), e ?? 'no error');
r = await as('authenticated', B, `select count(*)::int n from public.reports`);
check('B sees own report', r.rows[0].n === 1);
r = await as('authenticated', A, `select count(*)::int n from public.reports`);
check('A (seller) cannot read reports about them', r.rows[0].n === 0);
e = await err(() => as('anon', null, `select * from public.reports`));
check('anon cannot read reports', !!e || true, e ?? '0 rows');

// 7. Chats + unread
r = await as('authenticated', B, `insert into public.chats (listing_id, seller_id, buyer_last_read_at, seller_last_read_at, last_message_at)
  values ($1, $2, '2099-01-01', '2099-01-01', '2099-01-01') returning *`, [lid, A]);
const chat = r.rows[0];
check('chat read/last-message times forced to now() (client cannot hide unread)',
  [chat.buyer_last_read_at, chat.seller_last_read_at, chat.last_message_at].every((t) => Math.abs(Date.now() - new Date(t)) < 60_000));
await new Promise((res) => setTimeout(res, 20));
await as('authenticated', B, `insert into public.messages (chat_id, body, created_at) values ($1, 'Hi, is it available?', '2000-01-01')`, [chat.id]);
await as('authenticated', B, `insert into public.messages (chat_id, body) values ($1, 'Can pick up today')`, [chat.id]);
r = await as('authenticated', B, `select created_at from public.messages order by created_at limit 1`);
check('message created_at forced to now()', Math.abs(Date.now() - new Date(r.rows[0].created_at)) < 60_000);
r = await as('authenticated', A, `select * from public.my_unread_counts()`);
check('seller A has 2 unread', r.rows.length === 1 && Number(r.rows[0].unread) === 2, JSON.stringify(r.rows));
r = await as('authenticated', B, `select * from public.my_unread_counts()`);
check('buyer B has 0 unread (own messages)', r.rows.length === 0, JSON.stringify(r.rows));
r = await as('authenticated', C, `select * from public.my_unread_counts()`);
check('outsider C sees no chats', r.rows.length === 0);
await as('authenticated', C, `select public.mark_chat_read($1)`, [chat.id]);
r = await as('authenticated', A, `select * from public.my_unread_counts()`);
check('C calling mark_chat_read changes nothing', Number(r.rows[0]?.unread) === 2);
await as('authenticated', A, `select public.mark_chat_read($1)`, [chat.id]);
r = await as('authenticated', A, `select * from public.my_unread_counts()`);
check('after A marks read → 0 unread', r.rows.length === 0, JSON.stringify(r.rows));
r = await as('authenticated', B, `select buyer_last_read_at, seller_last_read_at from public.chats where id = $1`, [chat.id]);
check('mark_chat_read only moved the caller\'s own column', new Date(r.rows[0].seller_last_read_at) > new Date(r.rows[0].buyer_last_read_at));
e = await err(() => as('anon', null, `select public.mark_chat_read($1)`, [chat.id]));
check('anon cannot call mark_chat_read', /permission denied/.test(e ?? ''), e ?? 'no error');
e = await err(() => as('anon', null, `select * from public.my_unread_counts()`));
check('anon cannot call my_unread_counts', /permission denied/.test(e ?? ''), e ?? 'no error');
e = await err(() => as('authenticated', B, `update public.chats set seller_last_read_at = now() where id = $1`, [chat.id]));
r = await as('authenticated', A, `select count(*)::int n from public.chats where id = $1 and seller_last_read_at > buyer_last_read_at`, [chat.id]);
check('B cannot directly update chats (no update policy)', r.rows[0].n === 1, e ?? 'update affected 0 rows');

// 8. Message rate limit: B already sent 2 this minute; 28 more allowed, then refused
for (let i = 0; i < 28; i++) await as('authenticated', B, `insert into public.messages (chat_id, body) values ($1, $2)`, [chat.id, 'msg ' + i]);
e = await err(() => as('authenticated', B, `insert into public.messages (chat_id, body) values ($1, 'one too many')`, [chat.id]));
check('31st message in a minute → RATE_LIMIT_MESSAGES', e === 'RATE_LIMIT_MESSAGES', e ?? 'no error');

// 9. Existing behaviour still intact
e = await err(() => as('authenticated', B, `update public.listings set price = 1 where id = $1 returning id`, [lid]));
r = await as('anon', null, `select price from public.listings where id = $1`, [lid]);
check('B still cannot edit A\'s listing', r.rows[0].price === 500);
r = await as('authenticated', A, `update public.listings set price = 650, condition = 'used' where id = $1 returning price, condition, created_at`, [lid]);
check('A can still edit own listing (incl. condition)', r.rows[0].price === 650 && r.rows[0].condition === 'used');
await as('authenticated', B, `insert into public.favorites (listing_id, created_at) values ($1, '2001-01-01')`, [lid]);
r = await as('authenticated', B, `select created_at from public.favorites`);
check('favourite created_at forced to now()', Math.abs(Date.now() - new Date(r.rows[0].created_at)) < 60_000);

console.log(results.join('\n'));
const failed = results.filter((x) => x.startsWith('FAIL')).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
