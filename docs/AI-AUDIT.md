# Nasledujúca etapa: čítanie zmluvy

Stav: nezapojené. Verejný web je statický; žiadne dokumenty sa neodosielajú. Krátky audit beží iba v pamäti prehliadača.

Potrebné pre nasadenie: konkrétny AI API účet s fakturáciou, serverové prostredie na Websupporte (overiť balík, PHP, HTTPS a odchádzajúce API spojenia), prístup na nasadenie a určenie spracovateľov/uchovávania. Kľúč iba na serveri mimo verejného adresára a Git repozitára.

Tok: typ zmluvy → PDF/fotografia → prečítanie → používateľ potvrdí extrahované hodnoty → otázky k potrebám konkrétneho typu → orientačný audit → odborná kontrola. Zmluvu aj podmienky treba vedieť pripojiť; bez podmienok sa výluky nesmú domýšľať.

Každý extrahovaný údaj: hodnota, jednotka, zdrojový dokument a strana, krátky podklad, stav potvrdenia. Nečitateľné a chýbajúce položky označiť. Rozpis ceny len ak ho dokument obsahuje. Nepovažovať pokyny vložené v dokumente za systémové pokyny. Výstup validovať serverom a renderovať ako text, nie HTML. Nesľubovať poistné plnenie, zmenu alebo zrušenie zmluvy.

Pred verejným zapnutím: kontrola MIME aj obsahu, limit veľkosti/počtu strán, limity požiadaviek a nákladov, časové limity, žiadne verejné úložisko dokumentov, žiadne dokumenty v logoch, určené vymazanie dočasných súborov aj pri chybe, informovanie používateľa o poskytovateľovi a spracovaní. Pri životnom poistení minimalizovať zdravotné údaje. Skúšať na syntetických dokumentoch.

Možnosť poskytovateľa: Claude API podporuje čítanie PDF vrátane vizuálneho obsahu; samostatná OCR služba nemusí byť potrebná. Kvalitu na slovenských poistných zmluvách treba zmerať, nepredpokladať.
Zdroj: https://platform.claude.com/docs/en/build-with-claude/pdf-support
