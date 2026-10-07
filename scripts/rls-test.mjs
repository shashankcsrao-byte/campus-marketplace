// Two/three-account authorization test. Proves the DATABASE blocks other users,
// not just the UI.
//
//   node --env-file=.env scripts/rls-test.mjs
//
// Needs in .env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
//   TEST_A_EMAIL/PASSWORD (must own at least one listing),
//   TEST_B_EMAIL/PASSWORD, TEST_C_EMAIL/PASSWORD (C optional: chat checks are skipped without it).
import { createClient } from '@supabase/supabase-js';

const env = process.env;
for (const k of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'TEST_A_EMAIL', 'TEST_A_PASSWORD', 'TEST_B_EMAIL', 'TEST_B_PASSWORD']) {
  if (!env[k]) {
    console.error(`Missing ${k} in .env`);
    process.exit(1);
  }
}

const mk = () =>
  createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });

async function login(client, email, password, label) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(`Could not sign in as ${label}: ${error.message}`);
    process.exit(1);
  }
  return data.user;
}

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  ok ? passed++ : failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  (${detail})` : ''}`);
};
const section = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 50 - t.length))}`);

const anon = mk();
const A = mk();
const B = mk();
const ua = await login(A, env.TEST_A_EMAIL, env.TEST_A_PASSWORD, 'A');
const ub = await login(B, env.TEST_B_EMAIL, env.TEST_B_PASSWORD, 'B');

const { data: l, error: lErr } = await A.from('listings').select('id, title, status').eq('seller_id', ua.id).limit(1).maybeSingle();
if (lErr || !l) {
  console.error('Account A needs at least one listing. Create one in the app first.');
  process.exit(1);
}

// ── Listings ──────────────────────────────────────────────
section('Listings');
let r = await B.from('listings').update({ title: 'hacked' }).eq('id', l.id).select();
check('B cannot edit A listing', r.data?.length === 0, JSON.stringify(r.error ?? r.data));
r = await B.from('listings').update({ status: 'sold' }).eq('id', l.id).select();
check('B cannot mark A listing sold', r.data?.length === 0, JSON.stringify(r.error ?? r.data));
r = await B.from('listings').delete().eq('id', l.id).select();
check('B cannot delete A listing', r.data?.length === 0, JSON.stringify(r.error ?? r.data));
r = await B.from('listings').insert({
  seller_id: ua.id, title: 'spoof', description: 'spoofed listing', price: 10, category: 'Other', image_paths: [`${ua.id}/x/y.webp`],
});
check('B cannot create listing as A', r.error?.code === '42501', r.error?.code);
r = await B.from('listings').insert({
  title: 'stolen images', description: 'uses images from A', price: 10, category: 'Other', image_paths: [`${ua.id}/x/y.webp`],
});
check("B cannot reference A's image paths", r.error?.code === '42501', r.error?.code);
r = await anon.from('listings').insert({ title: 'anon', description: 'anonymous listing', price: 10, category: 'Other', image_paths: ['a/b.webp'] });
check('Logged-out user cannot create listings', !!r.error, 'insert succeeded');
r = await anon.from('listings').select('id').limit(1);
check('Logged-out user can browse listings', !r.error && Array.isArray(r.data), r.error?.message);
r = await A.from('listings').insert({ title: 'ab', description: 'bad', price: -5, category: 'Other', image_paths: [] });
check('Database rejects invalid values (CHECK constraints)', r.error?.code === '23514' || r.error?.code === '42501', r.error?.code);
const { data: still } = await A.from('listings').select('title, status').eq('id', l.id).single();
check("A's listing is unchanged", still.title === l.title && still.status === l.status);

// ── Profiles ──────────────────────────────────────────────
section('Profiles');
r = await B.from('profiles').update({ name: 'hacked' }).eq('id', ua.id).select();
check('B cannot edit A profile', r.data?.length === 0, JSON.stringify(r.error ?? r.data));
r = await B.from('profiles').insert({ id: crypto.randomUUID(), name: 'Fake' });
check('Nobody can insert profiles directly', !!r.error);

// ── Storage ───────────────────────────────────────────────
section('Storage');
const blob = new Blob([new Uint8Array([82, 73, 70, 70])], { type: 'image/webp' });
r = await B.storage.from('listing-images').upload(`${ua.id}/test-${Date.now()}.webp`, blob, { contentType: 'image/webp' });
check("B cannot upload into A's folder", !!r.error, 'upload succeeded');
const { data: aFiles } = await A.storage.from('listing-images').list(ua.id, { limit: 1 });
if (aFiles?.length) {
  const target = `${ua.id}/${aFiles[0].name}`;
  r = await B.storage.from('listing-images').remove([target]);
  const { data: after } = await A.storage.from('listing-images').list(ua.id, { limit: 100 });
  check("B cannot delete A's files", !!after?.some((f) => f.name === aFiles[0].name));
}

// ── Favourites ────────────────────────────────────────────
section('Favourites');
r = await B.from('favorites').insert({ user_id: ua.id, listing_id: l.id });
check('B cannot add a favourite as A', r.error?.code === '42501', r.error?.code);
await A.from('favorites').upsert({ listing_id: l.id }, { ignoreDuplicates: true }).then(() => {});
r = await B.from('favorites').select('*').eq('user_id', ua.id);
check("B cannot read A's favourites", r.data?.length === 0, JSON.stringify(r.data));
r = await B.from('favorites').delete().eq('user_id', ua.id).select();
check("B cannot delete A's favourites", r.data?.length === 0, JSON.stringify(r.data));

// ── Chat ──────────────────────────────────────────────────
section('Chat');
if (!env.TEST_C_EMAIL || !env.TEST_C_PASSWORD) {
  console.log('SKIP  chat checks (add TEST_C_EMAIL / TEST_C_PASSWORD to .env)');
} else {
  const C = mk();
  const uc = await login(C, env.TEST_C_EMAIL, env.TEST_C_PASSWORD, 'C');

  // A legitimate A–B chat (B is the buyer)
  let { data: chat } = await B.from('chats').select('id').eq('listing_id', l.id).eq('buyer_id', ub.id).maybeSingle();
  if (!chat) {
    const ins = await B.from('chats').insert({ listing_id: l.id, seller_id: ua.id }).select('id').single();
    if (ins.error) console.log('note: could not create A–B chat:', ins.error.message);
    chat = ins.data;
  }
  if (chat) {
    await B.from('messages').insert({ chat_id: chat.id, body: 'rls-test: hello from B' });

    r = await C.from('messages').select('*').eq('chat_id', chat.id);
    check("C cannot read A–B's messages", r.data?.length === 0, `${r.data?.length} rows`);
    r = await C.from('chats').select('*').eq('id', chat.id);
    check("C cannot see A–B's chat", r.data?.length === 0, `${r.data?.length} rows`);
    r = await C.from('messages').insert({ chat_id: chat.id, body: 'intruder' });
    check("C cannot send into A–B's chat", r.error?.code === '42501', r.error?.code);
    r = await B.from('messages').insert({ chat_id: chat.id, sender_id: ua.id, body: 'pretending to be A' });
    check('B cannot send a message as A', r.error?.code === '42501', r.error?.code);
    r = await A.from('messages').select('id').eq('chat_id', chat.id);
    check('A (seller) can read the chat', (r.data?.length ?? 0) > 0, r.error?.message);
  }
  r = await C.from('chats').insert({ listing_id: l.id, seller_id: ub.id });
  check('C cannot create a chat with a fake seller_id', r.error?.code === '42501', r.error?.code);
  r = await C.from('chats').insert({ listing_id: l.id, buyer_id: ub.id, seller_id: ua.id });
  check('C cannot create a chat as B', r.error?.code === '42501', r.error?.code);
  void uc;
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
