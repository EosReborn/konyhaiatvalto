#!/usr/bin/env node
/*
 * IndexNow: az új és módosított URL-ek azonnali jelzése a Bingnek, Yandexnek és más keresőknek.
 * Használat (a domain élesedése UTÁN, a kulcsfájl már elérhető a webhelyen):
 *
 *   SITE_URL=https://konyhaiatvalto.hu node tools/indexnow.js
 *
 * A kulcsot a src/indexnow.key tartalmazza; a build a docs/<kulcs>.txt fájlt is létrehozza.
 * Csak azokat az oldalakat küldi, amelyek lastmod dátuma a megadott naptól (alapból: ma) újabb.
 *   SINCE=2026-11-01 node tools/indexnow.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const site = (process.env.SITE_URL || 'https://konyhaiatvalto.hu').replace(/\/+$/, '');
const key = fs.readFileSync(path.join(root, 'src', 'indexnow.key'), 'utf8').trim();
const since = process.env.SINCE || new Date().toISOString().slice(0, 10);
const xml = fs.readFileSync(path.join(root, 'docs', 'sitemap.xml'), 'utf8');
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc><lastmod>(.*?)<\/lastmod>/g)].filter((m) => m[2] >= since).map((m) => m[1]);
if (!urls.length) { console.log('Nincs elküldendő URL (since=' + since + ').'); process.exit(0); }
(async () => {
  for (let i = 0; i < urls.length; i += 9000) {
    const batch = urls.slice(i, i + 9000);
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(site).hostname, key, keyLocation: `${site}/${key}.txt`, urlList: batch }),
    });
    console.log(`IndexNow: ${batch.length} URL → HTTP ${res.status}`);
  }
})();
