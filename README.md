# Poistka pod Lupou

Pracovná verzia responzívneho webu pre poistkapodlupou.sk. Statické HTML, CSS a JavaScript, bez inštalácie závislostí.

## Lokálny náhľad

Z koreňa projektu:

```sh
python3 -m http.server 8080 --bind 127.0.0.1 --directory web
```

Otvorte http://127.0.0.1:8080/.

## Obsah

- Svetlý a tmavý motív, responzívna navigácia a vlastné ilustrácie.
- Poistné kalkulačky cez partnerské odkazy.
- Päť vložených finančných kalkulačiek Finportal.
- Rady a tipy s filtrovaním tém.
- Lokálny orientačný kontrolný zoznam poistky.
- Náhľad kontaktného formulára s validáciou, zatiaľ bez odosielania.

## Úpravy a nasadenie

Poistné odkazy sú v `config/insurance-links.json`. Po úprave spustite `python3 scripts/sync-links.py` a uložte aj aktualizovaný `web/links.js`. Kód finančných iframe kalkulačiek je samostatne v `FINPORTAL_EMBED` v `web/pages.js`.

Na hosting sa nahráva obsah priečinka `web/`. Navigácia využíva hash, preto nepotrebuje pravidlá presmerovania. Samotné nahranie do GitHubu web nenasadzuje.

Pred verejným spustením potvrďte partnerské kódy, doplňte kontaktné a povinné firemné údaje a dokončite informácie o spracovaní údajov. Kontaktný backend, AI, CRM a automatické pripomienky zatiaľ nie sú zapojené. Externé kalkulačky poskytuje Finportal a majú vlastné pravidlá spracovania údajov.

Ďalšie implementačné poznámky sú v `web/README.md`.
