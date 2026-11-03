// Reviews: public submissions wait in a queue until an administrator approves them.
// E-mail addresses are kept only while a review is pending and are deleted on decision.
const AREAS = ['Poistenie auta','Dom a domácnosť','Cestovné poistenie','Životné poistenie','Iné poistenie','Hypotéka alebo úver','Sporenie alebo dôchodok'];
// Daily AI limits. ask = questions about a contract (reads the conditions, costlier); chat = site helper.
export const RATE_LIMITS = { ask: { perClient: 10, total: 50 }, chat: { perClient: 20, total: 300 } };
const LIMITS = { name: 40, city: 40, email: 254, text: 600, perClientPerDay: 3, maxPending: 50 };

export const VERIFY_LIMITS = { codesPerEmail: 3, codesPerClient: 6, codesTotal: 200, attempts: 5, codeMinutes: 15, sessionHours: 24, extractPerEmail: 2, askPerEmail: 10, suggestPerEmail: 1, suggestTotal: 20, usageDays: 90 };
const sha = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');
const isBlocked = (blocks, email) => Boolean(blocks[email] || blocks['@' + email.split('@')[1]]);
const clean = value => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

export function validateSubmission(input) {
  if (!input || typeof input !== 'object') throw Error('invalid');
  if (clean(input.website)) throw Error('spam'); // honeypot field, hidden from people
  const review = {
    name: clean(input.name), city: clean(input.city), area: clean(input.area),
    email: clean(input.email).toLowerCase(), text: String(input.text ?? '').replace(/\r/g, '').trim()
  };
  if (review.name.length < 2 || review.name.length > LIMITS.name) throw Error('name');
  if (review.city.length > LIMITS.city) throw Error('city');
  if (!AREAS.includes(review.area)) throw Error('area');
  if (review.email.length > LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(review.email)) throw Error('email');
  if (review.text.length < 20 || review.text.length > LIMITS.text) throw Error('text');
  if (/https?:\/\/|www\./i.test(review.text + review.name + review.city)) throw Error('links');
  if (input.client !== true || input.consent !== true) throw Error('consent');
  return review;
}

const publicView = r => ({ id: r.id, name: r.name, city: r.city, area: r.area, text: r.text, date: (r.approvedAt || r.created).slice(0, 7) });

export class ReviewStore {
  constructor(state) { this.storage = state.storage; }

  async all() {
    const items = await this.storage.list({ prefix: 'review:' });
    return [...items.values()].sort((a, b) => b.created.localeCompare(a.created));
  }

