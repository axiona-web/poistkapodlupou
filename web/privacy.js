// The only optional embedded service on this site is Finportal.
const privacyKey = 'poistka-privacy-v1';
let privacyChoice = null;
try {
  const saved = JSON.parse(localStorage.getItem(privacyKey));
  if (saved && saved.until > Date.now() && typeof saved.finportal === 'boolean') {
    privacyChoice = saved.finportal;
  }
} catch {}

function showCookieSettings() {
  const panel = document.querySelector('#cookie-panel');
  panel.hidden = false;
  panel.querySelector('button').focus();
}

function applyCookieChoice(finportal) {
  const revoke = privacyChoice === true && !finportal;
  privacyChoice = finportal;
  try {
    localStorage.setItem(privacyKey, JSON.stringify({ finportal, until: Date.now() + 180 * 86400000 }));
  } catch {}
  document.querySelector('#cookie-panel').hidden = true;
  if (revoke) {
    // Unload the provider script as well as its iframe.
    location.reload();
    return;
  }
  const panel = document.querySelector('#finance-panel');
  if (panel) {
    const active = panel.dataset.active;
    delete panel.dataset.active;
    selectFinance(active);
  }
}

const LEGAL_UPDATED='2. 11. 2026';
const legalTable=(head,rows)=>`<div class="legal-table-wrap"><table class="legal-table"><thead><tr>${head.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>i?`<td data-label="${head[i]}">${c}</td>`:`<th scope="row">${c}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;

function cookiesPage() {
  const rows=[
   ['poistka-theme','Zapamätá si svetlý alebo tmavý motív.','Nevyhnutné (vaša voľba)','Do zmeny alebo vymazania údajov prehliadača'],
   ['poistka-privacy-v1','Zapamätá si, či ste povolili kalkulačky Finportalu.','Nevyhnutné (vaša voľba)','180 dní'],
   ['Finportal (iframe a skript)','Zobrazí finančné kalkulačky priamo na stránke Kalkulačky a prispôsobí ich výšku.','Tretia strana, iba so súhlasom','Podľa pravidiel Finportalu']
  ];
  return article('Cookies a ukladanie v prehliadači', `<p class="lead">Na webe nepoužívame reklamné ani analytické cookies a nesledujeme vás. V prehliadači si ukladáme iba dve vaše voľby. Obsah tretej strany načítame až po vašom súhlase.</p>
  <h2>Čo ukladáme</h2>${legalTable(['Názov','Na čo slúži','Typ','Ako dlho'],rows)}
  <p>Obe naše položky ukladáme do lokálneho úložiska prehliadača (localStorage), nie do klasických cookies. Neodchádzajú na žiadny server a nevidíme ich.</p>
  <h2>Kalkulačky Finportalu</h2><p>Finančné kalkulačky prevádzkuje Finportal, a. s. Ak ich povolíte, prehliadač sa pri otvorení stránky Kalkulačky spojí so serverom Finportalu. Ten dostane technické údaje o pripojení vrátane IP adresy a môže používať vlastné cookies. Údaje, ktoré do kalkulačky zadáte, spracúva Finportal podľa svojich pravidiel. Ak kalkulačky nepovolíte, môžete ich otvoriť samostatným odkazom na webe Finportalu.</p>
  <h2>Partnerské odkazy na poistenie</h2><p>Dlaždice na úvode otvárajú kalkulačky Najpoistenie v novom okne. Na tom webe platia pravidlá jeho prevádzkovateľa.</p>
  <h2>Zmena alebo odvolanie súhlasu</h2><p>Svoju voľbu môžete kedykoľvek zmeniť. Odvolanie súhlasu nemá vplyv na zákonnosť načítania pred jeho odvolaním.</p><button class="btn" data-cookie-settings>Zmeniť nastavenia</button>
  <p class="legal-updated">Pravidlá vychádzajú z § 109 ods. 8 zákona č. 452/2021 Z. z. o elektronických komunikáciách. Účinné od ${LEGAL_UPDATED}. Súvisí: <a href="#/sukromie">Ochrana osobných údajov</a>.</p>`);
}

