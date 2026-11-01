# Nasledujúca etapa: čítanie zmluvy

Stav: nezapojené. Verejný web je statický; žiadne dokumenty sa neodosielajú. Krátky audit beží iba v pamäti prehliadača.

Potrebné pre nasadenie: konkrétny AI API účet s fakturáciou, serverové prostredie na Websupporte (overiť balík, PHP, HTTPS a odchádzajúce API spojenia), prístup na nasadenie a určenie spracovateľov/uchovávania. Kľúč iba na serveri mimo verejného adresára a Git repozitára.

Tok: typ zmluvy → PDF/fotografia → prečítanie → používateľ potvrdí extrahované hodnoty → otázky k potrebám konkrétneho typu → orientačný audit → odborná kontrola. Zmluvu aj podmienky treba vedieť pripojiť; bez podmienok sa výluky nesmú domýšľať.

Každý extrahovaný údaj: hodnota, jednotka, zdrojový dokument a strana, krátky podklad, stav potvrdenia. Nečitateľné a chýbajúce položky označiť. Rozpis ceny len ak ho dokument obsahuje. Nepovažovať pokyny vložené v dokumente za systémové pokyny. Výstup validovať serverom a renderovať ako text, nie HTML. Nesľubovať poistné plnenie, zmenu alebo zrušenie zmluvy.

Pred verejným zapnutím: kontrola MIME aj obsahu, limit veľkosti/počtu strán, limity požiadaviek a nákladov, časové limity, žiadne verejné úložisko dokumentov, žiadne dokumenty v logoch, určené vymazanie dočasných súborov aj pri chybe, informovanie používateľa o poskytovateľovi a spracovaní. Pri životnom poistení minimalizovať zdravotné údaje. Skúšať na syntetických dokumentoch.

Možnosť poskytovateľa: Claude API podporuje čítanie PDF vrátane vizuálneho obsahu; samostatná OCR služba nemusí byť potrebná. Kvalitu na slovenských poistných zmluvách treba zmerať, nepredpokladať.
Zdroj: https://platform.claude.com/docs/en/build-with-claude/pdf-support

## Anthropic + Websupport Smart — zvolená cesta
Používateľ potvrdil Anthropic a hosting Smart. `server/AnthropicReader.php` je súkromný PHP adaptér pre Messages API (PDF/JPEG/PNG do 8 MiB). Nie je to verejný upload endpoint ani hotový audit. Posiela jeden dokument na explicitné volanie, validuje štruktúru odpovede a vyžaduje potvrdenie údajov. Žiadne živé volanie zatiaľ neprebehlo.

Lokálne overené: PHP, cURL, fileinfo, JSON, OpenSSL; test odmietnutia nesprávneho obsahu, prázdneho dokumentu, neúplnej odpovede a neplatnej strany. Tieto kontroly nepotvrdzujú konfiguráciu hostingu ani správnosť modelového čítania.

Nasadenie: server/ musí zostať mimo verejného webového koreňa. Zatiaľ ho na hosting nenahrávať ako verejný endpoint. Nastaviť ANTHROPIC_API_KEY a ANTHROPIC_MODEL v súkromnej serverovej konfigurácii. Model vybrať po overení dostupnosti a ceny v účte. `php server/preflight.php` vypisuje iba prítomnosť nastavení, nikdy tajné hodnoty.

Ďalej implementovať chránený upload, počet strán, limity nákladov a požiadaviek, retenčné pravidlá, informácie o spracovaní, potvrdenie údajov vo webovom rozhraní a analýzu podľa potrieb. Bez týchto krokov nezapnúť nahrávanie klientskych zmlúv. API prijíma obsah dokumentu, preto aj pri extrakcii bez osobných údajov v odpovedi Anthropic dostáva pôvodný dokument; to treba zohľadniť v spracovaní údajov.

Používateľský krok: vytvoriť organizáciu na https://platform.claude.com/ a nastaviť Billing. Kľúč nevkladať do chatu, repozitára ani JavaScriptu. Na začiatku ponechať automatické dobíjanie vypnuté a použiť malý testovací kredit podľa aktuálneho minima poskytovateľa.

## Cloudflare pilot
Používateľ zvolil dočasne GitHub Pages + Cloudflare namiesto Websupportu. Adaptér a nasadzovacia konfigurácia sú v cloudflare/. Šesť lokálnych testov prešlo. Chránený pilot vyžaduje osobitný TEST_ACCESS_TOKEN, ANTHROPIC_API_KEY a ANTHROPIC_MODEL. Na verejnom webe zatiaľ nie je upload. Nasadenie cez prepojenie GitHub čaká na schválenie prístupov používateľom.
