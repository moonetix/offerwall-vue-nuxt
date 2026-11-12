// Replays postbacks that the Moonetix postback code produced and signed (fixtures/moonetix-vectors.json)
// through the same handlePostback() and store that server/api/moonetix/postback.get.ts uses.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeEach, test } from 'node:test';
import { formatMicro, handlePostback, readParams } from '../server/lib/moonetix.js';
import { hashPassword } from '../server/lib/auth.js';
import { openStore } from '../server/lib/store.js';

const V = JSON.parse(readFileSync(new URL('./fixtures/moonetix-vectors.json', import.meta.url)));
const PB = V.postbacks;
let store;

beforeEach(() => {
  store = openStore(':memory:');
  store.createUser('one', hashPassword('x')); // id 1
  store.createUser('two', hashPassword('x')); // id 2
});

// Same shape as h3 getQuery(): a repeated key becomes an array.
function query(path) {
  const sp = new URL(path, 'http://localhost').searchParams;
  const q = {};
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    q[key] = all.length === 1 ? all[0] : all;
  }
  return q;
}

function send(path, postbackKey = V.postback_key) {
  const q = query(path);
  return handlePostback(readParams((k) => q[k]), { postbackKey, store });
}

const balance = (id) => formatMicro(store.findUserById(id).balance_micro);
const txCount = () => store.db.prepare('SELECT COUNT(*) AS n FROM moonetix_transactions').get().n;

test('a credit is applied once', () => {
  assert.deepEqual(send(PB.credit_150), { code: 200, body: 'Credited' });
  assert.deepEqual(send(PB.credit_150), { code: 200, body: 'Already processed' });
  assert.equal(balance(1), '150');
  const row = store.db.prepare('SELECT * FROM moonetix_transactions').get();
  assert.equal(row.offer_name, 'Bigo Live & "Friends"');
});

test('decimal and large rewards add up exactly', () => {
  for (const name of ['credit_150', 'credit_decimal', 'credit_five_decimals', 'credit_user2', 'credit_large']) {
    assert.equal(send(PB[name]).body, 'Credited', name);
  }
  assert.equal(balance(1), '151.98456');
  assert.equal(balance(2), '1234607.125');
});

test('a reversal takes back exactly what was credited, once', () => {
  send(PB.credit_150);
  send(PB.credit_decimal);
  assert.equal(send(PB.reverse_150).body, 'Reversed');
  assert.equal(send(PB.reverse_150).body, 'Already processed');
  assert.equal(send(PB.credit_150).body, 'Already processed');
  assert.equal(balance(1), '0.75');
});

test('a reversal can take the balance below zero', () => {
  send(PB.credit_150);
  store.db.prepare('UPDATE users SET balance_micro = 50000000 WHERE id = 1').run();
  send(PB.reverse_150);
  assert.equal(balance(1), '-100');
});

test('a reversal without a credit changes nothing and blocks a late credit', () => {
  assert.match(send(PB.reverse_never_credited).body, /Not credited before/);
  assert.equal(send(PB.late_credit_after_reverse).body, 'Already processed');
  assert.equal(balance(1), '0');
});

test('dashboard test postbacks are verified but not credited', () => {
  assert.match(send(PB.test_credit).body, /Test postback/);
  assert.match(send(PB.test_reverse).body, /Test postback/);
  assert.equal(txCount(), 0);
});

test('unknown users get 200 and nothing is stored', () => {
  assert.deepEqual(send(PB.unknown_user), { code: 200, body: 'Unknown user, nothing credited' });
  assert.equal(send(PB.not_an_account_id).code, 200);
  assert.equal(txCount(), 0);
});

test('wrong keys, tampered values and malformed hashes get 403', () => {
  assert.equal(send(PB.wrong_key).code, 403);
  assert.equal(send(PB.credit_150, 'another_key').code, 403);
  const url = PB.credit_150;
  const hash = url.split('hash=')[1];
  for (const path of [
    url.replace('reward=150&', 'reward=1500&'),
    url.replace('user=1&', 'user=2&'),
    url.replace('tx=tx_1001&', 'tx=tx_1002&'),
    url.replace('status=1&', 'status=2&'),
    url.replace(hash, hash.toUpperCase()),
    url.replace(`&hash=${hash}`, ''),
    `${url}&hash=${hash}`,
    url.replace('tx=tx_1001&', 'tx=tx_1001&tx=tx_1001&'),
    '/api/moonetix/postback',
  ]) {
    assert.equal(send(path).code, 403, path);
  }
  assert.equal(balance(1), '0');
  assert.equal(balance(2), '0');
});

test('a missing key throws, so the route answers 500', () => {
  assert.throws(() => send(PB.credit_150, ''), /MOONETIX_POSTBACK_KEY is not set/);
});

test('a storage failure rolls everything back and the retry succeeds', () => {
  store.db.exec("CREATE TRIGGER fail_balance BEFORE UPDATE OF balance_micro ON users BEGIN SELECT RAISE(ABORT, 'disk full'); END");
  assert.throws(() => send(PB.credit_150), /disk full/);
  assert.equal(txCount(), 0);
  store.db.exec('DROP TRIGGER fail_balance');
  assert.equal(send(PB.credit_150).body, 'Credited');
  assert.equal(balance(1), '150');
});