  async fetch(request) {
    const { action, review, client, id, decision } = await request.json();
    if (action === 'approved') {
      return Response.json((await this.all()).filter(r => r.status === 'approved').map(publicView));
    }
    if (action === 'submit') {
      const today = new Date().toISOString().slice(0, 10);
      const ok = await this.storage.transaction(async tx => {
        const rate = (await tx.get('rate')) || {};
        if (rate.day !== today) { rate.day = today; rate.clients = {}; }
        const uses = rate.clients[client] || 0;
        if (uses >= LIMITS.perClientPerDay) return 'rate';
        const pending = [...(await tx.list({ prefix: 'review:' })).values()].filter(r => r.status === 'pending').length;
        if (pending >= LIMITS.maxPending) return 'full';
        rate.clients[client] = uses + 1;
        await tx.put('rate', rate);
        const now = new Date().toISOString();
        const newId = now.replace(/\D/g, '').slice(0, 14) + '-' + crypto.randomUUID().slice(0, 8);
        await tx.put('review:' + newId, { id: newId, created: now, status: 'pending', ...review });
        return 'ok';
      });
      return Response.json({ result: ok }, { status: ok === 'ok' ? 201 : 429 });
    }
    if (action === 'contact_rate') {
      const today = new Date().toISOString().slice(0, 10);
      const ok = await this.storage.transaction(async tx => {
        const rate = (await tx.get('contact_rate')) || {};
        if (rate.day !== today) { rate.day = today; rate.total = 0; rate.clients = {}; }
        const uses = rate.clients[client] || 0;
        if (uses >= 5 || rate.total >= 100) return false;
        rate.clients[client] = uses + 1; rate.total++;
        await tx.put('contact_rate', rate);
        return true;
      });
      return new Response(null, { status: ok ? 204 : 429 });
    }
    if (action === 'ask_rate') {
      const today = new Date().toISOString().slice(0, 10);
      const scope = decision === 'chat' ? 'chat' : 'ask';
      const limits = RATE_LIMITS[scope];
      const ok = await this.storage.transaction(async tx => {
        const rate = (await tx.get(scope + '_rate')) || {};
        if (rate.day !== today) { rate.day = today; rate.total = 0; rate.clients = {}; }
        const uses = rate.clients[client] || 0;
        if (uses >= limits.perClient || rate.total >= limits.total) return false;
        rate.clients[client] = uses + 1; rate.total++;
        await tx.put(scope + '_rate', rate);
        return true;
      });
      return new Response(null, { status: ok ? 204 : 429 });
    }
    if (action === 'verify_start') {
      const { email } = review; const today = new Date().toISOString().slice(0, 10);
      const result = await this.storage.transaction(async tx => {
        if (isBlocked((await tx.get('blocks')) || {}, email)) return { error: 'blocked' };
        const rate = (await tx.get('verify_rate')) || {};
        if (rate.day !== today) { rate.day = today; rate.total = 0; rate.emails = {}; rate.clients = {}; }
        if ((rate.emails[email] || 0) >= VERIFY_LIMITS.codesPerEmail || (rate.clients[client] || 0) >= VERIFY_LIMITS.codesPerClient || rate.total >= VERIFY_LIMITS.codesTotal) return { error: 'rate_limited' };
        rate.emails[email] = (rate.emails[email] || 0) + 1; rate.clients[client] = (rate.clients[client] || 0) + 1; rate.total++;
        await tx.put('verify_rate', rate);
        const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
        await tx.put('code:' + email, { hash: await sha(email + '|' + code), expires: Date.now() + VERIFY_LIMITS.codeMinutes * 60000, attempts: 0 });
        return { code };
      });
      return Response.json(result, { status: result.error ? (result.error === 'blocked' ? 403 : 429) : 200 });
    }
    if (action === 'verify_check') {
      const { email, code } = review;
      const result = await this.storage.transaction(async tx => {
        const entry = await tx.get('code:' + email);
        if (!entry || entry.expires < Date.now()) return { error: 'expired' };
        if (entry.attempts >= VERIFY_LIMITS.attempts) return { error: 'too_many_attempts' };
        if (entry.hash !== await sha(email + '|' + code)) { entry.attempts++; await tx.put('code:' + email, entry); return { error: 'wrong_code' }; }
        await tx.delete('code:' + email);
        const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
        await tx.put('sess:' + await sha(token), { email, expires: Date.now() + VERIFY_LIMITS.sessionHours * 3600000 });
        const usage = (await tx.get('usage:' + email)) || { email, first: new Date().toISOString(), extracts: 0, questions: 0, verifications: 0 };
        usage.verifications++; usage.last = new Date().toISOString();
        await tx.put('usage:' + email, usage);
        return { token };
      });
      return Response.json(result, { status: result.error ? 400 : 200 });
    }
    if (action === 'session_use') {
      const { token, kind } = review; const today = new Date().toISOString().slice(0, 10);
      const result = await this.storage.transaction(async tx => {
        if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return { error: 'unverified', status: 401 };
        const key = 'sess:' + await sha(token); const sess = await tx.get(key);
        if (!sess || sess.expires < Date.now()) { if (sess) await tx.delete(key); return { error: 'unverified', status: 401 }; }
        if (isBlocked((await tx.get('blocks')) || {}, sess.email)) return { error: 'blocked', status: 403 };
        const usage = (await tx.get('usage:' + sess.email)) || { email: sess.email, first: new Date().toISOString(), extracts: 0, questions: 0, verifications: 0 };
        if (usage.day !== today) { usage.day = today; usage.dayExtracts = 0; usage.dayQuestions = 0; usage.daySuggests = 0; }
        if (kind === 'extract' && usage.dayExtracts >= VERIFY_LIMITS.extractPerEmail) return { error: 'email_limit', status: 429 };
        if (kind === 'ask' && usage.dayQuestions >= VERIFY_LIMITS.askPerEmail) return { error: 'email_limit', status: 429 };
        if (kind === 'suggest') {
          if ((usage.daySuggests || 0) >= VERIFY_LIMITS.suggestPerEmail) return { error: 'email_limit', status: 429 };
          const g = (await tx.get('suggest_rate')) || {};
          if (g.day !== today) { g.day = today; g.total = 0; }
          if (g.total >= VERIFY_LIMITS.suggestTotal) return { error: 'rate_limited', status: 429 };
          g.total++; await tx.put('suggest_rate', g);
          usage.daySuggests = (usage.daySuggests || 0) + 1; usage.suggests = (usage.suggests || 0) + 1;
        }
        if (kind === 'extract') { usage.dayExtracts++; usage.extracts++; }
        if (kind === 'ask') { usage.dayQuestions++; usage.questions++; }
        usage.last = new Date().toISOString();
        await tx.put('usage:' + sess.email, usage);
        return { email: sess.email };
      });
      return Response.json(result, { status: result.status || 200 });
    }
    if (action === 'usage_list') {
      const cutoff = new Date(Date.now() - VERIFY_LIMITS.usageDays * 86400000).toISOString();
      const items = [...(await this.storage.list({ prefix: 'usage:' })).entries()];
      for (const [k, v] of items) if ((v.last || v.first) < cutoff) await this.storage.delete(k);
      const blocks = (await this.storage.get('blocks')) || {};
      return Response.json({ usage: items.map(([, v]) => v).filter(v => (v.last || v.first) >= cutoff).map(v => ({ ...v, blocked: isBlocked(blocks, v.email) })).sort((a, b) => (b.last || '').localeCompare(a.last || '')), blocks: Object.keys(blocks).sort() });
    }
    if (action === 'block_set') {
      const { value, blocked } = review;
      await this.storage.transaction(async tx => { const blocks = (await tx.get('blocks')) || {}; if (blocked) blocks[value] = new Date().toISOString(); else delete blocks[value]; await tx.put('blocks', blocks); });
      return Response.json({ ok: true });
    }
    if (action === 'cond_list') {
      const items = await this.storage.list({ prefix: 'cond:' });
      return Response.json([...items.values()].sort((a, b) => (a.insurer + a.type + b.validFrom).localeCompare(b.insurer + b.type + a.validFrom)));
    }
    if (action === 'cond_put') {
      await this.storage.put('cond:' + review.id, review);
      return Response.json({ ok: true });
    }
    if (action === 'cond_get') {
      const item = await this.storage.get('cond:' + id);
      return item ? Response.json(item) : Response.json({ error: 'not_found' }, { status: 404 });
    }
    if (action === 'cond_delete') {
      await this.storage.delete('cond:' + id);
      return Response.json({ ok: true });
    }
    if (action === 'admin_list') {
      return Response.json((await this.all()).map(r => ({ ...r })));
    }
    if (action === 'decide') {
      const key = 'review:' + id;
      const current = await this.storage.get(key);
      if (!current) return Response.json({ error: 'not_found' }, { status: 404 });
      if (decision === 'approve') {
        const { email, ...rest } = current;
        await this.storage.put(key, { ...rest, status: 'approved', approvedAt: new Date().toISOString() });
      } else if (decision === 'reject' || decision === 'delete') {
        await this.storage.delete(key);
      } else return Response.json({ error: 'decision' }, { status: 400 });
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'action' }, { status: 400 });
  }
}
