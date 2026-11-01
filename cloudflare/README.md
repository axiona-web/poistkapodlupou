# Poistka audit — private Cloudflare pilot

Deployment source: this directory. Worker name: `poistka-audit`.
Build command: leave empty. Deploy command: `npx wrangler deploy`.
If repository root is selected instead, use `npx wrangler deploy --config cloudflare/wrangler.jsonc`.
No document, API key, or private token belongs in git.

Configure in Cloudflare Settings → Variables and Secrets:
- Secret `ANTHROPIC_API_KEY`: user enters directly.
- Secret `TEST_ACCESS_TOKEN`: separate random token of at least 32 characters for private tests. Never embed in public JavaScript.
- Text `ANTHROPIC_MODEL`: model ID selected from available Anthropic models after checking cost.

Public GET /health only reports private-pilot status. POST /extract fails closed without all settings, then requires Authorization: Bearer <test token>. JSON {type, mime, data} uses base64 document bytes, total body <= 1 MiB. Types match the six site audits. The adapter does not save files or log documents. The original document is transmitted to Anthropic if an authorized extraction is called.

This is extraction for human confirmation, NOT a completed audit or public upload service. Content signatures are basic screening, not full PDF validation. Before customer launch add document/page validation, distributed abuse and spending limits, privacy/retention terms, document confirmation and needs-based audit. No public frontend endpoint has been enabled. GitHub Pages remains unchanged.

Checks: `node --test tests/cloudflare-worker.mjs` from repository root.
No live Anthropic call has been performed. PHP adapter under server/ is an earlier alternative, not used by Cloudflare.
