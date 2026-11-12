/* Client tools: claim helper (/poistna-udalost), contract comparison (/porovnanie), ask the conditions (/podmienky).
   Uses verifyGate, auditSession, saveSession, AUDIT_* from audit.js, PDF helpers from mobile-document.js and REVIEWS_API/reviewEsc from reviews.js. */
const TOOL_API = 'https://poistkapodlupou.mdominik01.workers.dev';
const CLAIM_EVENTS = [
 ['auto-vina', 'Spôsobil som nehodu autom', 'Škoda na cudzom aute, majetku alebo zdraví', 'pzp', 'pzp-car', 'Napríklad: pri cúvaní na parkovisku som narazil do zaparkovaného auta, poškodený nárazník.'],
 ['auto-moje', 'Poškodené moje auto', 'Nehoda, krupobitie, vandal, zver, krádež', 'kasko', 'kasko-car', 'Napríklad: cez noc padali krúpy, na kapote a streche sú jamky, prasknuté čelné sklo.'],
 ['auto-cudzia', 'Iný vodič poškodil moje auto', 'Škodu hradí PZP vinníka', 'pzp', 'pzp-car', 'Napríklad: na križovatke do mňa zozadu narazilo iné auto, vodič priznal vinu, spísali sme záznam.'],
 ['domov-voda', 'Voda, požiar alebo búrka doma', 'Vytopenie, požiar, víchrica, krupobitie', 'majetok', 'home', 'Napríklad: prasklo potrubie v kúpeľni, mokrá podlaha a stena, voda zatiekla aj k susedom.'],
 ['domov-kradez', 'Krádež alebo vlámanie', 'Doma, v pivnici, v garáži', 'majetok', 'home', 'Napríklad: niekto vypáčil dvere pivnice a ukradol bicykel a náradie, volal som políciu.'],
 ['zodpovednost', 'Spôsobil som škodu inému', 'Doma, v práci, pri športe', 'zodpovednost', 'work', 'Napríklad: v práci mi spadol služobný notebook a rozbil sa displej.'],
 ['cesty', 'Problém na cestách', 'Lekár v zahraničí, batožina, storno', 'cestovne', 'travel', 'Napríklad: na dovolenke v Chorvátsku som musel ísť k lekárovi, platil som v hotovosti.'],
 ['uraz', 'Úraz alebo choroba', 'Životné alebo úrazové poistenie', 'zivotne', 'life', 'Napríklad: pri behu som si zlomil zápästie, mal som sadru 6 týždňov.']
];
const CLAIM_VERDICT = { kryte: ['Podľa zmluvy kryté', 'ok'], pravdepodobne_kryte: ['Pravdepodobne kryté', 'ok'], nejasne: ['Nedá sa jednoznačne povedať', 'mid'], pravdepodobne_nekryte: ['Pravdepodobne nekryté', 'bad'], nekryte: ['Podľa zmluvy nekryté', 'bad'] };
const DIFF_LABEL = { v_ponuke_navyse: ['Ponuka pridáva', 'plus'], v_ponuke_chyba: ['V ponuke chýba', 'minus'], vyssie_v_ponuke: ['Vyššie v ponuke', 'neutral'], nizsie_v_ponuke: ['Nižšie v ponuke', 'neutral'], rovnake: ['Rovnaké', 'same'], rozdielne: ['Iné podmienky', 'neutral'], nejasne: ['Nejasné', 'same'] };
const COND_SUGGEST = { pzp: ['Kryje PZP aj škodu na skle?', 'Aký je limit pri škode na zdraví?', 'Kedy môže poisťovňa žiadať regres?'], kasko: ['Aká je spoluúčasť pri krádeži?', 'Kryje to zver na ceste?', 'Ako sa určí hodnota auta pri totálnej škode?'], majetok: ['Je kryté vytopenie od suseda?', 'Čo je výluka pri krádeži?', 'Kryje to povodeň?'], cestovne: ['Kryje to lyžovanie?', 'Do akej sumy sú liečebné náklady?', 'Čo robiť pri strate batožiny?'], zodpovednost: ['Kryje to škodu na služobnom aute?', 'Aká je spoluúčasť?', 'Čo nie je kryté?'], zivotne: ['Aké sú čakacie doby?', 'Čo sa považuje za úraz?', 'Kedy poisťovňa neplní?'] };
const TOOL_ERRORS = { email_limit: 'Dnes ste z tohto e-mailu využili denný limit. Skúste to zajtra alebo napíšte Alexandre.', rate_limited: 'Dnes ste už položili veľa otázok. Skúste to zajtra alebo napíšte Alexandre.', budget: 'Nástroj je dnes vyťažený. Skúste to zajtra alebo napíšte Alexandre.', blocked: 'Tento e-mail nemôže službu používať.', quota_reached: 'Limit pre čítanie dokumentov je vyčerpaný. Môžete pokračovať bez dokumentu.', document_too_long: 'Dokument je príliš dlhý. Nahrajte iba strany so zmluvou.', document_too_large: 'Súbor je príliš veľký. PDF môže mať najviac 10 MB.', conditions_not_found: 'Vybrané podmienky už v knižnici nie sú. Obnovte stránku.', provider_timeout: 'Odpoveď trvala príliš dlho. Skúste to znova.' };
const toolMsg = (code, fallback) => TOOL_ERRORS[code] || fallback || 'Nepodarilo sa to. Skúste to o chvíľu znova.';
const tEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const tList = (items, tag = 'ul') => items && items.length ? `<${tag}>${items.map(i => `<li>${tEsc(i)}</li>`).join('')}</${tag}>` : '<p class="note">Zo zdrojov sa to nedá určiť.</p>';
const DROP_ICON = '<span class="doc-drop-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
function toolDrop(name, title, hint) { return `<label class="doc-drop"><input type="file" name="${name}" accept="application/pdf,image/*">${DROP_ICON}<b class="doc-drop-title">${title}</b><span class="doc-drop-hint">${hint}</span><span class="doc-drop-file" hidden></span></label>`; }
function bindDrop(input) { input.onchange = () => { const f = input.files[0], box = input.closest('.doc-drop'), n = box.querySelector('.doc-drop-file'); box.classList.toggle('has-file', !!f); n.hidden = !f; n.textContent = f ? '✓ ' + f.name : ''; }; }
function toolInsurerSelect(name, selected = '') { return `<select name="${name}"><option value="">Neviem / neuvedená</option>${AUDIT_INSURERS.map(i => `<option ${i === selected ? 'selected' : ''}>${tEsc(i)}</option>`).join('')}</select>`; }

