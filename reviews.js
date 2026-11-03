// Schválené recenzie. Pridávajte iba recenzie odsúhlasené autorom, text neupravujte.
// Formát: {name:'Jana K.', city:'Spišská Nová Ves', area:'Poistenie', date:'2026-11', text:'...'}
const REVIEWS = [];

const REVIEWS_API='https://poistkapodlupou.mdominik01.workers.dev';
// Cloudflare Turnstile site key (public). Empty = widget hidden; set TURNSTILE_SECRET in the worker at the same time.
const TURNSTILE_SITEKEY='0x4AAAAAAFx0qybrtCa2gISC';
