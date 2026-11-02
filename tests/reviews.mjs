import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.mjs';
import { ReviewStore, validateSubmission } from '../cloudflare/reviews.mjs';

function memoryStorage() {
  const map = new Map();
  const api = {
    async get(k) { return structuredClone(map.get(k)); },
    async put(k, v) { map.set(k, structuredClone(v)); },
    async delete(k) { map.delete(k); },
    async list({ prefix }) { return new Map([...map].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, structuredClone(v)])); },
    async transaction(fn) { return fn(api); }
  };
  return api;
}
function env() {
  const store = new ReviewStore({ storage: memoryStorage() });
  return { REVIEWS_ADMIN_TOKEN: 'a'.repeat(40), REVIEWS: { idFromName: () => 'x', get: () => ({ fetch: (_, init) => store.fetch(new Request('https://i', init)) }) } };
}
const good = { name: 'Jana K.', city: 'Košice', area: 'Poistenie auta', email: 'jana@example.sk', text: 'Veľmi ochotný a rýchly prístup, všetko vysvetlené.', client: true, consent: true, website: '' };
const post = (path, body, headers = {}) => new Request('https://w' + path, { method: 'POST', headers: { Origin: 'https://poistkapodlupou.sk', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const admin = { Authorization: 'Bearer ' + 'a'.repeat(40) };

test('validation rejects missing consent, links and honeypot', () => {
  assert.throws(() => validateSubmission({ ...good, consent: false }));
  assert.throws(() => validateSubmission({ ...good, text: 'Pozrite www.spam.sk lacné úvery hneď teraz' }));
  assert.throws(() => validateSubmission({ ...good, website: 'bot' }));
  assert.equal(validateSubmission(good).name, 'Jana K.');
});

test('submitted review is hidden until approved and e-mail is never public', async () => {
  const e = env();
  assert.equal((await worker.fetch(post('/reviews', good), e)).status, 201);
  assert.deepEqual(await (await worker.fetch(new Request('https://w/reviews'), e)).json(), []);
  assert.equal((await worker.fetch(new Request('https://w/admin/reviews'), e)).status, 401);
  const pending = await (await worker.fetch(new Request('https://w/admin/reviews', { headers: admin }), e)).json();
  assert.equal(pending[0].email, 'jana@example.sk');
  assert.equal((await worker.fetch(post('/admin/reviews', { id: pending[0].id, decision: 'approve' }, admin), e)).status, 200);
  const shown = await (await worker.fetch(new Request('https://w/reviews'), e)).json();
  assert.equal(shown.length, 1); assert.equal(shown[0].email, undefined);
  const after = await (await worker.fetch(new Request('https://w/admin/reviews', { headers: admin }), e)).json();
  assert.equal(after[0].email, undefined);
});

test('rejected review is deleted and daily limit applies', async () => {
  const e = env();
  for (let i = 0; i < 3; i++) assert.equal((await worker.fetch(post('/reviews', good), e)).status, 201);
  assert.equal((await worker.fetch(post('/reviews', good), e)).status, 429);
  const list = await (await worker.fetch(new Request('https://w/admin/reviews', { headers: admin }), e)).json();
  await worker.fetch(post('/admin/reviews', { id: list[0].id, decision: 'reject' }, admin), e);
  assert.equal((await (await worker.fetch(new Request('https://w/admin/reviews', { headers: admin }), e)).json()).length, 2);
});

test('foreign origin cannot submit', async () => {
  assert.equal((await worker.fetch(post('/reviews', good, { Origin: 'https://bad.test' }), env())).status, 403);
});