// Read one document with the existing audit extraction (counts toward the e-mail's daily document limit).
async function toolExtract(file, type, say) {
 let source = file;
 if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
  if (file.size > 50 * 1024 * 1024) throw Error('PDF môže mať najviac 50 MB.');
  say('Hľadám v dokumente zmluvu…');
  const a = await analyzePdf(file);
  if (a.needsChoice) { const from = a.from, to = Math.min(a.to, from + MAX_SEND_PAGES - 1); source = await slicePdf(file, from, to); }
 }
 say('Čítam dokument…');
 const prepared = await prepareAuditFile(source);
 const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(prepared); });
 const r = await fetch(TOOL_API + '/public/extract', { method: 'POST', credentials: 'omit', signal: AbortSignal.timeout(80000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, mime: prepared.type, data, consent: true, session: auditSession?.token }) });
 if (!r.ok) { const d = await r.json().catch(() => ({})); if (d.error === 'unverified') saveSession(null); const e = Error(toolMsg(d.error, 'Dokument sa nepodarilo prečítať.')); e.code = d.error; throw e; }
 const out = await r.json(); if (!Array.isArray(out.fields)) throw Error('Dokument sa nepodarilo prečítať.');
 return out;
}
async function toolConditions(type, insurer) {
 if (!insurer || insurer === 'Iná') return [];
 try { const r = await fetch(TOOL_API + '/conditions?type=' + encodeURIComponent(type) + '&insurer=' + encodeURIComponent(insurer), { credentials: 'omit' }); return r.ok ? await r.json() : []; } catch { return []; }
}
function pickConditions(list, fields, max = 2) {
 const norm = s => String(s || '').toLowerCase().replace(/\s+/g, '');
 const ref = (fields || []).filter(f => /^poistné podmienky/i.test(f.label)).map(f => f.value).join(' ');
 const hit = list.filter(c => c.code && ref && norm(ref).includes(norm(c.code)));
 if (hit.length) return hit.slice(0, max).map(c => c.id);
 return [...list].sort((a, b) => String(b.validFrom || '').localeCompare(String(a.validFrom || ''))).slice(0, 1).map(c => c.id);
}
// Ensure a verified e-mail before running AI; renders the existing gate into box.
function toolNeedSession(box, done, intro) { if (auditSession) { done(); return; } box.hidden = false; verifyGate(box, () => { box.innerHTML = ''; box.hidden = true; done(); }, intro); }
function toolHandoff(topic, getText, lead) {
 const id = 'ho-' + Math.random().toString(36).slice(2, 8);
 return { html: `<form class="contact-form tool-handoff" id="${id}"><h3>${lead}</h3><p>Pošleme Alexandre tento prehľad a ozve sa vám, spravidla do jedného pracovného dňa. Konzultácia je bezplatná.</p><div class="form-row"><label>Meno<input name="name" required maxlength="100" autocomplete="name"></label><label>E-mail<input name="email" type="email" required maxlength="254" autocomplete="email" value="${tEsc(auditSession?.email || '')}"></label></div><label>Telefón <span class="optional">(nepovinné)</span><input name="phone" type="tel" maxlength="30" autocomplete="tel"></label><label class="check-label"><input type="checkbox" name="ok" required><span>Súhlasím, aby Alexandra Čurillová dostala tento prehľad a kontaktovala ma. <a href="/sukromie">Ochrana údajov</a></span></label><label class="hp" aria-hidden="true">Webstránka<input name="website" tabindex="-1" autocomplete="off"></label><button class="btn" type="submit">Poslať Alexandre <span>→</span></button><p role="status"></p></form>`,
  bind(root) { const f = root.querySelector('#' + id); if (!f) return; const st = f.querySelector('[role=status]');
   f.onsubmit = async e => { e.preventDefault(); if (!f.reportValidity()) return; const b = f.querySelector('button'); b.disabled = true; st.textContent = 'Odosielam…';
    try { const r = await fetch(TOOL_API + '/contact', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.name.value, email: f.email.value, phone: f.phone.value, topic, message: topic === 'Poistná udalosť' ? 'Prosím o pomoc s poistnou udalosťou.' : 'Prosím o pomoc s porovnaním ponúk.', website: f.website.value, audit: getText().slice(0, 12000) }) });
     if (!r.ok) throw 0; f.innerHTML = '<p class="tool-sent"><b>Odoslané.</b> Alexandra sa vám ozve.</p>'; } catch { st.textContent = 'Odoslanie sa nepodarilo. Napíšte na ahoj@poistkapodlupou.sk.'; b.disabled = false; } }; } };
}
const toolConsent = text => `<label class="check-label tool-consent"><input type="checkbox" name="consent" required><span>${text} <a href="/sukromie">Ochrana osobných údajov</a></span></label>`;
const toolIntro = (eyebrow, h1, lead) => `<a class="back" href="/nastroje">← Všetky nástroje</a><div class="page-intro"><span class="eyebrow">${eyebrow}</span><h1>${h1}</h1><p>${lead}</p></div>`;

