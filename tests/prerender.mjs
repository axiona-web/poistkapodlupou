// The public pages carry their content in the HTML (scripts/prerender.cjs). These checks fail when
// the site was built without that step, or when a page was edited by hand after it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');
const routes = [...fs.readFileSync(path.join(WEB, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace('https://poistkapodlupou.sk', '').replace(/^\/+|\/+$/g, ''));
const mainOf = (file) => fs.readFileSync(file, 'utf8').match(/<main id="main" tabindex="-1"(?: data-pre="([^"]*)")?>([\s\S]*?)<\/main><footer/);

// The same function as preHash() in web/app.js.
function preHash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h ^ s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + '-' + s.length; }

test('app.js still uses the hash this test knows', () => {
  const app = fs.readFileSync(path.join(WEB, 'app.js'), 'utf8');
  assert.ok(app.includes("function preHash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h^s.charCodeAt(i))|0;return (h>>>0).toString(36)+'-'+s.length;}"));
});

test('every page in the sitemap is prerendered and its hash matches', () => {
  assert.ok(routes.length >= 30, 'sitemap lists the public pages');
  for (const route of routes) {
    const found = mainOf(path.join(WEB, route, 'index.html'));
    assert.ok(found, `${route || '/'} has a <main>`);
    const [, hash, html] = found;
    assert.ok(hash, `${route || '/'} is prerendered (run python3 scripts/build-routes.py)`);
    assert.equal(preHash(html), hash, `${route || '/'} content matches its hash`);
    assert.match(html, /<h1[\s>]/, `${route || '/'} has a heading`);
    assert.doesNotMatch(html, /<script/i, `${route || '/'} carries no script in its content`);
  }
});

test('pages outside the sitemap stay empty shells', () => {
  for (const file of ['404.html', 'admin/index.html']) {
    const found = mainOf(path.join(WEB, file));
    assert.ok(found, `${file} has a <main>`);
    assert.equal(found[1], undefined, `${file} is not prerendered`);
    assert.equal(found[2], '', `${file} has an empty <main>`);
  }
});
