# Gimmi – návrh nového webu

Statický rozcestník pro Gimmi lounge café (Slovanské náměstí, Brno):

- `index.html` – přehled se čtyřmi moduly
- `web.html` – návrh webu (interaktivní, běží na malém runtime `dc-lite.js`)
- `logo.html` – návrh loga (bonus)
- `admin.html` – ukázka administrace (data jsou smyšlená, nic se neukládá)
- `balicky.html` – balíčky, moduly navíc a kalkulačka (ceny a sleva nahoře ve skriptu)

Stránky mají `noindex`, aby se neobjevily ve vyhledávačích.

## Nasazení na Cloudflare Workers

Repozitář obsahuje `wrangler.jsonc`, web se servíruje ze složky `public/` jako statické soubory.