/* ---------- 1. Claim helper ---------- */
function claimPage() { return `<div class="page-shell wrap tool-page">${toolIntro('Pomocník pri poistnej udalosti', 'Stalo sa niečo?<br><em>Poradíme, čo ďalej.</em>', 'Vyberte, čo sa stalo, a krátko to opíšte. Ak nahráte zmluvu, zistíme z nej a z poistných podmienok, či je udalosť krytá, do kedy ju nahlásiť a čo si pripraviť. Zadarmo.')}<div class="tool-sos" role="note"><b>Ide o ohrozenie života alebo zdravia?</b> Volajte <a href="tel:112">112</a>. Pri nehode so zranením alebo väčšou škodou aj políciu <a href="tel:158">158</a>.</div><div id="claim-flow"></div></div>`; }
function bindClaim() {
 const root = document.querySelector('#claim-flow'); if (!root) return;
 let ev = null, result = null, fields = [], insurer = '';
 const top = () => root.scrollIntoView({ behavior: 'smooth', block: 'start' });
 function choose() {
  root.innerHTML = `<h2 class="tool-h">Čo sa stalo?</h2><div class="quick-grid audit-grid claim-grid">${CLAIM_EVENTS.map(([id, t, d, , art], i) => `<button type="button" class="product-tile tile-${i % 6}" data-ev="${id}"><span class="tile-art"><img src="assets/${art}.svg" alt="" width="300" height="200"></span><span class="tile-copy"><span class="tile-title">${t}</span><span class="tile-desc">${d}</span><span>Pokračovať <b aria-hidden="true">→</b></span></span></button>`).join('')}</div>`;
  root.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => { ev = CLAIM_EVENTS.find(e => e[0] === b.dataset.ev); form(); top(); });
 }
 function form() {
  const [, title, , type, , example] = ev;
  root.innerHTML = `<div class="audit-step"><button class="audit-back" type="button">← Iná udalosť</button><h3>${title}</h3><div class="gate-box" hidden></div><form class="contact-form claim-form">
   <label>Čo sa stalo? <span class="optional">(stručne, bez mien a rodných čísel)</span><textarea name="description" required minlength="10" maxlength="1000" rows="4" placeholder="${tEsc(example)}"></textarea></label>
   <label>Poisťovňa ${ev[0] === 'auto-cudzia' ? 'vinníka' : ''} <span class="optional">(ak ju poznáte)</span>${toolInsurerSelect('insurer')}</label>
   ${ev[0] === 'auto-cudzia' ? '<p class="note">Škodu uplatňujete z PZP vodiča, ktorý ju spôsobil. Vašu zmluvu netreba, ak ste však nahlásili aj svoje KASKO, môžete pokračovať cez „Poškodené moje auto“.</p>' : toolDrop('file', 'Pridať svoju zmluvu (odporúčame)', 'Bez nej poradíme len všeobecne. PDF alebo fotka.')}
   <div class="claim-conds" hidden></div>
   ${toolConsent('Súhlasím so spracovaním opisu' + (ev[0] === 'auto-cudzia' ? '' : ' a zmluvy') + ' umelou inteligenciou na vytvorenie prehľadu. Nič neukladáme.')}
   <button class="btn" type="submit">Čo mám robiť? <span>→</span></button><p role="status" class="tool-status"></p></form></div>`;
  root.querySelector('.audit-back').onclick = () => { choose(); top(); };
  const f = root.querySelector('form'), st = f.querySelector('[role=status]'), gate = root.querySelector('.gate-box'), condBox = f.querySelector('.claim-conds');
  if (f.file) bindDrop(f.file);
  let touched = false;
  async function refreshConds(flds) { const list = await toolConditions(type, f.insurer.value); if (!list.length) { condBox.hidden = true; condBox.innerHTML = ''; return; } const picked = new Set(pickConditions(list, flds)); condBox.hidden = false; condBox.innerHTML = `<p class="note"><b>Poistné podmienky z našej knižnice</b> (vyberte najviac 2, ktoré sa týkajú vašej zmluvy):</p>${list.map(c => `<label class="check-label"><input type="checkbox" value="${tEsc(c.id)}" ${picked.has(c.id) ? 'checked' : ''}><span><b>${tEsc(c.code || 'bez označenia')}</b> · ${tEsc(c.title.slice(0, 90))}${c.validFrom ? ' · od ' + tEsc(c.validFrom.split('-').reverse().join('. ')) : ''}</span></label>`).join('')}`; condBox.querySelectorAll('input').forEach(i => i.onchange = () => { touched = true; if (condBox.querySelectorAll('input:checked').length > 2) i.checked = false; }); }
  f.insurer.onchange = () => { touched = false; refreshConds(fields); };
  f.onsubmit = e => { e.preventDefault(); if (!f.reportValidity()) return; toolNeedSession(gate, run, 'Pred spustením pomocníka overíme váš e-mail. Pošleme vám 6-miestny kód, overenie platí 24 hodín.'); };
  async function run() {
   const btn = f.querySelector('button[type=submit]'); btn.disabled = true; st.textContent = '';
   try {
    insurer = f.insurer.value; fields = [];
    const file = f.file && f.file.files[0];
    if (file) { const x = await toolExtract(file, type, t => st.textContent = t); fields = x.fields; if (!insurer && x.insurer && x.insurer !== 'Iná') { insurer = x.insurer; f.insurer.value = insurer; } if (!touched) await refreshConds(fields); }
    else if (!touched && f.insurer.value) await refreshConds([]);
    st.textContent = 'Pripravujem postup podľa zmluvy a podmienok…';
    const conditionsIds = [...condBox.querySelectorAll('input:checked')].map(i => i.value);
    const r = await fetch(TOOL_API + '/public/claim', { method: 'POST', credentials: 'omit', signal: AbortSignal.timeout(90000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, insurer, event: title + (ev[0] === 'auto-cudzia' ? ' (škodu uplatňujem z PZP vinníka)' : ''), description: f.description.value, fields: fields.map(x => ({ label: x.label, value: x.value, page: x.page })), conditionsIds, consent: true, session: auditSession?.token }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); if (d.error === 'unverified') { saveSession(null); toolNeedSession(gate, run); return; } throw Error(toolMsg(d.error)); }
    result = await r.json(); show(f.description.value); top();
   } catch (err) { st.textContent = err.message || 'Nepodarilo sa to.'; } finally { btn.disabled = false; }
  }
 }
 function show(description) {
  const r = result, [label, cls] = CLAIM_VERDICT[r.assessment] || CLAIM_VERDICT.nejasne;
  const text = () => [`Udalosť: ${ev[1]}`, `Opis: ${description}`, `Poisťovňa: ${insurer || 'neuvedená'}`, `Posúdenie: ${label} – ${r.assessmentText}`, `Lehota: ${r.deadline}`, '', 'Kroky:', ...r.steps.map((s, i) => `${i + 1}. ${s}`), '', 'Doklady:', ...r.documents.map(s => '- ' + s), '', 'Pozor:', ...r.watch.map(s => '- ' + s), '', 'Limity:', ...r.limits.map(s => '- ' + s), '', 'Zdroje: ' + r.sources.join('; ')].join('\n');
  const ho = toolHandoff('Poistná udalosť', text, r.handoff ? 'Táto situácia si zaslúži osobný pohľad. Pomôže vám Alexandra.' : 'Chcete, aby vám s hlásením pomohla Alexandra?');
  root.innerHTML = `<div class="tool-result claim-result">
   <div class="verdict ${cls}"><span class="verdict-badge">${label}</span><p>${tEsc(r.assessmentText)}</p><small>Orientačné posúdenie. O plnení rozhoduje poisťovňa po nahlásení a prešetrení.${!r.withContract && !r.withConditions ? ' Bez zmluvy a podmienok je posúdenie len všeobecné.' : ''}</small></div>
   <div class="tool-cards">
    <section class="tool-card wide"><h3><span>1</span> Čo urobiť teraz</h3>${tList(r.steps, 'ol')}</section>
    <section class="tool-card"><h3><span>⏱</span> Do kedy nahlásiť</h3><p>${tEsc(r.deadline)}</p></section>
    <section class="tool-card"><h3><span>✓</span> Pripravte si</h3>${r.documents.length ? `<div class="tool-checks">${r.documents.map(d => `<label class="check-label"><input type="checkbox"><span>${tEsc(d)}</span></label>`).join('')}</div>` : tList([])}</section>
    <section class="tool-card"><h3><span>€</span> Limity a spoluúčasť</h3>${tList(r.limits)}</section>
    <section class="tool-card"><h3><span>!</span> Na čo si dať pozor</h3>${tList(r.watch)}</section>
   </div>
   <section class="tool-card report"><h3><span>✎</span> Návrh hlásenia škody</h3><p class="note">Doplňte údaje v [zátvorkách] a pošlite poisťovni cez jej formulár, e-mail alebo telefonicky.</p><textarea rows="8">${tEsc(r.report)}</textarea><button class="btn secondary" type="button" id="copy-report">Kopírovať text</button></section>
   ${r.sources.length ? `<p class="ask-src">Zdroje: ${r.sources.map(tEsc).join(' · ')}</p>` : ''}
   <p class="result-tools">${printBtn()}</p>
   ${ho.html}
   <button class="audit-back" type="button" id="claim-again">← Riešiť inú udalosť</button></div>`;
  ho.bind(root);
  root.querySelector('#copy-report').onclick = e => { const t = root.querySelector('.report textarea'); navigator.clipboard?.writeText(t.value).then(() => { e.target.textContent = 'Skopírované ✓'; }).catch(() => { t.select(); }); };
  root.querySelector('#claim-again').onclick = () => { result = null; choose(); top(); };
 }
 choose();
}

