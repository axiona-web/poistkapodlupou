// One named instance serializes reservations across every public Worker location.
export class AuditQuota {
  constructor(state) { this.storage = state.storage; }

  async fetch(request) {
    const { client } = await request.json();
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const allowed = await this.storage.transaction(async transaction => {
      const previous = await transaction.get('public');
      const current = previous?.month === month ? previous : { month, count: 0 };
      if (current.day !== today) {
        current.day = today;
        current.clients = {};
      }
      const uses = current.clients[client] || 0;
      if (current.count >= 100 || uses >= 3) return false;
      current.count++;
      current.clients[client] = uses + 1;
      await transaction.put('public', current);
      return true;
    });
    return new Response(null, { status: allowed ? 204 : 429 });
  }
}
