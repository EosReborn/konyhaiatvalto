/* Főoldali átváltó. Függőségek: core.js (window.KA), data.js (KA_DENSITY, KA_NAMES). */
(function () {
  'use strict';
  var KA = window.KA;
  var DENSITY = window.KA_DENSITY || {};
  var NAMES = window.KA_NAMES || {};
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    amount: $('amount'), from: $('from'), to: $('to'), ing: $('ing'),
    result: $('result-main'), sub: $('result-sub'), swap: $('swap'),
    all: $('all-body'), filter: $('filter'), table: $('ing-table'),
    q: $('q'), hint: $('q-hint')
  };
  if (!el.amount || !KA) return;

  var userChanged = false;

  function parse(v) {
    var n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : NaN;
  }
  function ingName() {
    var o = el.ing.options[el.ing.selectedIndex];
    return el.ing.value && o ? o.getAttribute('data-name') : '';
  }

  function render() {
    var amount = parse(el.amount.value);
    var from = el.from.value, to = el.to.value;
    var slug = el.ing.value;
    var d = slug && DENSITY[slug] ? DENSITY[slug] : 1;
    var cross = KA.UNITS[from].type !== KA.UNITS[to].type;
    var name = ingName();

    if (!isFinite(amount) || amount < 0) {
      el.result.textContent = 'Adj meg egy érvényes mennyiséget';
      el.sub.textContent = '';
      el.all.innerHTML = '';
      return;
    }

    var res = KA.convert(amount, from, to, d);
    var sub = '';
    var approx = false;
    if (cross) {
      approx = true;
      if (KA.UNITS[to].type === 'm') {
        // konyhai kerekítés: 140 g, nem 137,5 g
        var g = KA.niceMass(KA.convert(amount, from, 'g', d));
        res = KA.convert(g, 'g', to);
        sub = '= ' + KA.fmt(g) + ' g = ' + KA.fmt(g / 10) + ' dkg';
      } else {
        res = KA.niceVol(res, to);
      }
      sub += (sub ? ' · ' : '') + (slug
        ? 'sűrűség: ' + KA.fmt(d) + ' g/ml (tájékoztató érték)'
        : 'hozzávaló nélkül vízre számolunk (1 ml = 1 g), válassz hozzávalót');
    }
    el.result.textContent = KA.fmt(amount) + ' ' + KA.UNITS[from].text + (name ? ' ' + name : '') +
      (approx ? ' ≈ ' : ' = ') + KA.fmt(res) + ' ' + KA.UNITS[to].text;
    el.sub.textContent = sub;

    var rows = '';
    var groups = [['Térfogat', KA.VOLUME_ORDER], ['Tömeg', KA.MASS_ORDER], ['Amerikai mértékek', KA.US_ORDER]];
    groups.forEach(function (gr) {
      rows += '<tr><th colspan="2">' + gr[0] + '</th></tr>';
      gr[1].forEach(function (u) {
        rows += '<tr' + (u === to ? ' class="hl"' : '') + '><td>' + KA.UNITS[u].text +
          '</td><td class="num">' + KA.fmt(KA.convert(amount, from, u, d)) + '</td></tr>';
      });
    });
    el.all.innerHTML = rows;

    if (!userChanged) return;
    try {
      var p = new URLSearchParams();
      if (slug) p.set('e', slug);
      p.set('a', el.amount.value.replace(',', '.'));
      p.set('f', from);
      p.set('t', to);
      history.replaceState(null, '', '?' + p.toString());
    } catch (e) { /* file:// vagy korlátozott környezet */ }
  }

  function apply(params) {
    var e = params.get('e'), a = params.get('a'), f = params.get('f'), t = params.get('t');
    if (e !== null && (e === '' || DENSITY[e])) el.ing.value = e;
    if (a !== null && isFinite(parse(a))) el.amount.value = String(a).replace('.', ',');
    if (f && KA.UNITS[f]) el.from.value = f;
    if (t && KA.UNITS[t]) el.to.value = t;
  }

  function onUser() { userChanged = true; render(); }
  ['input', 'change'].forEach(function (ev) {
    el.amount.addEventListener(ev, onUser);
    el.from.addEventListener(ev, onUser);
    el.to.addEventListener(ev, onUser);
    el.ing.addEventListener(ev, onUser);
  });
  el.swap.addEventListener('click', function () {
    var f = el.from.value;
    el.from.value = el.to.value;
    el.to.value = f;
    onUser();
  });

  /* ---- egyszerű beírás: "2 bögre liszt", "25 dkg vaj", "fél pohár tej" ---- */
  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }
  var UNIT_ALIAS = {
    bogre: 'bogre', bogret: 'bogre', pohar: 'pohar', poharnyi: 'pohar', evokanal: 'evokanal', ek: 'evokanal', kanal: 'evokanal',
    teaskanal: 'teaskanal', tk: 'teaskanal', ml: 'ml', dl: 'dl', l: 'l', liter: 'l', g: 'g', gr: 'g', gramm: 'g',
    dkg: 'dkg', deka: 'dkg', dekagramm: 'dkg', kg: 'kg', kilo: 'kg', kilogramm: 'kg',
    cup: 'uscup', tbsp: 'ustbsp', tsp: 'ustsp', oz: 'oz', lb: 'lb', font: 'lb'
  };
  var WORD_NUM = { fel: 0.5, negyed: 0.25, egy: 1, ket: 2, ketto: 2, harom: 3, negy: 4, ot: 5, hat: 6 };
  var INGS = Object.keys(NAMES).map(function (slug) { return { slug: slug, n: norm(NAMES[slug]) }; });

  function findIng(text) {
    text = text.replace(/\b(a|az)\b/g, '').replace(/(bol|bel)\s*$/, '').trim();
    if (text.length < 2) return null;
    var i, best = null;
    for (i = 0; i < INGS.length; i++) if (INGS[i].n === text) return INGS[i].slug;
    for (i = 0; i < INGS.length; i++) if (INGS[i].n.indexOf(text) === 0) return INGS[i].slug;
    for (i = 0; i < INGS.length; i++) if (text.indexOf(INGS[i].n) === 0 && (!best || INGS[i].n.length > best.n.length)) best = INGS[i];
    if (best) return best.slug;
    for (i = 0; i < INGS.length; i++) if (INGS[i].n.indexOf(text) > -1) return INGS[i].slug;
    return null;
  }
  function defaultTo(from, hasIng, grams) {
    var type = KA.UNITS[from].type;
    if (type === 'v') {
      if (hasIng) return 'g';
      return ({ ml: 'dl', dl: 'ml', l: 'dl', bogre: 'dl', pohar: 'dl', evokanal: 'ml', teaskanal: 'ml' })[from] || 'ml';
    }
    if (hasIng) return grams >= 50 ? 'bogre' : 'evokanal';
    return ({ g: 'dkg', dkg: 'g', kg: 'g' })[from] || 'g';
  }
  function smart() {
    var s = norm(el.q.value);
    if (!s) { el.hint.textContent = 'pl. 25 dkg vaj, fél pohár tej, 1 evőkanál méz – vagy állítsd be lent.'; return; }
    var m = s.match(/^(\d+\s+\d+\/\d+|\d+(?:[.,]\d+)?\s*\/\s*\d+|\d+(?:[.,]\d+)?|fel|negyed|egy|ket|ketto|harom|negy|ot|hat)\s*(.*)$/);
    if (!m) { el.hint.textContent = 'Próbáld így: 2 bögre liszt'; return; }
    var n;
    var raw = m[1];
    if (WORD_NUM[raw] !== undefined) n = WORD_NUM[raw];
    else if (/^\d+\s+\d+\/\d+$/.test(raw)) { var p = raw.split(/\s+|\//); n = +p[0] + +p[1] / +p[2]; }
    else if (raw.indexOf('/') > -1) { var q = raw.split(/\s*\/\s*/); n = parseFloat(q[0].replace(',', '.')) / +q[1]; }
    else n = parseFloat(raw.replace(',', '.'));
    var rest = m[2].split(/\s+/);
    // a mértékegység ragasztva is jöhet: "25dkg"
    var unit = UNIT_ALIAS[rest[0]];
    var tail = rest.slice(1).join(' ');
    if (!unit) { el.hint.textContent = 'Melyik mértékegység? pl. bögre, dl, dkg, evőkanál'; return; }
    var slug = tail ? findIng(tail) : '';
    var hasIng = !!slug;
    var grams = KA.convert(n, unit, 'g', hasIng ? DENSITY[slug] : 1);
    el.amount.value = String(Math.round(n * 1000) / 1000).replace('.', ',');
    el.from.value = unit;
    el.ing.value = slug || '';
    el.to.value = defaultTo(unit, hasIng, grams);
    el.hint.textContent = tail && !hasIng ? 'Ezt a hozzávalót nem ismerem, válaszd ki lent a listából.' : 'Kész. Lent átállíthatod, ha mást szeretnél.';
    onUser();
  }
  if (el.q) el.q.addEventListener('input', smart);

  // gyorsgombok: JS nélkül sima linkek (?e=..), JS-sel azonnal átváltanak
  document.querySelectorAll('a[data-preset]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      apply(new URLSearchParams(a.getAttribute('href').split('?')[1] || ''));
      if (el.q) el.q.value = '';
      onUser();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // hozzávalók táblázat szűrése
  if (el.filter && el.table) {
    el.filter.addEventListener('input', function () {
      var qq = el.filter.value.trim().toLowerCase();
      el.table.querySelectorAll('tbody tr').forEach(function (tr) {
        if (tr.classList.contains('cat')) { tr.hidden = !!qq; return; }
        tr.hidden = !!qq && tr.textContent.toLowerCase().indexOf(qq) === -1;
      });
    });
  }

  apply(new URLSearchParams(location.search));
  render();
})();