/* ---------- 2. Compare two contracts ---------- */
function comparePage() { return `<div class="page-shell wrap tool-page">${toolIntro('Porovnanie zmlúv', 'Nová ponuka<br><em>vedľa tej starej.</em>', 'Nahrajte svoju súčasnú zmluvu a novú ponuku. Prehľadne ukážeme, čo by ste prechodom získali, čo stratili a čo si treba overiť. Zadarmo a nezáväzne.')}<div id="compare-flow"></div></div>`; }
function bindCompare() {
 const root = document.querySelector('#compare-flow'); if (!root) return;
 let type = null, A = null, B = null, result = null;
 const top = () => root.scrollIntoView({ behavior: 'smooth', block: 'start' });
 function choose() {
  root.innerHTML = `<h2 class="tool-h">Aké poistenie porovnávate?</h2><div class="quick-grid audit-grid">${AUDIT_ORDER.map(([id, title, desc, art], i) => `<button type="button" class="product-tile tile-${i}" data-type="${id}"><span class="tile-art"><img src="assets/${art}.svg" alt="" width="300" height="200"></span><span class="tile-copy"><span class="tile-title">${title}</span><span class="tile-desc">${desc}</span><span>Porovnať <b aria-hidden="true">→</b></span></span></button>`).join('')}</div>`;
  root.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { type = b.dataset.type; form(); top(); });
 }
 function form() {
  root.innerHTML = `<div class="audit-step"><button class="audit-back" type="button">← Iné poistenie</button><h3>${AUDIT_TYPES[type].title} · porovnanie</h3><div class="gate-box" hidden></div><form class="contact-form compare-form"><div class="compare-drops">${toolDrop('current', 'Súčasná zmluva', 'PDF alebo fotka zmluvy, ktorú máte teraz')}${toolDrop('offer', 'Nová ponuka', 'Návrh zmluvy alebo ponuka z inej poisťovne')}</div>
   <p class="note">Nahrajte anonymizované dokumenty bez mien a rodných čísel. Každý dokument sa počíta do denného limitu čítania (4 za deň).</p>
   ${toolConsent('Súhlasím so spracovaním oboch dokumentov umelou inteligenciou na vytvorenie porovnania. Dokumenty neukladáme.')}
   <button class="btn" type="submit">Porovnať <span>→</span></button><p role="status" class="tool-status"></p></form></div>`;
  root.querySelector('.audit-back').onclick = () => { choose(); top(); };
  const f = root.querySelector('form'), st = f.querySelector('[role=status]'), gate = root.querySelector('.gate-box');
  bindDrop(f.current); bindDrop(f.offer);
  f.onsubmit = e => { e.preventDefault(); if (!f.reportValidity()) return; if (!f.current.files[0] || !f.offer.files[0]) { st.textContent = 'Pridajte oba dokumenty.'; return; } toolNeedSession(gate, run, 'Pred porovnaním overíme váš e-mail. Pošleme vám 6-miestny kód, overenie platí 24 hodín.'); };
  async function run() {
   const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
   try {
    if (!A) A = await toolExtract(f.current.files[0], type, t => st.textContent = 'Súčasná zmluva: ' + t.toLowerCase());
    if (!B) B = await toolExtract(f.offer.files[0], type, t => st.textContent = 'Nová ponuka: ' + t.toLowerCase());
    if (A.fields.length < 2 || B.fields.length < 2) throw Error('Z niektorého dokumentu sa nepodarilo prečítať dosť údajov. Skúste lepšiu fotku alebo PDF.');
    st.textContent = 'Porovnávam…';
    const side = x => ({ insurer: x.insurer && x.insurer !== 'Iná' ? x.insurer : '', fields: x.fields.map(v => ({ label: v.label, value: v.value, page: v.page })) });
    const r = await fetch(TOOL_API + '/public/compare', { method: 'POST', credentials: 'omit', signal: AbortSignal.timeout(90000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, current: side(A), offer: side(B), consent: true, session: auditSession?.token }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); if (d.error === 'unverified') { saveSession(null); toolNeedSession(gate, run); return; } throw Error(toolMsg(d.error)); }
    result = await r.json(); show(); top();
   } catch (err) { st.textContent = err.message || 'Nepodarilo sa to.'; } finally { btn.disabled = false; }
  }
  f.current.addEventListener('change', () => { A = null; }); f.offer.addEventListener('change', () => { B = null; });
 }
 function show() {
  const r = result, mismatch = A.documentType && B.documentType && A.documentType !== B.documentType && A.documentType !== 'ine' && B.documentType !== 'ine';
  const text = () => [`Druh: ${AUDIT_TYPES[type].title}`, `Súčasná: ${A.insurer || '-'}, ponuka: ${B.insurer || '-'}`, '', r.summary, '', ...r.rows.map(x => `${x.topic}: ${x.current} → ${x.offer} (${DIFF_LABEL[x.difference][0]})`), '', 'Získa: ' + r.gains.join('; '), 'Stratí: ' + r.losses.join('; '), 'Overiť: ' + r.check.join('; ')].join('\n');
  const ho = toolHandoff('Porovnanie ponúk', text, 'Rozhodnutie s vami rada prejde Alexandra.');
  const fieldsTable = x => `<table class="legal-table"><tbody>${x.fields.map(v => `<tr><th scope="row">${tEsc(v.label)}</th><td>${tEsc(v.value)}</td><td>str.&nbsp;${v.page}</td></tr>`).join('')}</tbody></table>`;
  root.innerHTML = `<div class="tool-result compare-result">
   ${mismatch ? `<div class="type-mismatch warn"><p><b>Pozor:</b> dokumenty vyzerajú ako rôzne druhy poistenia (${tEsc(AUDIT_TYPES[A.documentType]?.title)} a ${tEsc(AUDIT_TYPES[B.documentType]?.title)}). Porovnanie môže byť nepresné.</p></div>` : ''}
   <div class="verdict mid"><span class="verdict-badge">Čo sa zmení</span><p>${tEsc(r.summary)}</p><small>Porovnanie vychádza z údajov prečítaných z dokumentov. Neodporúčame, ktorú zmluvu zvoliť; záväzné sú zmluvy a poistné podmienky.</small></div>
   <div class="compare-table" role="table" aria-label="Porovnanie zmlúv"><div class="ct-row ct-head" role="row"><span role="columnheader">Téma</span><span role="columnheader">Súčasná${A.insurer && A.insurer !== 'Iná' ? ' · ' + tEsc(A.insurer) : ''}</span><span role="columnheader">Ponuka${B.insurer && B.insurer !== 'Iná' ? ' · ' + tEsc(B.insurer) : ''}</span><span role="columnheader">Rozdiel</span></div>${r.rows.map(x => { const [l, c] = DIFF_LABEL[x.difference] || DIFF_LABEL.nejasne; return `<div class="ct-row" role="row"><b role="cell">${tEsc(x.topic)}</b><span role="cell" data-l="Súčasná">${tEsc(x.current)}</span><span role="cell" data-l="Ponuka">${tEsc(x.offer)}</span><span role="cell"><i class="diff ${c}">${l}</i></span></div>`; }).join('')}</div>
   <div class="tool-cards"><section class="tool-card"><h3><span>+</span> Prechodom by ste získali</h3>${tList(r.gains)}</section><section class="tool-card"><h3><span>−</span> Prechodom by ste stratili</h3>${tList(r.losses)}</section><section class="tool-card wide"><h3><span>?</span> Pred rozhodnutím overte</h3>${tList(r.check)}</section></div>
   <details class="ov-details"><summary>Údaje prečítané zo súčasnej zmluvy (${A.fields.length})</summary>${fieldsTable(A)}</details><details class="ov-details"><summary>Údaje prečítané z ponuky (${B.fields.length})</summary>${fieldsTable(B)}</details>
   <p class="result-tools">${printBtn()}</p>
   ${ho.html}<button class="audit-back" type="button" id="compare-again">← Porovnať iné zmluvy</button></div>`;
  ho.bind(root);
  root.querySelector('#compare-again').onclick = () => { A = B = result = null; choose(); top(); };
 }
 choose();
}

