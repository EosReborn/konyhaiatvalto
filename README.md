# konyhaiatvalto.hu

Statikus (szerver nélküli) konyhai átváltó oldal: bögre, pohár, evőkanál, teáskanál, ml, dl, liter, g, dkg és kg között, **60 hozzávaló** sűrűségével.

- **Főoldal**: interaktív átváltó (megosztható linkkel: `?e=liszt&a=1&f=bogre&t=dkg`), hozzávalók táblázata szűréssel, GYIK.
- **~1830 generált aloldal**: minden gyakori kérdésre külön oldal (pl. `/atvaltas/hany-dkg-egy-bogre-liszt/`), saját `title`-lel, meta leírással, `FAQPage` és `BreadcrumbList` JSON-LD-vel.
- **Darabos hozzávalók** (`/darab/`): 20 tétel (tojás, burgonya, gerezd fokhagyma, csomag sütőpor…), kérdés-oldalakkal („Hány gramm 3 közepes tojás?"). Adatok: `src/ingredients.json` `pieces` listája.
- **Sütőhőfok-átváltó** (`/suto-homerseklet-atvalto/`): °C, légkeveréses °C, °F és gázfokozat kalkulátor + 68 generált oldal („180 °C hány °F?").
- **Adagszám-átszámoló** (`/adagszam-atszamolo/`): beillesztett hozzávalólista arányos átírása (törtek, tizedesek, tartományok kezelésével).
- **Amerikai mértékek** (`/amerikai-mertekek/`): cup, tbsp, tsp, fl oz, pint, quart, oz, lb; ezek a kalkulátorban és hozzávalónként („Hány gramm egy cup liszt?") is elérhetők.
- **Egyedi szöveg** minden hozzávalóhoz (`about` mező az `ingredients.json`-ban).
- **Hűtőmágnes-cetli** (`/hutomagnes-cetli/`): letölthető A4 PDF és Pinterest-méretű kép (`src/downloads/`). Ha változik az adat, a build frissíti az oldalt, de a PDF/PNG újrarenderelése kézzel történik: indíts helyi szervert (`python3 -m http.server 8765 --directory docs`), majd Chrome-mal: `--headless=new --no-pdf-header-footer --print-to-pdf=src/downloads/konyhai-atvalto-cetli.pdf http://localhost:8765/hutomagnes-cetli/lap/` és `--window-size=1000,1500 --screenshot=src/downloads/konyhai-atvalto-cetli.png http://localhost:8765/hutomagnes-cetli/pin/`.
- **Hozzávaló-oldalak** (`/hozzavalo/liszt/`), **mértékegység-oldalak** (`/atvaltas/hany-dl-egy-bogre/`), `sitemap.xml`, `robots.txt`, `404.html`.
- Mobilbarát, sötét módot is támogat, a kész oldalak működéséhez nem kell JavaScript (csak a főoldali kalkulátorhoz).

Mértékek: 1 bögre = 2,5 dl, 1 pohár = 2 dl, 1 evőkanál = 15 ml, 1 teáskanál = 5 ml.

## Felépítés

```
src/
  core.js            közös átváltó-logika (böngésző + generátor)
  ingredients.json   hozzávalók, sűrűségek (g/ml), kategóriák, megjegyzések
  app.js, oven.js, scale.js   főoldali kalkulátor, sütőhőfok- és adagszám-kalkulátor
  style.css          stíluslap
  brand/             logó, ikonok, közösségi kép (arculati csomag)
build.js             oldalgenerátor (Node, függőség nélkül)
docs/                a generált, feltölthető oldal (ezt kell publikálni)
```

## Generálás

Szükséges: Node.js 16 vagy újabb. Nincs `npm install`.

```bash
node build.js
```

Ez újraépíti a teljes `docs/` mappát. Helyi kipróbálás:

```bash
python3 -m http.server 8000 --directory docs
# majd: http://localhost:8000
```

Más domainhez vagy almappához:

```bash
SITE_URL=https://pelda.hu node build.js
SITE_URL=https://felhasznalo.github.io BASE_PATH=/repo-neve node build.js   # GitHub project pages, domain nélkül
```

## Új hozzávaló vagy új kérdéstípus

- Hozzávaló: add hozzá az `src/ingredients.json` `ingredients` listájához (`slug`, `name`, `density` g/ml-ben, `cat`; fűszernél `"spice": true`), majd `node build.js`. Az oldal, a sitemap és a főoldali táblázat automatikusan frissül.
- Kérdéstípus (pl. „hány gramm 3 evőkanál …"): a `build.js` `defsFor()` függvényében vedd fel a sort (`V` = térfogat → tömeg, `M` = tömeg → térfogat).
- A sűrűségek átlagos, tájékoztató értékek; ha pontosabbat tudsz, írd át a JSON-ban.

## Feltöltés GitHub Pages-re

1. Hozz létre egy új (üres) repót a GitHubon, majd a projekt mappájában:
   ```bash
   git init -b main
   git add .
   git commit -m "Konyhai átváltó"
   git remote add origin https://github.com/FELHASZNALO/konyhaiatvalto.git
   git push -u origin main
   ```
2. GitHub → **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, mappa = `/docs`.
3. Egyéni domain: a **Custom domain** mezőbe írd be: `konyhaiatvalto.hu` (a `docs/CNAME` fájlt a build már létrehozza). A DNS-nél:
   - `konyhaiatvalto.hu` (apex): négy `A` rekord → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www`: `CNAME` → `FELHASZNALO.github.io`
   - Pipáld be az **Enforce HTTPS** opciót, ha elérhető.

Domain nélkül (`https://felhasznalo.github.io/repo-neve/`) építsd a fenti `BASE_PATH` változóval, és commitold a `docs/`-ot.

## Feltöltés Cloudflare Pages-re

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**, válaszd ki a repót.
2. Build beállítások:
   - Framework preset: *None*
   - Build command: *(üres)* – a `docs/` már le van generálva; vagy `node build.js`, ha a Cloudflare építse
   - Build output directory: `docs`
3. Deploy után: **Custom domains → Set up a custom domain** → `konyhaiatvalto.hu`. Ha a domain DNS-e a Cloudflare-nél van, a rekordokat magától felveszi.
4. A `docs/_headers` fájl gyorsítótár- és biztonsági fejléceket állít be (csak Cloudflare Pages/Netlify használja).

## SEO utáni teendők

- Add hozzá az oldalt a [Google Search Console](https://search.google.com/search-console)-hoz, és küldd be a `https://konyhaiatvalto.hu/sitemap.xml` címet.
- A `sitemap.xml` minden buildnél az aktuális dátummal frissül (`lastmod`); a `robots.txt` mindent engedélyez, és hivatkozik a sitemapre.
- Az értékek tájékoztató jellegűek – ezt a láblécben is jelezzük.

## SEO – mi van beépítve

- Minden oldalnak egyedi `title`-je (hosszú címnél a márkanév kimarad, max. ~64 karakter), meta leírása, `canonical`, `hreflang`, Open Graph és Twitter kártyája, `max-snippet`/`max-image-preview` robots direktíva.
- Strukturált adat: `BreadcrumbList` minden oldalon, `FAQPage` az aloldalakon, `WebSite` + `Organization` + `WebApplication` a főoldalon.
- `sitemap.xml` **pontos `lastmod` dátumokkal**: a `src/lastmod.json` oldalanként tárolja a tartalom lenyomatát, és csak akkor ír új dátumot, ha az oldal tartalma tényleg változott. Ezt a fájlt commitold a `docs/` mellett.
- Belső linkelés: morzsamenü, hozzávalónként összes kérdés, ugyanaz a kérdés más hozzávalóval, `/terkep/` oldaltérkép, `/modszertan/` módszertani oldal (átláthatóság), „adatok frissítve" sor minden oldalon.
- Teljesítmény: egyetlen CSS, JS csak ott, ahol kell, rögzített képméretek, hosszú lejáratú gyorsítótár az `assets/` mappára (`vercel.json`, `_headers`).
- **IndexNow**: `src/indexnow.key` + `node tools/indexnow.js` – a domain élesedése után az új/módosított oldalakat azonnal jelzi a Bingnek és társainak (`SINCE=2026-11-01` a kezdődátum).

Domain élesedése után: Google Search Console + Bing Webmaster (sitemap beadása), `www` → apex átirányítás a DNS/hosting beállításban, és a Rich Results Test / Search Console „Fejlesztések" jelentés ellenőrzése. A `FAQPage` rich result a Google-nél 2023 óta csak kiemelt (állami, egészségügyi) oldalaknak jelenik meg, de az adat a kereső és az AI-összefoglalók számára így is hasznos.