function privacyPage() {
  const P=INTERMEDIARIES.poistenie,F=INTERMEDIARIES.financie;
  const purposes=[
   ['Zobrazenie webu','IP adresa, typ prehliadača, čas požiadavky','Oprávnený záujem na bezpečnej prevádzke webu, čl. 6 ods. 1 písm. f)','Krátkodobé technické záznamy poskytovateľa hostingu'],
   ['Vaše nastavenia','Voľba motívu a súhlasu s kalkulačkami, iba vo vašom prehliadači','Nevyhnutné pre fungovanie webu','Pozri <a href="#/cookies">Cookies</a>'],
   ['Odpoveď na vašu otázku (e-mail, kontakt)','Meno, e-mail, telefón, obsah správy','Opatrenia pred uzavretím zmluvy na vašu žiadosť, čl. 6 ods. 1 písm. b)','1 rok od poslednej komunikácie, ak nevznikne zmluvný vzťah'],
   ['Dopyt na životné poistenie','Vek, pracovné postavenie, druh práce, želané krytie a rozpočet, ak nám ich pošlete e-mailom','Opatrenia pred uzavretím zmluvy na vašu žiadosť, čl. 6 ods. 1 písm. b)','1 rok od poslednej komunikácie, ak nevznikne zmluvný vzťah'],
   ['Krátky audit poistky (dotazník)','Odpovede a sumy, ktoré zadáte','Údaje sa nikam neodosielajú, zostávajú v otvorenej stránke','Do zatvorenia alebo opustenia auditu'],
   ['Čítanie nahratej zmluvy','Súbor, ktorý vyberiete, a typ poistenia','Váš súhlas, čl. 6 ods. 1 písm. a)','Dokument neukladáme; spracuje sa iba počas čítania'],
   ['Ochrana služby čítania pred zneužitím','Denne sa meniaci odtlačok IP adresy a počet požiadaviek, bez obsahu dokumentu','Oprávnený záujem, čl. 6 ods. 1 písm. f)','Denné počítadlá sa nahrádzajú nasledujúci deň'],
   ['Zverejnenie recenzie','Krstné meno, začiatočné písmeno priezviska, mesto, hodnotenie a text recenzie','Váš súhlas, čl. 6 ods. 1 písm. a)','Do odvolania súhlasu; e-mail s recenziou 1 rok'],['Finančné sprostredkovanie','Údaje potrebné na uzavretie a správu zmluvy','Plnenie zákonných povinností, čl. 6 ods. 1 písm. c), a zmluva, čl. 6 ods. 1 písm. b)','Podľa zákona o finančnom sprostredkovaní (spravidla 10 rokov od skončenia zmluvného vzťahu)']
  ];
  const recipients=[
   ['Websupport, s. r. o.','E-mailové schránky na doméne poistkapodlupou.sk','Slovensko'],
   ['GitHub, Inc.','Hosting webu (GitHub Pages)','USA'],
   ['Cloudflare, Inc.','Prenos dokumentu na prečítanie a ochrana pred zneužitím','USA'],
   ['Anthropic, PBC','Prečítanie nahratej zmluvy umelou inteligenciou','USA'],
   ['Finportal, a. s.','Samostatný finančný agent pri sprostredkovaní, prevádzkovateľ kalkulačiek','Slovensko']
  ];
  return article('Ochrana osobných údajov', `<p class="lead">Spracúvame len to, čo potrebujeme, aby sme vám vedeli pomôcť. Na webe vás nesledujeme a väčšina nástrojov funguje iba vo vašom prehliadači.</p>
  <h2>Kto spracúva vaše údaje</h2>
  <div class="legal-card"><span class="eyebrow">Prevádzkovateľ webu · poistenie</span><h3>${P.name}</h3><p>${P.seat}, IČO ${P.ico}, DIČ 2121951502</p><p>Spracúva údaje z webu, z adries <a href="mailto:ahoj@poistkapodlupou.sk">ahoj@poistkapodlupou.sk</a> a <a href="mailto:curillova@poistkapodlupou.sk">curillova@poistkapodlupou.sk</a> a pri sprostredkovaní poistenia.</p></div>
  <div class="legal-card"><span class="eyebrow">Úvery, hypotéky, sporenie, dôchodok</span><h3>${F.name}</h3><p>${F.seat}, IČO ${F.ico}</p><p>Spracúva údaje, ktoré mu pošlete na <a href="mailto:dominik@poistkapodlupou.sk">dominik@poistkapodlupou.sk</a>, a pri sprostredkovaní vo svojich sektoroch.</p></div>
  <p>Ak s nami uzavriete zmluvu, osobné údaje spracúva aj samostatný finančný agent Finportal, a. s., a príslušná finančná inštitúcia. O ich spracúvaní vás pred uzavretím zmluvy samostatne informujeme. Zodpovednú osobu sme neurčili, pretože nám to zákon neukladá.</p>
  <h2>Čo, prečo a ako dlho</h2>${legalTable(['Účel','Údaje','Právny základ','Ako dlho'],purposes)}
  <h2>Životné poistenie a zdravotné údaje</h2><p>Formulár k životnému poisteniu vám pomôže pripraviť podklady na konzultáciu. Výška, hmotnosť a odpoveď o zdraví zostávajú iba v otvorenej stránke a nikam sa neodosielajú. Pripravený e-mail obsahuje len vek, pracovné postavenie, druh práce, krytie a rozpočet a odošlete ho vy sami. Zdravotné údaje potrebné na ponuku spracúvame až pri konzultácii, s vaším výslovným súhlasom podľa čl. 9 ods. 2 písm. a) GDPR. Diagnózy ani lekárske správy cez web neposielajte.</p>
  <h2>Čítanie nahratej zmluvy</h2><p>Nahrajte iba anonymizovaný dokument bez mena, rodného čísla, podpisu, kontaktov a zdravotných údajov. Po kliknutí na prečítanie sa súbor odošle cez Cloudflare spoločnosti Anthropic, ktorá ho prečíta a vráti rozpoznané údaje do vášho prehliadača. My dokument neukladáme. Anthropic podľa svojich obchodných podmienok nepoužíva tieto údaje na trénovanie modelov a uchováva ich podľa <a href="https://privacy.anthropic.com/" target="_blank" rel="noopener noreferrer">vlastných pravidiel →</a>. Výsledok je orientačný a nie je automatizovaným rozhodnutím s právnymi účinkami.</p>
  <h2>Komu údaje poskytujeme</h2>${legalTable(['Príjemca','Účel','Krajina'],recipients)}
  <p>Prenos do USA prebieha na základe rozhodnutia Európskej komisie o primeranosti (EU-US Data Privacy Framework) alebo štandardných zmluvných doložiek. Údaje nepredávame a nepoužívame na reklamu.</p>
  <h2>Vaše práva</h2><ul><li>prístup k svojim údajom a ich kópia,</li><li>oprava nesprávnych údajov,</li><li>vymazanie, ak ich už nepotrebujeme alebo ste odvolali súhlas,</li><li>obmedzenie spracúvania,</li><li>prenosnosť údajov,</li><li>námietka proti spracúvaniu na základe oprávneného záujmu,</li><li>odvolanie súhlasu kedykoľvek, bez vplyvu na skoršie spracúvanie.</li></ul>
  <p>Stačí napísať na <a href="mailto:ahoj@poistkapodlupou.sk">ahoj@poistkapodlupou.sk</a>. Odpovieme najneskôr do jedného mesiaca. Ak si myslíte, že s údajmi zaobchádzame nesprávne, môžete podať návrh na <a href="https://dataprotection.gov.sk/" target="_blank" rel="noopener noreferrer">Úrad na ochranu osobných údajov SR →</a>, Hraničná 12, 820 07 Bratislava.</p>
  <p class="legal-updated">Účinné od ${LEGAL_UPDATED}. Ak tieto informácie zmeníme, aktualizujeme ich na tejto stránke. Súvisí: <a href="#/cookies">Cookies</a> · <a href="#/pravne">Právne informácie</a>.</p>`);
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-cookie-settings]')) showCookieSettings();
  const choice = event.target.closest('[data-finportal-choice]');
  if (choice) applyCookieChoice(choice.dataset.finportalChoice === 'allow');
});
document.querySelector('#cookie-panel').hidden = privacyChoice !== null;
