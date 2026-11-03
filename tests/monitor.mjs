import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { runMonitor } from '../cloudflare/worker.mjs';
import { ReviewStore } from '../cloudflare/reviews.mjs';

function memoryStorage() {
  const map = new Map();
  const api = { async get(k) { return structuredClone(map.get(k)); }, async put(k, v) { map.set(k, structuredClone(v)); }, async delete(k) { map.delete(k); }, async list({ prefix }) { return new Map([...map].filter(([k]) => k.startsWith(prefix))); }, async transaction(fn) { return fn(api); } };
  return api;
}
function smtp(log) {
  return () => { const responses = ['220 hi', '250 OK', '334 a', '334 b', '235 ok', '250 ok', '250 ok', '354 go', '250 queued', '221 bye']; let reads = 0;
    return { writable: new WritableStream({ write(c) { log.push(new TextDecoder().decode(c)); } }), readable: { getReader: () => ({ read: async () => reads >= responses.length ? { done: true } : { value: new TextEncoder().encode(responses[reads++] + '\r\n'), done: false } }) }, close: async () => {} }; };
}
function env() {
  const store = new ReviewStore({ storage: memoryStorage() });
  return { ANTHROPIC_API_KEY: 'k', ANTHROPIC_MODEL: 'm', SMTP_HOST: 'h', SMTP_USER: 'ahoj@poistkapodlupou.sk', SMTP_PASS: 'p', REVIEWS_ADMIN_TOKEN: 'a'.repeat(40), TURNSTILE_SECRET: 't',
    REVIEWS: { idFromName: () => 'x', get: () => ({ fetch: (_, init) => store.fetch(new Request('https://i', init)) }) } };
}
const fetchWith = aiStatus => async url => String(url).startsWith('https://poistkapodlupou.sk') ? new Response('<title>Poistka pod Lupou</title>') : new Response(JSON.stringify(aiStatus === 200 ? {} : { error: { message: 'credit limit' } }), { status: aiStatus });

test('monitor alerts once on failure, stays quiet while unchanged, reports recovery', async () => {
  const e = env(); let log = [];
  let r = await runMonitor(e, { fetchImpl: fetchWith(200), connect: smtp(log) });
  assert.equal(r.ok, true); assert.equal(r.alerted, false); assert.ok(!log.join('').includes('MAIL FROM'));
  log = []; r = await runMonitor(e, { fetchImpl: fetchWith(400), connect: smtp(log) });
  assert.equal(r.ok, false); assert.equal(r.alerted, true);
  assert.match(log.join(''), /RCPT TO:<dominik@poistkapodlupou\.sk>/);
  log = []; r = await runMonitor(e, { fetchImpl: fetchWith(400), connect: smtp(log), now: new Date(Date.now() + 3600e3) });
  assert.equal(r.alerted, false);
  log = []; r = await runMonitor(e, { fetchImpl: fetchWith(400), connect: smtp(log), now: new Date(Date.now() + 25 * 3600e3) });
  assert.equal(r.alerted, true);
  log = []; r = await runMonitor(e, { fetchImpl: fetchWith(200), connect: smtp(log), now: new Date(Date.now() + 26 * 3600e3) });
  assert.equal(r.ok, true); assert.equal(r.alerted, true);
  assert.ok(Buffer.from(log.join('').match(/Subject: =\?UTF-8\?B\?([^?]+)/)[1], 'base64').toString().includes('opäť funguje'));
});

test('missing configuration is reported and admin endpoint needs the key', async () => {
  const e = env(); delete e.TURNSTILE_SECRET;
  const r = await runMonitor(e, { fetchImpl: fetchWith(200), connect: smtp([]), alert: false });
  assert.match(r.checks.find(c => c.name === 'Nastavenie služby').detail, /TURNSTILE_SECRET/);
  assert.equal((await worker.fetch(new Request('https://w/admin/monitor', { method: 'POST' }), e)).status, 401);
  assert.equal(typeof worker.scheduled, 'function');
});

test('AI cost estimate and daily budget block public AI', async () => {
  const { aiCost, recordAi, overBudget } = await import('../cloudflare/worker.mjs');
  assert.equal(Math.round(aiCost({ input_tokens: 1e6, output_tokens: 1e5, cache_read_input_tokens: 1e6 }) * 100) / 100, 4.8);
  const e = env(); e.AI_DAILY_BUDGET_USD = '1';
  assert.equal(await overBudget(e), false);
  await recordAi(e, { input_tokens: 400000 }, 'ask');
  assert.equal(await overBudget(e), true);
  const r = await runMonitor(e, { fetchImpl: fetchWith(200), connect: smtp([]), alert: false });
  assert.equal(r.checks.find(c => c.name === 'Denný rozpočet AI').ok, false);
});
