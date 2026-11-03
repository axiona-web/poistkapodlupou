import test from 'node:test';
import assert from 'node:assert/strict';
import { contactRoute, validateContact } from '../cloudflare/worker.mjs';
import { ReviewStore } from '../cloudflare/reviews.mjs';
import { buildMessage } from '../cloudflare/mailer.mjs';

function fakeSmtp(log, fail) {
  return () => {
    const responses = ['220 hi', '250-mx\r\n250 OK', '334 VXNlcm5hbWU6', '334 UGFzc3dvcmQ6', fail === 'pass' ? '535 bad' : '235 ok', '250 ok', '250 ok', '354 go', '250 queued', '221 bye'];
    let i = 0, pending = [];
    const readable = new ReadableStream({ pull(c) { if (i < responses.length && pending.length === 0) pending.push(responses[i++] + '\r\n'); }, start() {} });
    let reads = 0;
    return {
      writable: new WritableStream({ write(chunk) { log.push(new TextDecoder().decode(chunk)); } }),
      readable: { getReader: () => ({ read: async () => { if (reads >= responses.length) return { done: true }; return { value: new TextEncoder().encode(responses[reads++] + '\r\n'), done: false }; } }) },
      close: async () => {}
    };
  };
}
function memoryStorage() {
  const map = new Map();
  const api = { async get(k) { return map.get(k); }, async put(k, v) { map.set(k, structuredClone(v)); }, async delete(k) { map.delete(k); }, async list() { return new Map(); }, async transaction(fn) { return fn(api); } };
  return api;
}
const env = () => { const store = new ReviewStore({ storage: memoryStorage() }); return { SMTP_HOST: 'smtp.test', SMTP_USER: 'ahoj@poistkapodlupou.sk', SMTP_PASS: 'secret', REVIEWS: { idFromName: () => 'x', get: () => ({ fetch: (_, init) => store.fetch(new Request('https://i', init)) }) } }; };
const good = { name: 'Ján Novák', email: 'jan@example.sk', phone: '+421 900 000 000', topic: 'Auto', message: 'Dobrý deň, chcem poistiť auto.', website: '' };
const req = body => new Request('https://w/contact', { method: 'POST', headers: { Origin: 'https://poistkapodlupou.sk', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('contact validation', () => {
  assert.throws(() => validateContact({ ...good, email: 'x' }));
  assert.throws(() => validateContact({ ...good, website: 'bot' }));
  assert.equal(validateContact(good).topic, 'Auto');
});
test('message routes by topic and sets reply-to to the visitor', async () => {
  const log = []; const r = await contactRoute(req({ ...good, topic: 'Úver alebo hypotéka' }), env(), fakeSmtp(log));
  assert.equal(r.status, 200);
  const all = log.join('');
  assert.match(all, /RCPT TO:<dominik@poistkapodlupou\.sk>/);
  assert.match(all, /Reply-To: <jan@example\.sk>/);
  assert.match(all, /[^\n]\r\n\.\r\nQUIT\r\n$/);
});
test('failed login returns 502 and does not claim success', async () => {
  const r = await contactRoute(req(good), env(), fakeSmtp([], 'pass'));
  assert.equal(r.status, 502);
});
test('missing smtp secret fails closed', async () => {
  const e = env(); delete e.SMTP_PASS;
  assert.equal((await contactRoute(req(good), e, fakeSmtp([]))).status, 503);
});
test('header injection is neutralised', () => {
  const m = buildMessage({ from: 'a@b.sk', fromName: 'x', to: 'c@d.sk', replyTo: 'e@f.sk\r\nBcc: evil@x', subject: 'Hi\r\nBcc: evil@x', text: 't' });
  assert.equal(m.split('\r\n').filter(l => l.startsWith('Bcc:')).length, 0);
});
test('rate limit after five messages', async () => {
  const e = env(); for (let i = 0; i < 5; i++) assert.equal((await contactRoute(req(good), e, fakeSmtp([]))).status, 200);
  assert.equal((await contactRoute(req(good), e, fakeSmtp([]))).status, 429);
});

test('audit summary is attached and changes subject', async () => {
  const log = []; const r = await contactRoute(req({ ...good, topic: 'Moja poistka', audit: 'PZP · Allianz\nLimit: 6 450 000 EUR' }), env(), fakeSmtp(log));
  assert.equal(r.status, 200);
  const all = log.join('');
  assert.match(all, /Subject: =\?UTF-8\?B\?/);
  assert.ok(Buffer.from(all.split('\r\n\r\n')[1].replace(/\r\n\.\r\nQUIT\r\n$/,'').replace(/\r\n/g,''),'base64').toString().includes('VÝSLEDOK AUDITU'));
  assert.throws(() => validateContact({ ...good, audit: 'x'.repeat(12001) }));
});

test('life questionnaire goes to Alexandra with its own subject', async () => {
  const log = []; const r = await contactRoute(req({ ...good, topic: 'Dotazník životného poistenia', audit: 'Osobné údaje\n- Meno: Ján' }), env(), fakeSmtp(log));
  assert.equal(r.status, 200); assert.match(log.join(''), /RCPT TO:<curillova@poistkapodlupou\.sk>/);
});

test('questionnaire PDF is attached; short life form goes to Alexandra', async () => {
  const pdf = Buffer.from('%PDF-1.7 test').toString('base64');
  const log = []; const r = await contactRoute(req({ ...good, name: 'Ján Šťastný', topic: 'Dotazník životného poistenia', audit: 'x', pdf }), env(), fakeSmtp(log));
  assert.equal(r.status, 200); const all = log.join('');
  assert.match(all, /multipart\/mixed/); assert.match(all, /filename="dotaznik-zivotne-poistenie-jan-stastny\.pdf"/); assert.ok(all.includes(pdf));
  const textPart = Buffer.from(all.split('Content-Transfer-Encoding: base64\r\n\r\n')[1].split('\r\n--')[0].replace(/\r\n/g,''),'base64').toString();
  assert.equal(textPart.trim(), 'Dotazník v prílohe.'); assert.doesNotMatch(textPart, /ODPOVEDE Z DOTAZNÍKA/);
  assert.throws(() => validateContact({ ...good, topic: 'Auto', pdf }));
  assert.throws(() => validateContact({ ...good, topic: 'Dotazník životného poistenia', pdf: Buffer.from('<html>').toString('base64') }));
  const log2 = []; await contactRoute(req({ ...good, topic: 'Životné poistenie' }), env(), fakeSmtp(log2));
  assert.match(log2.join(''), /RCPT TO:<curillova@poistkapodlupou\.sk>/);
});
