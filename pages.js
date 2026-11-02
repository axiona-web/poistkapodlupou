/* Dedicated pages: editorial advice, calculator slots, contact preview. */
// The a= attribution supplied for embeds is separate from insurance kod=.
const FINPORTAL_EMBED = {origin:'https://iframe.finportal.app', attribution:'5956', script:'https://iframe.finportal.app/scripts.js'};
// Legal identity of the intermediaries shown on the site (NBS register).
const INTERMEDIARIES={
 poistenie:{name:'Mgr. Alexandra Čurillová, s.\u00a0r.\u00a0o.',ico:'54913748',seat:'Hutnícka 2715/14, 052 01 Spišská Nová Ves',reg:'273149',sectors:['poistenie alebo zaistenie']},
 financie:{name:'Ing. Martin Dominik s.r.o.',ico:'36597961',seat:'Za Kaštieľom 1308/2, 053 11 Smižany',reg:'281061',sectors:['poistenie alebo zaistenie','poskytovanie úverov, úverov na bývanie a spotrebiteľských úverov','kapitálový trh','doplnkové dôchodkové sporenie','starobné dôchodkové sporenie']},
 proposer:{name:'Finportal, a. s.',reg:'119713'}
};
const financeIntermediaryNote=()=>{const f=INTERMEDIARIES.financie;return `<div class="intermediary-note" role="note"><b>Kto vám tu pomáha?</b><p>Finančné kalkulačky (hypotéky, úvery, sporenie a dôchodok) sprostredkúva <strong>${f.name}</strong>, IČO ${f.ico}, podriadený finančný agent zapísaný v registri NBS pod č. ${f.reg}, s navrhovateľom ${INTERMEDIARIES.proposer.name} (reg. č. ${INTERMEDIARIES.proposer.reg}). Poistenie na tomto webe sprostredkúva ${INTERMEDIARIES.poistenie.name} <a href="#/pravne">Právne informácie →</a></p></div>`};
const financeTools=[
 ['hypoteky','Porovnanie hypoték','Bývanie vo vlastnom','mortgage-comparison'],
 ['sporenie','Kalkulačka sporenia','Malé kroky k vášmu cieľu','savings-calculator'],
 ['refinancovanie','Refinancovanie','Pozrite sa na svoj úver','refinance-calculator'],
 ['uver','Úverová kalkulačka','Plány a mesačný rozpočet','loan-calculator'],
 ['dochodok','Dôchodková kalkulačka','Pohľad do budúcnosti','retirement-calculator']
];
function financeUrl(item){const url=new URL(item[3],FINPORTAL_EMBED.origin);url.searchParams.set('a',FINPORTAL_EMBED.attribution);return url.href;}
let finportalScriptPromise;
function ensureFinportalScript(){
 if(finportalScriptPromise)return finportalScriptPromise;
 finportalScriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=FINPORTAL_EMBED.script;script.id='finportal-resizer-script';script.async=true;
  // The supplied script initializes #finportal-iframe after 1500 ms.
  script.onload=()=>setTimeout(resolve,1600);
  script.onerror=()=>{script.remove();finportalScriptPromise=undefined;reject(new Error('Finportal script unavailable'));};
  document.head.append(script);
 });return finportalScriptPromise;
}
function disposeFinance(){const frame=document.getElementById('finportal-iframe');if(frame?.iFrameResizer)frame.iFrameResizer.removeListeners();}
function financePage(){return `<div class="page-shell wrap"><a class="back" href="#/">← Späť na úvod</a><div class="page-intro"><span class="eyebrow">Čísla, ktoré pomáhajú plánovať</span><h1>Dajte svojim<br>plánom <em>konkrétny tvar.</em></h1><p>Hypotéka, sporenie, refinancovanie, úver aj dôchodok. Reálne kalkulačky priamo od Finportalu.</p></div>${financeIntermediaryNote()}<div class="finance-workspace"><div class="finance-nav" role="tablist" aria-label="Finančné kalkulačky">${financeTools.map(([id,title,sub],i)=>`<button role="tab" id="tab-${id}" aria-controls="finance-panel" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-finance="${id}"><span class="tool-number">0${i+1}</span><span><b>${title}</b><small>${sub}</small></span><span aria-hidden="true">→</span></button>`).join('')}</div><div id="finance-panel" role="tabpanel" tabindex="0" aria-labelledby="tab-hypoteky"></div></div><div class="page-footnote">Hľadáte prepočet poistenia? <a href="#/">Vyberte si poistenie na úvode →</a></div></div>`}
function selectFinance(id,focus=false){
 const item=financeTools.find(t=>t[0]===id);if(!item)return;
 document.querySelectorAll('[data-finance]').forEach(b=>{const active=b.dataset.finance===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus()});
 const panel=document.querySelector('#finance-panel');
 if(panel.dataset.active===id)return;
 disposeFinance();panel.dataset.active=id;panel.setAttribute('aria-labelledby','tab-'+id);
 if (privacyChoice !== true) {
   panel.innerHTML = `<div class="embed-heading"><h2>${item[1]}</h2></div><p>Na zobrazenie kalkulačky priamo tu povoľte obsah Finportalu.</p><button class="btn" data-cookie-settings>Nastavenia cookies</button><p><a class="text-link" href="${financeUrl(item)}" target="_blank" rel="noopener noreferrer">Otvoriť kalkulačku samostatne →</a></p>`;
   return;
 }
 panel.innerHTML=`<div class="embed-heading embed-heading-slim"><a href="${financeUrl(item)}" target="_blank" rel="noopener noreferrer">Otvoriť samostatne →</a></div><p class="embed-status" role="status">Načítava sa kalkulačka…</p><div class="embed-surface"><iframe id="finportal-iframe" title="${item[1]} – Finportal" src="${financeUrl(item)}" width="100%" height="700" style="border:none" referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p class="embed-note">Kalkulačku prevádzkuje Finportal. Ak sa nezobrazí, použite odkaz „Otvoriť samostatne“. Prepnutím kalkulačky sa rozpracované údaje vymažú.</p>`;
 const frame=panel.querySelector('iframe');const status=panel.querySelector('.embed-status');
 frame.addEventListener('load',()=>{status.hidden=true},{once:true});
 ensureFinportalScript().then(()=>{if(frame.isConnected&&!frame.iFrameResizer&&typeof window.iFrameResize==='function')window.iFrameResize({checkOrigin:[FINPORTAL_EMBED.origin],scrolling:true},frame);}).catch(()=>{if(frame.isConnected){status.hidden=false;status.textContent='Automatické prispôsobenie výšky nie je dostupné. Kalkulačku môžete posúvať alebo otvoriť samostatne.'}});
}
const adviceItems=[
 ['podmienky','Základy','Najdôležitejšie nie je vždy napísané najväčším písmom.','Tri miesta, ktoré sa oplatí v podmienkach nájsť.','work',['Pozrite si výluky: určujú, na ktoré situácie sa krytie nevzťahuje.','Nájdite limity plnenia a dohodnutú spoluúčasť.','Nejasné ustanovenia si nechajte vysvetliť pred podpisom.'],true],
 ['cena','Základy','Cena je začiatok porovnania.','Čo si položiť vedľa mesačného či ročného poistného.','pzp-car',['Porovnávajte rozsah krytia, nielen cenu.','Pozrite si povinnosti poisteného a podmienky plnenia.','Zvážte, či sa dá poistenie prispôsobiť zmenám vašej situácie.'],true],
 ['auto-udaje','Auto','Prepočet auta bez hľadania papierov.','Krátka príprava pred otvorením kalkulačky.','kasko-car',['Majte poruke doklady k vozidlu.','Poznačte si požadovaný začiatok poistenia.','Pri vypĺňaní skontrolujte každý údaj podľa dokladov.'],false],
 ['byvanie','Bývanie','Domov je viac než adresa.','Otázky, s ktorými začať pri poistení bývania.','home',['Chcete riešiť budovu, vybavenie alebo oboje?','Zmenilo sa od poslednej zmluvy vybavenie či využitie bývania?','Ktorým častiam súčasnej zmluvy nerozumiete? Spíšte si ich.'],false],
 ['cesta','Cestovanie','Pred cestou si zbaľte aj informácie.','Malý organizačný zoznam pred odchodom.','travel',['Uložte si kontakt na asistenčnú službu z vašich dokumentov.','Majte dostupné číslo poistnej zmluvy.','Skontrolujte, či ste pri prepočte uviedli celý termín a plánované aktivity.'],false],
 ['praca','Práca','Pracovný deň pod lupou.','Čo si ujasniť pred prepočtom zodpovednosti.','work',['Pomenujte svoju skutočnú pracovnú činnosť.','Poznačte si, či používate vozidlo alebo zverené vybavenie.','Pripravte otázky ku konkrétnym situáciám zo svojej práce.'],false],
 ['zmena','Základy','Zmenil sa život. Pozrite sa aj na poistku.','Dôvod na kontrolu, nie automaticky na zrušenie.','home',['Spíšte si zmeny v bývaní, práci a rodine.','Porovnajte ich s tým, čo chcete mať chránené.','O možnostiach úpravy sa informujte podľa konkrétnej zmluvy.'],false],
 ['dokumenty','Základy','Všetky dokumenty na jednom mieste.','Jednoduchý poriadok, ktorý neskôr oceníte.','work',['Vytvorte si priečinok so zmluvou a jej dodatkami.','Priložte verziu podmienok, na ktorú zmluva odkazuje.','Citlivé dokumenty uchovávajte na zabezpečenom mieste.'],false],
 ['vyrocie','Auto','Výročie si zaslúži miesto v kalendári.','Aby na otázky zostal čas.','pzp-car',['Poznačte si výročný deň zo zmluvy.','Samostatne si overte príslušné lehoty a postupy.','Našu automatickú pripomienku ešte pripravujeme; zatiaľ využite vlastný kalendár.'],false]
];
function adviceCard(item,i){return `<a class="journal-card" href="#/rady/${item[0]}" data-category="${item[1]}"><div class="journal-art art-${i%3}"><span class="category-tag">${item[1]}</span><img src="assets/${item[4]}.svg" alt="" width="300" height="200"></div><div class="journal-copy"><h2>${item[2]}</h2><p>${item[3]}</p><span>Krátky sprievodca <b>→</b></span></div></a>`}
function advicePage(){return `<div class="page-shell wrap"><a class="back" href="#/">← Späť na úvod</a><div class="page-intro"><span class="eyebrow">Rady pod lupou</span><h1>Menej nejasností.<br><em>Viac dobrých otázok.</em></h1><p>Krátke tipy pre auto, domov aj život. Vyberte si, čo práve riešite.</p></div><div class="journal-filters" aria-label="Filtrovať rady podľa témy">${['Všetky','Základy','Auto','Bývanie','Cestovanie','Práca'].map((t,i)=>`<button data-filter="${t}" aria-pressed="${i===0}">${t}</button>`).join('')}</div><p class="filter-count" id="filter-count" aria-live="polite">9 sprievodcov</p><div class="journal-grid">${adviceItems.map(adviceCard).join('')}</div></div>`}
function adviceDetail(id){const a=adviceItems.find(a=>a[0]===id);if(!a)return article('Článok sa nenašiel.',btn('Všetky rady','#/rady'));return `<article class="reading-page wrap"><a class="back" href="#/rady">← Všetky rady a tipy</a><div class="reading-head"><div><span class="eyebrow">${a[1]} · Praktický sprievodca</span><h1>${a[2]}</h1><p>${a[3]}</p></div><img src="assets/${a[4]}.svg" alt="" width="300" height="200"></div><ol class="reading-steps">${a[5].map((t,i)=>`<li><span>0${i+1}</span><p>${t}</p></li>`).join('')}</ol>${a[6]?'<p class="source-note">Podklad: <a href="https://nbs.sk/dohlad-nad-financnym-trhom/ofs/financne-produkty/poistenie/" target="_blank" rel="noopener noreferrer">Národná banka Slovenska – Poistenie →</a></p>':'<p class="source-note">Praktický organizačný zoznam. Konkrétne krytie a postupy vždy overte vo svojej zmluve.</p>'}<div class="reading-end"><h2>Máte vlastnú otázku?</h2>${btn('Napísať otázku','#/kontakt')}</div></article>`}
function contactPage(){return `<div class="page-shell wrap contact-layout"><a class="back" href="#/">← Späť na úvod</a><div class="contact-intro"><span class="eyebrow">Sme tu pre vaše otázky</span><h1>Čo máte <br><em>na mysli?</em></h1><p>Napíšte nám, čo potrebujete riešiť.<br>Začnime jednoduchou správou.</p><img src="assets/work.svg" alt="" width="300" height="200"><div class="contact-note"><b>Bez príloh a zbytočných údajov.</b><p>Na prvú otázku stačí pár viet. Rodné číslo, zdravotné údaje ani zmluvy sem nevkladajte.</p></div></div><form id="contact-form" class="contact-form"><h2>Napíšte nám</h2><p class="form-notice">Odpovieme spravidla do jedného pracovného dňa. Ak sa vám to hodí viac, napíšte priamo na <a href="mailto:ahoj@poistkapodlupou.sk">ahoj@poistkapodlupou.sk</a>.</p><div class="form-row"><label>Vaše meno<input name="name" autocomplete="name" required maxlength="100" placeholder="Meno a priezvisko"></label><label>E-mail<input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="vas@email.sk"></label></div><label>Telefón <span class="optional">(nepovinné)</span><input name="phone" type="tel" autocomplete="tel" maxlength="30" placeholder="+421"></label><fieldset><legend>Čo chcete riešiť?</legend><div class="topic-options">${['Auto','Bývanie','Cestovanie','Práca','Moja poistka','Úver alebo hypotéka','Iná otázka'].map((t,i)=>`<label><input type="radio" name="topic" value="${t}" ${i===0?'checked':''}><span>${t}</span></label>`).join('')}</div><p class="topic-hint">Otázky k úverom, hypotékam, sporeniu a dôchodku rieši ${INTERMEDIARIES.financie.name} Ostatné témy ${INTERMEDIARIES.poistenie.name}</p></fieldset><label>Vaša správa<textarea name="message" required minlength="10" maxlength="2000" rows="5" placeholder="S čím vám môžeme pomôcť?"></textarea></label><label class="hp" aria-hidden="true">Webstránka<input name="website" tabindex="-1" autocomplete="off"></label><p class="form-privacy">Správu použijeme iba na odpoveď vám. Nikam ju neukladáme, príde nám e-mailom. <a href="#/sukromie">Ochrana osobných údajov</a></p><button class="btn" type="submit">Odoslať správu <span>→</span></button><div id="contact-result" role="status"></div></form></div>`}
function bindPages(){
 if(document.querySelector('#finance-panel')){selectFinance('hypoteky');const tabs=[...document.querySelectorAll('[data-finance]')];tabs.forEach((b,i)=>{b.onclick=()=>selectFinance(b.dataset.finance);b.onkeydown=e=>{let n;if(['ArrowRight','ArrowDown'].includes(e.key))n=(i+1)%tabs.length;if(['ArrowLeft','ArrowUp'].includes(e.key))n=(i-1+tabs.length)%tabs.length;if(e.key==='Home')n=0;if(e.key==='End')n=tabs.length-1;if(n!==undefined){e.preventDefault();selectFinance(tabs[n].dataset.finance,true)}}})}
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));let count=0;document.querySelectorAll('.journal-card').forEach(c=>{c.hidden=b.dataset.filter!=='Všetky'&&c.dataset.category!==b.dataset.filter;if(!c.hidden)count++});document.querySelector('#filter-count').textContent=`Počet sprievodcov: ${count}`});
 const form=document.querySelector('#contact-form');if(form)form.onsubmit=async e=>{e.preventDefault();if(!form.reportValidity())return;const result=document.querySelector('#contact-result');const button=form.querySelector('button[type=submit]');const d=new FormData(form);
 const body={name:d.get('name'),email:d.get('email'),phone:d.get('phone'),topic:d.get('topic'),message:d.get('message'),website:d.get('website')};
 button.disabled=true;result.className='';result.textContent='Odosielam…';
 const fail=msg=>{result.className='err';result.innerHTML=msg+' Napíšte nám prosím priamo na <a href="mailto:ahoj@poistkapodlupou.sk">ahoj@poistkapodlupou.sk</a>.';};
 try{const r=await fetch(REVIEWS_API+'/contact',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(r.ok){form.reset();result.className='ok';result.textContent='Ďakujeme, správa je odoslaná. Ozveme sa vám čo najskôr.';}
  else if(r.status===429)fail('Dnes ste nám už poslali viac správ.');
  else if(r.status===400){const j=await r.json().catch(()=>({}));result.className='err';result.textContent={email:'Skontrolujte prosím e-mail.',phone:'Skontrolujte prosím telefónne číslo.',message:'Správa musí mať 10 až 2000 znakov.',name:'Skontrolujte prosím meno.'}[j.field]||'Skontrolujte prosím vyplnené údaje.';}
  else fail('Správu sa teraz nepodarilo odoslať.');
 }catch{fail('Spojenie zlyhalo.');}finally{button.disabled=false;}
};
 document.querySelectorAll('nav a').forEach(a=>{const active=a.hash===location.hash||(!location.hash&&a.hash==='#/');if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
}

function aboutPage(){
 const person=(initials,name,role,lead,text,tags,cta,mail)=>`<article class="person-card"><div class="person-top"><span class="person-avatar" aria-hidden="true">${initials}</span><div><span class="eyebrow">${role}</span><h3>${name}</h3></div></div><p class="person-lead">${lead}</p><p>${text}</p><ul class="person-tags">${tags.map(t=>`<li>${t}</li>`).join('')}</ul><div class="person-contact"><a class="text-link" href="mailto:${mail}">${cta} →</a><a class="person-mail" href="mailto:${mail}">${mail}</a></div></article>`;
 const steps=[['Najprv počúvame','Zaujíma nás, čo chcete chrániť a čo vás trápi. Ponuku pripravujeme až potom, na mieru vašej situácii.'],['Vysvetlíme drobné písmo','Výluky, limity, spoluúčasť, čakacie doby. Prejdeme ich s vami po lopate, aby ste presne vedeli, za čo platíte.'],['Ostávame na príjme','Aj po podpise. Keď sa niečo zmení alebo príde škoda, nezostanete na to sami.']];
 return `<div class="page-shell wrap about-page"><a class="back" href="#/">← Späť na úvod</a><div class="page-intro"><span class="eyebrow">O nás</span><h1>Poistku nestačí platiť.<br><em>Treba jej rozumieť.</em></h1><p>Veľa ľudí roky platí zmluvu, ktorú nikdy poriadne nečítali. Zistia, čo v nej je, až keď sa niečo stane. Poistka pod Lupou vznikla, aby to bolo naopak.</p></div>
 <section class="about-why"><div><h2>Prečo pod lupou?</h2></div><div><p>Pod lupu berieme presne tie časti zmluvy, ktoré rozhodujú: čo je kryté a čo nie, aké sú limity plnenia, kedy sa platí spoluúčasť a aké povinnosti máte vy. Vysvetlíme ich jednoducho, bez odborných skratiek.</p><p>Nejde nám o to predať čo najviac zmlúv. Chceme, aby ste sa rozhodovali s istotou a mali krytie, ktoré naozaj zodpovedá vášmu životu.</p></div></section>
 <section class="about-people" aria-labelledby="people-title"><h2 id="people-title">Kto stojí za Poistkou pod Lupou</h2><div class="people-grid">
 ${person('AČ','Mgr. Alexandra Čurillová','Poistenie','K poisteniu sa dostala v roku 2019, keď dostala ponuku pracovať pre Allianz. Chcela to len vyskúšať. Nadchlo ju to a klientom pomáha dodnes.','Každú ponuku pripravuje tak, akoby ju robila pre seba. Venuje sa vám individuálne a keď to potrebujete, nájde si čas aj večer či cez víkend. Pri každej zmluve si najprv overí, čo už máte, aby ste neplatili dvakrát za to isté.',['Auto · PZP a KASKO','Dom a domácnosť','Cestovné','Zodpovednosť','Životné poistenie'],'Napísať Alexandre','curillova@poistkapodlupou.sk')}
 ${person('MD','Ing. Martin Dominik, MBA, EUR ING','Úvery, hypotéky a dôchodok','K financiám prišiel z technického sveta. Ako inžinier sa naučil počítať do detailu a nič nebrať ako samozrejmosť.','Roky pracoval v poistnom poradenstve, viedol obchodný tím a založil vlastnú sprostredkovateľskú spoločnosť. Dnes pomáha s hypotékami, úvermi, sporením a dôchodkom. Prepočíta možnosti a vysvetlí, čo z nich pre vás naozaj vyplýva.',['Hypotéky a refinancovanie','Spotrebné úvery','Sporenie a investície','Dôchodkové sporenie'],'Napísať Martinovi','dominik@poistkapodlupou.sk')}
 </div></section>
 <section class="about-steps"><h2>Ako pracujeme</h2><div class="steps-grid">${steps.map(([t,d],i)=>`<div class="step-card"><span>0${i+1}</span><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></section>
 <div class="closing about-closing"><div><span class="eyebrow">Začnime jednoducho</span><h2>Viete, čo máte v zmluve?</h2><p>Pozrite sa na svoju poistku s nami, alebo nám napíšte otázku.</p></div><div class="actions">${btn('Preveriť poistku','#/audit')}${btn('Napísať nám','#/kontakt',true)}</div></div>
 <p class="about-legal">Každý z nás pôsobí ako podriadený finančný agent vo svojich sektoroch. Podrobnosti nájdete v <a href="#/pravne">právnych informáciách</a>.</p></div>`;
}

const reviewEsc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const REVIEW_AREAS=['Poistenie auta','Dom a domácnosť','Cestovné poistenie','Životné poistenie','Iné poistenie','Hypotéka alebo úver','Sporenie alebo dôchodok'];
function reviewCards(list){return list.length?`<div class="review-grid">${list.map(r=>`<figure class="review-card"><blockquote>„${reviewEsc(r.text)}“</blockquote><figcaption><b>${reviewEsc(r.name)}</b>${r.city?` · ${reviewEsc(r.city)}`:''}<span>${reviewEsc(r.area||'')}</span></figcaption></figure>`).join('')}</div>`:`<div class="review-empty"><img src="assets/life.svg" alt="" width="300" height="200"><div><h2>Prvé slová zbierame.</h2><p>Táto stránka je nová. Ak sme vám už pomohli, budeme radi, keď sa podelíte o svoju skúsenosť ako prví.</p></div></div>`}
function reviewsPage(){
 const list=(typeof REVIEWS!=='undefined'?REVIEWS:[]);
 return `<div class="page-shell wrap reviews-page"><a class="back" href="#/">← Späť na úvod</a><div class="page-intro"><span class="eyebrow">Recenzie</span><h1>Skúsenosti<br><em>našich klientov.</em></h1><p>Úprimné slová ľudí, ktorým sme pomohli vyznať sa v poistení a financiách.</p></div>
 <div id="review-list">${reviewCards(list)}</div>
 <p class="review-verify"><b>Ako recenzie overujeme:</b> zverejňujeme iba recenzie od klientov, s ktorými sme naozaj spolupracovali. Pred zverejnením overíme, že autor je náš klient. Text neupravujeme, zverejňujeme ho celý so súhlasom autora.</p>
 <section class="review-form-wrap" aria-labelledby="review-form-title"><div class="review-form-intro"><h2 id="review-form-title">Podeľte sa o skúsenosť</h2><p>Po overení recenziu zverejníme v nezmenenom znení. Zverejníme iba krstné meno, začiatočné písmeno priezviska a mesto, ak ho uvediete. Váš e-mail nezverejníme, slúži len na overenie, že ste náš klient.</p></div>
 <form id="review-form" class="contact-form" novalidate><div class="form-row"><label>Meno a začiatočné písmeno priezviska<input name="name" required minlength="2" maxlength="40" placeholder="Jana K." autocomplete="off"></label><label>Mesto <span class="optional">(nepovinné)</span><input name="city" maxlength="40" placeholder="Spišská Nová Ves"></label></div>
 <label>E-mail <span class="optional">(nezverejníme)</span><input name="email" type="email" required maxlength="254" autocomplete="email" placeholder="vas@email.sk"></label>
 <label class="hp" aria-hidden="true">Webstránka<input name="website" tabindex="-1" autocomplete="off"></label>
 <label>S čím sme vám pomohli?<select name="area" required>${REVIEW_AREAS.map(a=>`<option>${a}</option>`).join('')}</select></label>
 <label>Vaša skúsenosť<textarea name="text" required minlength="20" maxlength="600" rows="5" placeholder="Čo vám pomohlo? Ako ste boli spokojní?"></textarea></label>
 <label class="check-label"><input type="checkbox" name="client" required><span>Som klient Poistky pod Lupou a recenzia vychádza z mojej skúsenosti.</span></label>
 <label class="check-label"><input type="checkbox" name="consent" required><span>Súhlasím so zverejnením recenzie s uvedeným menom a mestom na webe poistkapodlupou.sk. Súhlas môžem kedykoľvek odvolať na ahoj@poistkapodlupou.sk. <a href="#/sukromie">Ochrana osobných údajov</a></span></label>
 <button class="btn" type="submit">Odoslať recenziu <span>→</span></button><div id="review-result" role="status" aria-live="polite"></div></form></section></div>`;
}
function bindReviews(){
 const listEl=document.querySelector('#review-list');
 if(listEl&&typeof REVIEWS_API!=='undefined'){fetch(REVIEWS_API+'/reviews',{credentials:'omit'}).then(r=>r.ok?r.json():[]).then(remote=>{if(!document.body.contains(listEl))return;const all=[...remote,...(typeof REVIEWS!=='undefined'?REVIEWS:[])];if(all.length)listEl.innerHTML=reviewCards(all);}).catch(()=>{});}
 const form=document.querySelector('#review-form');if(!form)return;
 const result=document.querySelector('#review-result');
 form.onsubmit=async e=>{e.preventDefault();if(!form.reportValidity())return;const d=new FormData(form);const button=form.querySelector('button[type=submit]');
  const body={name:d.get('name'),city:d.get('city'),email:d.get('email'),area:d.get('area'),text:d.get('text'),website:d.get('website'),client:form.client.checked,consent:form.consent.checked};
  button.disabled=true;result.className='';result.textContent='Odosielam…';
  try{const r=await fetch(REVIEWS_API+'/reviews',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(r.status===201){form.reset();result.className='ok';result.textContent='Ďakujeme! Recenziu sme prijali a po overení ju zverejníme.';}
   else if(r.status===429){result.className='err';result.textContent='Dnes už sme od vás dostali niekoľko recenzií. Skúste to prosím zajtra.';}
   else{const j=await r.json().catch(()=>({}));const msg={links:'Recenzia nemôže obsahovať odkazy na weby.',email:'Skontrolujte prosím e-mail.',text:'Recenzia musí mať 20 až 600 znakov.',name:'Skontrolujte prosím meno.'}[j.field]||'Recenziu sa nepodarilo odoslať. Skontrolujte údaje alebo nám napíšte na ahoj@poistkapodlupou.sk.';result.className='err';result.textContent=msg;}
  }catch{result.className='err';result.textContent='Spojenie zlyhalo. Skúste to znova alebo nám napíšte na ahoj@poistkapodlupou.sk.';}
  finally{button.disabled=false;}
 };
}
function reviewsAdminPage(){return `<div class="page-shell wrap review-admin"><a class="back" href="#/">← Späť na úvod</a><div class="page-intro"><span class="eyebrow">Správa recenzií</span><h1>Schvaľovanie<br><em>recenzií.</em></h1><p>Táto stránka nie je v menu. Prístup chráni tajný kľúč, ktorý sa nikam neukladá.</p></div><form id="admin-login" class="contact-form admin-login"><label>Kľúč správcu<input name="token" type="password" required minlength="32" autocomplete="current-password"></label><button class="btn" type="submit">Zobraziť recenzie <span>→</span></button><p id="admin-status" role="status"></p></form><div id="admin-list"></div></div>`}
function bindReviewsAdmin(){
 const form=document.querySelector('#admin-login');if(!form)return;let token='';
 const status=document.querySelector('#admin-status'),box=document.querySelector('#admin-list');
 async function load(){status.textContent='Načítavam…';const r=await fetch(REVIEWS_API+'/admin/reviews',{credentials:'omit',headers:{Authorization:'Bearer '+token}});
  if(r.status===401){status.textContent='Nesprávny kľúč.';box.innerHTML='';return;}if(!r.ok){status.textContent='Služba nie je dostupná ('+r.status+').';return;}
  const items=await r.json();const pending=items.filter(i=>i.status==='pending'),approved=items.filter(i=>i.status==='approved');status.textContent=`Čaká: ${pending.length} · Zverejnené: ${approved.length}`;
  const row=(i,btns)=>`<article class="admin-card"><div class="admin-meta"><b>${reviewEsc(i.name)}</b>${i.city?' · '+reviewEsc(i.city):''} · ${reviewEsc(i.area)} · ${reviewEsc(i.created.slice(0,10))}${i.email?`<br><a href="mailto:${reviewEsc(i.email)}">${reviewEsc(i.email)}</a>`:''}</div><blockquote>${reviewEsc(i.text)}</blockquote><div class="admin-actions">${btns.map(([d,l,c])=>`<button class="btn ${c}" data-id="${reviewEsc(i.id)}" data-decision="${d}">${l}</button>`).join('')}</div></article>`;
  box.innerHTML=`<h2>Čakajúce</h2>${pending.length?pending.map(i=>row(i,[['approve','Schváliť',''],['reject','Zamietnuť','secondary']])).join(''):'<p>Žiadne čakajúce recenzie.</p>'}<h2>Zverejnené</h2>${approved.length?approved.map(i=>row(i,[['delete','Odstrániť z webu','secondary']])).join(''):'<p>Zatiaľ nič.</p>'}`;
  box.querySelectorAll('[data-decision]').forEach(b=>b.onclick=async()=>{if(b.dataset.decision!=='approve'&&!confirm('Naozaj? Recenzia sa natrvalo vymaže.'))return;b.disabled=true;await fetch(REVIEWS_API+'/admin/reviews',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({id:b.dataset.id,decision:b.dataset.decision})});load();});
 }
 form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;token=form.token.value.trim();form.token.value='';load().catch(()=>{status.textContent='Spojenie zlyhalo.'});};
}