/* ---------- 3. Ask the conditions (library) ---------- */
function conditionsAskPage() { return `<div class="page-shell wrap tool-page">${toolIntro('Opýtajte sa podmienok', 'Čo presne kryje<br><em>vaša poisťovňa?</em>', 'Vyberte poisťovňu a produkt a spýtajte sa čokoľvek, napríklad či kryje sklo, lyžovanie alebo vytopenie od suseda. Odpoveď hľadáme priamo vo všeobecných poistných podmienkach a uvedieme článok, kde to nájdete.')}<div id="cond-ask"></div></div>`; }
function bindConditionsAsk() {
 const root = document.querySelector('#cond-ask'); if (!root) return;
 root.innerHTML = '<p class="note">Načítavam knižnicu podmienok…</p>';
 fetch(TOOL_API + '/conditions', { credentials: 'omit' }).then(r => r.ok ? r.json() : []).catch(() => []).then(all => {
  if (!all.length) { root.innerHTML = '<div class="info">Knižnicu podmienok práve napĺňame. Zatiaľ sa môžete opýtať priamo nás cez <a href="/kontakt">kontakt</a>.</div>'; return; }
  const types = AUDIT_ORDER.map(o => o[0]).filter(t => all.some(c => c.type === t));
  let type = types[0], insurer = '', docId = '', qa = [];
  const overview = types.map(t => `<li><b>${AUDIT_TYPES[t].title}:</b> ${[...new Set(all.filter(c => c.type === t).map(c => c.insurer))].map(tEsc).join(', ')}</li>`).join('');
  root.innerHTML = `<div class="cond-ask-grid"><form class="contact-form cond-pick"><h3>1. Vyberte podmienky</h3><label>Druh poistenia<select name="type">${types.map(t => `<option value="${t}">${AUDIT_TYPES[t].title}</option>`).join('')}</select></label><label>Poisťovňa<select name="insurer"></select></label><div class="cond-docs"></div><details class="ov-details"><summary>Čo máme v knižnici</summary><ul class="cond-overview">${overview}</ul></details></form>
   <div class="cond-chat"><h3>2. Opýtajte sa</h3><div class="gate-box" hidden></div><div class="ask-log" aria-live="polite"></div><div class="ask-chips"></div><form class="ask-form cond-ask-form"><input id="cq" name="q" aria-label="Vaša otázka" maxlength="500" required minlength="3" placeholder="Napríklad: Kryje to škodu na skle?" autocomplete="off"><button class="btn" type="submit">Opýtať sa</button>${toolConsent('Súhlasím so spracovaním otázky umelou inteligenciou.')}</form><p class="note">Odpoveď je orientačná a vychádza len z vybraných podmienok. Vaša konkrétna zmluva môže mať iné pripoistenia či limity – na to slúži <a href="/audit">audit poistky</a>.</p></div></div>`;
  const pick = root.querySelector('.cond-pick'), docs = root.querySelector('.cond-docs'), log = root.querySelector('.ask-log'), chips = root.querySelector('.ask-chips'), askForm = root.querySelector('.ask-form'), gate = root.querySelector('.gate-box');
  function fillInsurers() { const ins = [...new Set(all.filter(c => c.type === type).map(c => c.insurer))].sort(); pick.insurer.innerHTML = ins.map(i => `<option>${tEsc(i)}</option>`).join(''); insurer = ins[0]; fillDocs(); }
  function fillDocs() { const list = all.filter(c => c.type === type && c.insurer === insurer).sort((a, b) => String(b.validFrom || '').localeCompare(String(a.validFrom || ''))); docId = list[0]?.id || ''; docs.innerHTML = `<fieldset><legend>Dokument</legend>${list.map((c, i) => `<label class="check-label"><input type="radio" name="doc" value="${tEsc(c.id)}" ${i ? '' : 'checked'}><span><b>${tEsc(c.code || 'bez označenia')}</b> · ${tEsc(c.title.slice(0, 90))}${c.validFrom ? ' · od ' + tEsc(c.validFrom.split('-').reverse().join('. ')) : ''}</span></label>`).join('')}</fieldset>`; docs.querySelectorAll('input').forEach(i => i.onchange = () => { docId = i.value; qa = []; log.innerHTML = ''; }); chips.innerHTML = (COND_SUGGEST[type] || []).map(q => `<button type="button" class="ask-chip">${tEsc(q)}</button>`).join(''); chips.querySelectorAll('button').forEach(b => b.onclick = () => { askForm.q.value = b.textContent; askForm.requestSubmit(); }); qa = []; log.innerHTML = ''; }
  pick.type.onchange = () => { type = pick.type.value; fillInsurers(); };
  pick.insurer.onchange = () => { insurer = pick.insurer.value; fillDocs(); };
  fillInsurers();
  const bubble = (cls, text, extra = '') => { const d = document.createElement('div'); d.className = 'ask-msg ' + cls; const p = document.createElement('p'); p.textContent = text; d.append(p); if (extra) d.insertAdjacentHTML('beforeend', extra); log.append(d); d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return d; };
  askForm.onsubmit = e => { e.preventDefault(); if (!askForm.reportValidity()) return; toolNeedSession(gate, ask, 'Otázky k podmienkam sú dostupné po overení e-mailu. Pošleme vám 6-miestny kód, overenie platí 24 hodín.'); };
  async function ask() {
   const question = askForm.q.value.trim(); if (!question || !docId) return; const btn = askForm.querySelector('button'); btn.disabled = true; askForm.q.value = '';
   bubble('me', question); const wait = bubble('ai pending', 'Hľadám v podmienkach…');
   try { const r = await fetch(TOOL_API + '/public/ask', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, insurer, question, fields: [], history: qa.slice(-4), conditionsIds: [docId], consent: true, session: auditSession?.token }) });
    wait.remove();
    if (r.ok) { const d = await r.json(); qa.push({ q: question, a: d.answer }); bubble('ai', d.answer, (d.sources.length ? `<small class="ask-src">Zdroj: ${d.sources.map(tEsc).join(' · ')}</small>` : '') + (d.handoff ? '<a class="ask-handoff" href="/kontakt">Prebrať s Alexandrou →</a>' : '')); }
    else { const d = await r.json().catch(() => ({})); if (d.error === 'unverified') { saveSession(null); bubble('ai err', 'Overenie e-mailu vypršalo. Overte ho prosím znova.'); toolNeedSession(gate, () => { }); } else bubble('ai err', toolMsg(d.error, 'Odpoveď sa nepodarilo získať. Skúste to znova.')); }
   } catch { wait.remove(); bubble('ai err', 'Odpoveď sa nepodarilo získať. Skúste to znova.'); } finally { btn.disabled = false; }
  }
 });
}


