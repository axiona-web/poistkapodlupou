#!/usr/bin/env python3
"""Generate one index.html per address so every page has its own URL, title and description.

Run from the repository root after changing web/index.html, web/routes.js, any page script or the advice list:
    python3 scripts/build-routes.py
It writes web/<route>/index.html, web/404.html, web/sitemap.xml and web/robots.txt, and then
fills <main> of every public page with its rendered content (scripts/prerender.cjs, needs Node
with Playwright). Pass --no-prerender to skip that step, --check to also compare phone rendering.
"""
import html, json, re, shutil, subprocess, sys
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent / 'web'
SITE = 'https://poistkapodlupou.sk'
template = (WEB / 'index.html').read_text(encoding='utf-8')
# web/index.html is both the template and the home page: drop the content prerendered into it last time.
template = re.sub(r'<main id="main"[^>]*>.*?</main>', '<main id="main" tabindex="-1"></main>', template, count=1, flags=re.S)
HERO = '<link rel="preload" as="image" href="assets/hero-photo.webp" fetchpriority="high">'  # home page only
template = template.replace(HERO, '')
routes_src = (WEB / 'routes.js').read_text(encoding='utf-8')
meta = json.loads(routes_src[routes_src.index('{'):routes_src.rindex('}') + 1])

pages = (WEB / 'pages.js').read_text(encoding='utf-8')
articles = {}
for slug, _, title, desc in re.findall(r"\['([a-z-]+)','(Základy|Auto|Bývanie|Cestovanie|Práca)','([^']+)','([^']+)'", pages):
    meta[f'rady/{slug}'] = [f'{title} | Poistka pod Lupou', desc]
    articles[f'rady/{slug}'] = (title, desc)

