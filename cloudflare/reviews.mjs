// Reviews: public submissions wait in a queue until an administrator approves them.
// E-mail addresses are kept only while a review is pending and are deleted on decision.
const AREAS = ['Poistenie auta','Dom a domácnosť','Cestovné poistenie','Životné poistenie','Iné poistenie','Hypotéka alebo úver','Sporenie alebo dôchodok'];
const LIMITS = { name: 40, city: 40, email: 254, text: 600, perClientPerDay: 3, maxPending: 50 };

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
