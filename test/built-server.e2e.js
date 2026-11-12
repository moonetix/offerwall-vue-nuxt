// End-to-end check of the production build: run `npm run build` first.
// Starts .output/server/index.mjs on a free port with a temporary database and the fake test keys.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { hashPassword } from '../server/lib/auth.js';
import { openStore } from '../server/lib/store.js';

const V = JSON.parse(readFileSync(new URL('./fixtures/moonetix-vectors.json', import.meta.url)));
const PB = V.postbacks;
const entry = new URL('../.output/server/index.mjs', import.meta.url).pathname;

let child;
let base;
let dir;
let store;

const freePort = () => new Promise((resolve) => {
  const s = createServer().listen(0, '127.0.0.1', () => {
    const { port } = s.address();
    s.close(() => resolve(port));
  });
});

before(async () => {
  assert.ok(existsSync(entry), 'Run npm run build first');
  dir = mkdtempSync(join(tmpdir(), 'offerwall-nuxt-'));
  const dbPath = join(dir, 'app.sqlite');
  store = openStore(dbPath);
  store.createUser('one', hashPassword('right-password')); // id 1
  store.createUser('two', hashPassword('x')); // id 2

  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', entry], {
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      DATABASE_PATH: dbPath,
      MOONETIX_APP_ID: V.app_id,
      MOONETIX_LINK_SALT: V.link_salt,
      MOONETIX_POSTBACK_KEY: V.postback_key,
      SESSION_SECRET: 'test_session_secret_not_secret_0123456789',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(`${base}/login`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('server did not start');
});

after(() => {
  child?.kill();
  store?.close();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const get = (path, init) => fetch(base + path, { redirect: 'manual', ...init });
const balance = () => store.findUserById(1).balance_micro;

test('postbacks through the built server', async () => {
  let res = await get(PB.credit_150);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'Credited');
  assert.equal(await (await get(PB.credit_150)).text(), 'Already processed');
  assert.equal(balance(), 150_000_000);

  assert.equal((await get(PB.credit_150.replace('reward=150&', 'reward=1500&'))).status, 403);
  assert.equal((await get(PB.wrong_key)).status, 403);
  assert.equal((await get('/api/moonetix/postback')).status, 403);
  assert.equal((await get(PB.credit_150, { method: 'POST' })).status, 405);
  assert.equal((await get(PB.test_credit)).status, 200);

  res = await get(PB.reverse_150);
  assert.equal(await res.text(), 'Reversed');
  assert.equal(balance(), 0);
  assert.equal(res.headers.get('set-cookie'), null);
});

test('sign-in, age check and the signed link', async () => {
  assert.equal((await get('/api/offerwall-link')).status, 401);
  const guest = await get('/earn');
  assert.equal(guest.status, 302);
  assert.equal(guest.headers.get('location'), '/login');

  const bad = await get('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'one', password: 'no' }) });
  assert.equal(bad.status, 401);

  const login = await get('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'one', password: 'right-password' }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];

  let page = await (await get('/earn', { headers: { cookie } })).text();
  assert.match(page, /I am 16 or older/);
  assert.doesNotMatch(page, /wall\.moonetix\.com/);
  assert.equal((await get('/api/offerwall-link', { headers: { cookie } })).status, 403);

  const crossSite = await get('/api/age', { method: 'POST', headers: { cookie, origin: 'https://evil.example', 'content-type': 'application/json' }, body: JSON.stringify({ age16OrOlder: true }) });
  assert.equal(crossSite.status, 403);

  const age = await get('/api/age', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ age16OrOlder: true }) });
  assert.equal(age.status, 200);

  const api = await get('/api/offerwall-link?user_id=2', { headers: { cookie } });
  assert.match(api.headers.get('cache-control'), /no-store/);
  assert.deepEqual(await api.json(), { url: V.links['1'] });

  const res = await get('/earn?user_id=2', { headers: { cookie } });
  page = await res.text();
  assert.ok(page.includes(`src="${V.links['1'].replace('&', '&amp;')}"`), 'server-rendered iframe with the signed link');
  assert.doesNotMatch(page, /wall\.moonetix\.com[^"]*user_id=2/);
  assert.ok(!page.includes(V.link_salt) && !page.includes(V.postback_key));
});