faq_src = (WEB / 'faq.js').read_text(encoding='utf-8')
faq_items = json.loads(faq_src[faq_src.index('['):faq_src.index('];') + 1])
faq_ld = json.dumps({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
    {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': re.sub(r'<[^>]+>', '', a)}} for q, a in faq_items]},
    ensure_ascii=False).replace('</', '<\\/')

# Breadcrumbs for pages that sit under a hub: route -> (hub route, hub name, own name).
TOOLS = {'audit': 'Audit poistky', 'poistna-udalost': 'Poistná udalosť', 'porovnanie': 'Porovnanie zmlúv',
         'podmienky': 'Opýtajte sa podmienok', 'poistna-suma': 'Kalkulačka poistnej sumy'}
PRODUCTS = {'auto': 'Poistenie auta', 'majetok': 'Dom a domácnosť', 'cestovne': 'Cestovné poistenie',
            'zodpovednost': 'Zodpovednosť za škodu', 'zivotne': 'Životné poistenie'}
def crumbs(route):
    if route in articles: trail = [('rady', 'Rady a tipy'), (route, articles[route][0])]
    elif route in TOOLS: trail = [('nastroje', 'Nástroje'), (route, TOOLS[route])]
    elif route in PRODUCTS: trail = [('poistenie', 'Poistenie'), (route, PRODUCTS[route])]
    else: return ''
    items = [('', 'Domov')] + trail
    ld = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': name, 'item': f"{SITE}/{r + '/' if r else ''}"} for i, (r, name) in enumerate(items)]}
    return '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace('</', '<\\/') + '</script>'

def page(route, info):
    title, desc = info[0], info[1]
    robots = info[2] if len(info) > 2 else ''
    url = f"{SITE}/{route + '/' if route else ''}"
    out = template
    out = re.sub(r'<title>.*?</title>', f'<title>{html.escape(title)}</title>', out, count=1)
    if desc:
        out = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{html.escape(desc)}">', out, count=1)
        out = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{html.escape(desc)}">', out, count=1)
    out = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{html.escape(title)}">', out, count=1)
    out = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">', out, count=1)
    out = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">', out, count=1)
    out = re.sub(r'<meta name="robots" content="[^"]*">', '', out)
    if route in articles:
        t, d = articles[route]
        ld = json.dumps({'@context': 'https://schema.org', '@type': 'Article', 'headline': t, 'description': d, 'inLanguage': 'sk',
                         'mainEntityOfPage': f'{SITE}/{route}/', 'image': f'{SITE}/assets/og-image.jpg',
                         'author': {'@type': 'Organization', 'name': 'Poistka pod Lupou', 'url': SITE},
                         'publisher': {'@type': 'Organization', 'name': 'Poistka pod Lupou', 'url': SITE}}, ensure_ascii=False).replace('</', '<\\/')
        out = out.replace('</head>', f'<script type="application/ld+json">{ld}</script></head>', 1)
    if route in TOOLS:
        app = {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': TOOLS[route] + ' – Poistka pod Lupou', 'url': url,
               'description': desc, 'inLanguage': 'sk', 'applicationCategory': 'FinanceApplication', 'operatingSystem': 'Web',
               'isAccessibleForFree': True, 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR'},
               'provider': {'@id': f'{SITE}/#poistenie'}}
        out = out.replace('</head>', '<script type="application/ld+json">' + json.dumps(app, ensure_ascii=False).replace('</', '<\\/') + '</script></head>', 1)
    bc = crumbs(route)
    if bc:
        out = out.replace('</head>', bc + '</head>', 1)
    if route == 'otazky':
        out = out.replace('</head>', f'<script type="application/ld+json">{faq_ld}</script></head>', 1)
    if not route:
        out = out.replace('<link rel="stylesheet"', HERO + '<link rel="stylesheet"', 1)
    if robots:
        out = out.replace('<base href="/">', f'<base href="/"><meta name="robots" content="{robots}">', 1)
    return out

# Remove folders generated earlier (marked by a .generated file) so renamed routes disappear.
for marker in WEB.rglob('.generated'):
    shutil.rmtree(marker.parent)

(WEB / 'index.html').write_text(page('', meta['']), encoding='utf-8')
for route, info in meta.items():
    if not route:
        continue
    folder = WEB / route
    folder.mkdir(parents=True, exist_ok=True)
    (folder / 'index.html').write_text(page(route, info), encoding='utf-8')
    top = WEB / route.split('/')[0]
    (top / '.generated').write_text('Generated by scripts/build-routes.py\n', encoding='utf-8')

(WEB / '404.html').write_text(page('404', ['Stránka sa nenašla | Poistka pod Lupou', '', 'noindex']), encoding='utf-8')
urls = [r for r, i in meta.items() if not (len(i) > 2 and 'noindex' in i[2])]
(WEB / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ''.join(f"  <url><loc>{SITE}/{r + '/' if r else ''}</loc></url>\n" for r in urls) + '</urlset>\n', encoding='utf-8')
(WEB / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /recenzie-sprava/\nDisallow: /podmienky-sprava/\nDisallow: /pouzitie-sprava/\nDisallow: /audit-pilot/\nDisallow: /formular/\n\nSitemap: {SITE}/sitemap.xml\n', encoding='utf-8')
# llms.txt: a plain summary of the site for AI assistants (https://llmstxt.org).
def line(route):
    title = meta[route][0].split(' | ')[0]
    return f"- [{title}]({SITE}/{route + '/' if route else ''}): {meta[route][1]}"
groups = [('Nástroje (bezplatné)', ['audit', 'poistna-udalost', 'porovnanie', 'podmienky', 'poistna-suma', 'nastroje']),
          ('Poistenie a financie', ['poistenie', 'auto', 'majetok', 'cestovne', 'zodpovednost', 'zivotne', 'kalkulacky']),
          ('Rady a tipy', ['rady'] + [r for r in urls if r.startswith('rady/')]),
          ('O nás a kontakt', ['o-nas', 'otazky', 'recenzie', 'kontakt', 'pravne', 'sukromie'])]
llms = ['# Poistka pod Lupou', '',
        '> Poistenie a financie zo Spiša (Spišská Nová Ves, Slovensko). Bezplatné online nástroje na kontrolu poistnej zmluvy, '
        'pomoc pri poistnej udalosti a porovnanie zmlúv, a osobná konzultácia s finančným agentom. Web je v slovenčine.', '',
        'Poistenie sprostredkúva Mgr. Alexandra Čurillová, s. r. o. (reg. č. NBS 273149), hypotéky, úvery a sporenie '
        'Ing. Martin Dominik s.r.o. (reg. č. NBS 281061). Obaja sú podriadení finanční agenti spoločnosti Finportal, a. s. '
        'Konzultácia aj všetky nástroje sú bezplatné. Osobné stretnutia v okrese Spišská Nová Ves, online pre celé Slovensko. '
        'Kontakt: ahoj@poistkapodlupou.sk, +421 948 220 080.', '',
        'Výstupy nástrojov sú orientačné a nie sú finančným odporúčaním; záväzné je znenie zmluvy a poistných podmienok.', '']
for name, routes in groups:
    llms += [f'## {name}', ''] + [line(r) for r in routes if r in meta] + ['']
(WEB / 'llms.txt').write_text('\n'.join(llms), encoding='utf-8')
print(f'{len(meta)} addresses, {len(urls)} in sitemap')

if '--no-prerender' not in sys.argv:
    cmd = ['node', str(Path(__file__).with_name('prerender.cjs'))] + (['--check'] if '--check' in sys.argv else [])
    try:
        done = subprocess.run(cmd, check=False)
    except FileNotFoundError:
        done = None
    if done is None or done.returncode:
        print('Prerender did not finish. The pages still work, their content is just rendered in the browser.', file=sys.stderr)
        sys.exit(1)