/* ---------- 4. Sum insured calculator (no AI, runs in the browser) ---------- */
const HOME_ITEMS = [['furniture', 'Nábytok a bytové doplnky'], ['kitchen', 'Kuchyňa a spotrebiče'], ['electronics', 'Elektronika (TV, počítače, telefóny)'], ['clothes', 'Oblečenie a obuv'], ['sport', 'Športové vybavenie a bicykle'], ['valuables', 'Šperky, hodinky a cennosti'], ['other', 'Ostatné (knihy, náradie, hračky…)']];
function sumPage() { return `<div class="page-shell wrap tool-page">${toolIntro('Kalkulačka poistnej sumy', 'Nie ste<br><em>podpoistení?</em>', 'Najčastejšia chyba pri poistení bývania je príliš nízka poistná suma. Pri škode vám poisťovňa potom vyplatí len časť. Za dve minúty si spočítate, na koľko by mal byť váš domov poistený. Počíta sa iba vo vašom prehliadači.')}<div class="sum-grid">
 <form class="contact-form sum-form" id="sum-form" autocomplete="off">
  <fieldset class="sum-tabs"><legend>Čo počítate?</legend><label><input type="radio" name="what" value="building" checked><span>Nehnuteľnosť (stavba)</span></label><label><input type="radio" name="what" value="contents"><span>Domácnosť (veci)</span></label></fieldset>
  <div data-part="building"><div class="form-row"><label>Typ<select name="kind"><option value="flat">Byt</option><option value="house">Rodinný dom</option></select></label><label>Podlahová plocha (m²)<input name="area" type="number" inputmode="numeric" min="10" max="2000" value="70"></label></div>
   <label>Náklady na výstavbu (€/m²)<input name="rate" type="number" inputmode="numeric" min="300" max="6000" value="1600"></label><p class="note">Koľko by stálo postaviť rovnakú stavbu znova, nie trhová cena bytu. Orientačne 1 300 – 2 200 € za m² podľa štandardu; presnú hodnotu môže uviesť stavebný rozpočet alebo znalecký posudok.</p>
   <label>Garáž, plot a vedľajšie stavby (€) <span class="optional">(nepovinné)</span><input name="extra" type="number" inputmode="numeric" min="0" max="2000000" value="0"></label></div>
  <div data-part="contents" hidden><p class="note">Odhadnite, koľko by stálo kúpiť veci znova ako nové. Prejdite si v duchu miestnosť po miestnosti.</p>${HOME_ITEMS.map(([k, l]) => `<label>${l} (€)<input name="${k}" type="number" inputmode="numeric" min="0" max="1000000" value="0"></label>`).join('')}</div>
  <label class="sum-current">Poistná suma vo vašej zmluve (€) <span class="optional">(ak ju poznáte)</span><input name="current" type="number" inputmode="numeric" min="0" max="5000000" placeholder="napríklad 80000"></label>
 </form>
 <aside class="sum-result" aria-live="polite"><span class="eyebrow">Odporúčaná poistná suma</span><strong id="sum-total">–</strong><p id="sum-hint"></p><div id="sum-gap"></div><div class="sum-cta"><a class="btn" href="/audit">Skontrolovať moju zmluvu <span>→</span></a><a class="text-link" href="/kontakt">Poradiť sa s Alexandrou →</a></div></aside></div>
 <section class="reading-body sum-explain"><h2>Prečo na poistnej sume záleží</h2><p>Ak je poistná suma nižšia ako skutočná hodnota, hovoríme o podpoistení. Poisťovňa potom môže plnenie znížiť v rovnakom pomere: pri poistnej sume 60 000 € a skutočnej hodnote 100 000 € dostanete zo škody 10 000 € len približne 6 000 €. Niektoré zmluvy toto krátenie nepoužívajú, napríklad pri poistení na prvé riziko alebo keď sa ho poisťovňa vzdá. Ako to je vo vašej zmluve, zistíte v poistných podmienkach.</p><h2>Nehnuteľnosť alebo domácnosť?</h2><p>Nehnuteľnosť sú steny, strecha, podlahy a pevne zabudované veci. Domácnosť sú hnuteľné veci, ktoré by ste pri sťahovaní zobrali so sebou. Každá má vlastnú poistnú sumu.</p><p>Hodnoty si raz za pár rokov preverte, najmä po rekonštrukcii alebo väčších nákupoch.</p></section></div>`; }
