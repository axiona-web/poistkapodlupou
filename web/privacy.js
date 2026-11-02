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

function cookiesPage() {
  return article('Cookies a nastavenia', `<p>V prehliadači si pamätáme zvolený svetlý alebo tmavý motív, kým ho nezmeníte alebo nevymažete údaje webu. Rozhodnutie o externých kalkulačkách si pamätáme 180 dní. Obe voľby ukladáme do lokálneho úložiska.</p><h2>Externé kalkulačky</h2><p>Po povolení sa na stránke Kalkulačky načíta obsah a skript Finportalu. Poskytovateľ pri spojení dostane technické údaje vrátane IP adresy a môže používať vlastné úložisko. Pri odmietnutí môžete kalkulačku otvoriť samostatným odkazom.</p><p>Na našom webe nemáme vlastné reklamné ani analytické sledovanie.</p><button class="btn" data-cookie-settings>Zmeniť nastavenia</button><p><a href="#/sukromie">Ochrana osobných údajov →</a></p>`);
}

function privacyPage() {
  return article('Ochrana osobných údajov', `<p class="lead">Záleží na tom, ktorú časť webu používate. Pri krátkom audite odpovedáte priamo v prehliadači. Pri čítaní dokumentu sa vybraný súbor odosiela na spracovanie.</p>
  <h2>Krátky audit a kontakt</h2><p>Odpovede z dotazníka, zadané sumy a opravy prečítaných údajov zostávajú v pamäti otvorenej stránky. Pri opustení auditu sa stratia. Kontaktný formulár je zatiaľ náhľad a správu neodosiela.</p>
  <h2>Čítanie testovacej zmluvy</h2><p>Súkromný pilot je určený na fiktívne dokumenty bez osobných údajov. Kliknutím na prečítanie odošlete celý súbor a zvolený typ poistenia do služby Cloudflare, ktorá dokument postúpi spoločnosti Anthropic. Testovací token overuje Cloudflare. Rozpoznané údaje, čísla strán a úryvky sa vrátia do vášho prehliadača. Web neukladá dokument do databázy. Poskytovatelia majú vlastné pravidlá spracovania a uchovávania. <a href="https://privacy.anthropic.com/" target="_blank" rel="noopener noreferrer">Informácie Anthropic ↗</a></p>
  <h2>Návšteva webu a kalkulačky</h2><p>Web zobrazuje GitHub Pages. Pri načítaní stránky dostáva poskytovateľ hostingu technické údaje pripojenia. Vložené kalkulačky sa spoja s Finportalom až po vašom povolení. Údaje napísané do kalkulačky spracúva jej poskytovateľ. Partnerské odkazy na Najpoistenie otvárajú samostatný web. <a href="#/cookies">Nastavenia cookies →</a></p>
  <h2>Vaše práva a kontakt</h2><p>Podľa okolností môžete požiadať o prístup k osobným údajom, ich opravu, vymazanie, obmedzenie spracúvania či prenosnosť, namietať proti spracúvaniu a odvolať udelený súhlas. Máte právo podať sťažnosť na <a href="https://dataprotection.gov.sk/" target="_blank" rel="noopener noreferrer">Úrad na ochranu osobných údajov SR ↗</a>.</p><p class="info">Web je v skúšobnej prevádzke. Pred prijímaním klientskych údajov doplníme overené identifikačné a kontaktné údaje prevádzkovateľa, právne základy, lehoty uchovávania a informácie o prípadných prenosoch. Do pilotu vkladajte len vzorové dokumenty bez osobných údajov.</p>`);
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-cookie-settings]')) showCookieSettings();
  const choice = event.target.closest('[data-finportal-choice]');
  if (choice) applyCookieChoice(choice.dataset.finportalChoice === 'allow');
});
document.querySelector('#cookie-panel').hidden = privacyChoice !== null;
