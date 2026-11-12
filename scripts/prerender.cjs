#!/usr/bin/env node
/* Fill <main> of every public page with the HTML the app renders for that address.

   Search engines and AI assistants that do not run JavaScript then see the real content,
   and visitors see the page before the scripts finish loading.

   Run by scripts/build-routes.py after it has written the page shells. Needs Node with
   Playwright (Chromium). Without it the site still works; the pages are just rendered in
   the browser as before.

   How it works: every page listed in web/sitemap.xml is opened in headless Chromium with
   all files served straight from web/ and everything else (the API, analytics) blocked.
   The first HTML string the app assigns to <main> is captured and written into the page
   together with its hash (data-pre). In the browser app.js compares the hash with what it
   would render: the same means the content is already there, anything else is rendered
   again, so a stale or state dependent page corrects itself. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const WEB = path.resolve(__dirname, '..', 'web');
const ORIGIN = 'https://poistkapodlupou.sk';
const SHELL = '<main id="main" tabindex="-1"></main>';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };

function fileFor(urlPath) {
  let rel = decodeURIComponent(urlPath).replace(/^\/+/, '');
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(WEB, rel);
  return file.startsWith(WEB + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

async function capture(browser, route, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'sk-SK', ...options });
  await context.addInitScript(() => {
    const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    Object.defineProperty(Element.prototype, 'innerHTML', {
      configurable: true,
      get() { return d.get.call(this); },
      set(v) { if (this.id === 'main' && window.__pre === undefined) window.__pre = String(v); d.set.call(this, v); },
    });
  });
  await context.route('**/*', (req) => {
    const url = new URL(req.request().url());
    if (url.origin !== ORIGIN) return req.abort();
    const file = fileFor(url.pathname);
    if (!file) return req.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
    return req.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${ORIGIN}/${route ? route + '/' : ''}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__pre !== undefined, null, { timeout: 15000 });
  const result = await page.evaluate(() => ({ html: window.__pre, hash: preHash(window.__pre) }));
  await context.close();
  return { ...result, errors };
}

(async () => {
  const check = process.argv.includes('--check');
  const sitemap = fs.readFileSync(path.join(WEB, 'sitemap.xml'), 'utf8');
  const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(ORIGIN, '').replace(/^\/+|\/+$/g, ''));
  const browser = await chromium.launch();
  let done = 0, bytes = 0;
  const problems = [];
  for (const route of routes) {
    const file = path.join(WEB, route, 'index.html');
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes(SHELL)) { problems.push(`${route || '/'}: the page has no empty <main>, run scripts/build-routes.py first`); continue; }
    const { html, hash, errors } = await capture(browser, route);
    if (errors.length) problems.push(`${route || '/'}: ${errors.join('; ')}`);
    if (!html || /<script/i.test(html)) { problems.push(`${route || '/'}: nothing usable rendered`); continue; }
    if (check) {
      // The same page on a phone and in dark mode should render the same HTML, otherwise it would be rendered twice there.
      const phone = await capture(browser, route, { viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, colorScheme: 'dark' });
      if (phone.hash !== hash) problems.push(`${route || '/'}: renders differently on a phone (${hash} vs ${phone.hash})`);
    }
    fs.writeFileSync(file, source.replace(SHELL, () => `<main id="main" tabindex="-1" data-pre="${hash}">${html}</main>`), 'utf8');
    done += 1; bytes += Buffer.byteLength(html);
  }
  await browser.close();
  console.log(`prerendered ${done} of ${routes.length} pages, ${Math.round(bytes / 1024)} kB of content`);
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