function bindSum() {
 const f = document.querySelector('#sum-form'); if (!f) return;
 const eur = n => Math.round(n).toLocaleString('sk-SK') + ' €', num = n => Math.max(0, Number(f[n]?.value) || 0);
 const calc = () => {
  const what = f.what.value; f.querySelectorAll('[data-part]').forEach(p => p.hidden = p.dataset.part !== what);
  const total = what === 'building' ? num('area') * num('rate') + num('extra') : HOME_ITEMS.reduce((a, [k]) => a + num(k), 0);
  document.querySelector('#sum-total').textContent = total ? eur(Math.ceil(total / 1000) * 1000) : '–';
  document.querySelector('#sum-hint').textContent = what === 'building' ? 'Cena znovupostavenia stavby. Pozemok sa nepoisťuje.' : 'Hodnota vecí v novom stave.';
  const cur = num('current'), gap = document.querySelector('#sum-gap');
  if (!cur || !total) { gap.innerHTML = ''; return; }
  const ratio = cur / total;
  gap.innerHTML = ratio > 1.25 ? `<p class="sum-low"><b>Poistná suma ${eur(cur)} je výrazne vyššia ako odhad.</b> Poisťovňa vyplatí najviac skutočnú škodu, takže môžete platiť zbytočne vysoké poistné. Skontrolujte, či odhad zahŕňa všetko.</p>` : ratio >= 0.97 ? `<p class="sum-ok">✓ Vaša poistná suma ${eur(cur)} zodpovedá odhadu.</p>` : `<p class="sum-low"><b>Možné podpoistenie: ${Math.round((1 - ratio) * 100)} %.</b> Pri škode 10 000 € by ste mohli dostať približne ${eur(10000 * ratio)}.</p>`;
 };
 f.oninput = calc; f.onchange = calc;
 f.kind.onchange = () => { f.rate.value = f.kind.value === 'house' ? 1700 : 1600; calc(); };
 calc();
}

function bindTools() { bindClaim(); bindCompare(); bindConditionsAsk(); bindSum(); }
