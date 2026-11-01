# Poistka pod Lupou — pracovný web
Statický web bez platených knižníc a bez buildu. Náhľad: `python3 -m http.server 8080 --directory web` z koreňa projektu.

Na Websupport sa nahráva obsah priečinka web (okrem README). Navigácia cez hash funguje bez nastavenia presmerovaní servera.

Zdroj partnerských odkazov je ../config/insurance-links.json. Po zmene spustiť z koreňa `python3 scripts/sync-links.py`; tým sa aktualizuje web/links.js. Provízne číslo je dočasné.

Pred produkciou: potvrdiť kód, doménu a firemné/registračné údaje, doplniť skutočný kontakt a kompletné informácie o súkromí. Formuláre, AI, CRM a pripomienky nie sú zapojené. Pomocník má iba lokálne pripravené odpovede. Kalkulačky otvárajú skutočné používateľom dodané odkazy.

Identita: navy #183748, sage #b8cdb9, cream #f7f6f0. Logo assets/logo.svg je vektor použiteľný aj ako profilový symbol. Hero je vlastná SVG ilustrácia. Higgsfield generovanie bolo odmietnuté pre chýbajúci plán Basic; žiadny výsledok z neho nie je súčasťou webu.

## Redizajn
Úvod používa lokálne písmo Manrope, fotografický vizuál vytvorený Imagegen a vlastné produktové SVG. Celé produktové dlaždice vedú priamo na kalkulačky. CSS hover animácie rešpektujú prefers-reduced-motion. Orientačná kontrola poistky je lokálny checklist bez ukladania údajov. Podklady k UX sú v ../UX-ANALYZA.md.

## Stránky a integrácie (ďalšia iterácia)
- Domov: päť poistných prepočtov. Ilustrácie vrátane dvoch áut majú jednotnú SVG paletu.
- Kalkulačky: samostatné finančné kategórie podľa dodanej referencie (hypotéky, úver, sporenie, dôchodok). Sú to transparentne označené miesta na doplnenie používateľovho HTML; žiadny cudzí sprostredkovateľský kód nebol prevzatý. Funkcia selectFinance v pages.js riadi panel.
- Rady: 9 krátkych sprievodcov, filtre, samostatné URL detailov. Dva základné sprievodce uvádzajú podklad NBS; ostatné sú organizačné checklisty.
- Kontakt: formulár s natívnou validáciou a lokálnou kontrolou; neodosiela a neukladá osobné údaje. Pred zapojením odosielania treba dodať cieľový e-mail, serverové spracovanie/SMTP a dokončiť informácie o spracovaní údajov. Stav správy nesmie tvrdiť odoslanie bez potvrdenia servera.
- Poistenie bolo odstránené z menu; starý odkaz sa vráti na domov.

## Finportal — zapojené 1. 11. 2026
Všetkých päť finančných kalkulačiek je teraz vložených: mortgage-comparison, savings-calculator, refinance-calculator, loan-calculator, retirement-calculator. Predchádzajúce poznámky o nepripojených kalkulačkách už neplatia.

Kód a=5956 je samostatne v FINPORTAL_EMBED.attribution v pages.js; nemení poistný kod=164960001. Skript scripts.js sa načíta raz, až po otvorení Kalkulačiek. Pri prepnutí sa starý resizer odpojí, nový iframe má stále jediné id finportal-iframe. Výška sa prispôsobuje; bez skriptu zostáva 700px rám a odkaz na samostatné otvorenie. Finportal má vlastný vzhľad, obsah, formuláre a pravidlá spracovania údajov. Prepnutím sa zahodia rozpracované údaje. Nepredstierame výsledok ani odoslanie.

Overené v prehliadači: načítanie všetkých 5 formulárov, jeden iframe a jeden skript po prepínaní, automatická výška, bez horizontálneho pretečenia rodičovskej mobilnej stránky. Osobné údaje sa nezadávali a žiadny formulár Finportalu sa neodoslal.
