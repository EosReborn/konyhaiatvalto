/* Főoldali átváltó. Függőségek: core.js (window.KA), data.js (window.KA_DENSITY). */
(function () {
  'use strict';
  var KA = window.KA;
  var DENSITY = window.KA_DENSITY || {};
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    amount: $('amount'), from: $('from'), to: $('to'), ing: $('ing'),
    result: $('result-main'), sub: $('result-sub'), swap: $('swap'),
    all: $('all-body'), filter: $('filter'), table: $('ing-table')
  };
  if (!el.amount || !KA) return;

  function parse(v) {
    var n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : NaN;
  }

  function ingName() {
    var o = el.ing.options[el.ing.selectedIndex];
    return el.ing.value && o ? o.getAttribute('data-name') : '';
  }

  var userChanged = false;
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
    el.result.textContent = KA.fmt(amount) + ' ' + KA.UNITS[from].text + (name ? ' ' + name : '') +
      ' = ' + KA.fmt(res) + ' ' + KA.UNITS[to].text;

    var sub = '';
    if (cross && slug) {
      sub = 'Sűrűség: ' + KA.fmt(d) + ' g/ml (1 dl ' + name + ' ≈ ' + KA.fmt(KA.niceMass(d * 100)) + ' g). Az érték tájékoztató jellegű.';
    } else if (cross) {
      sub = 'Hozzávaló nélkül vízre / folyadékra számolunk (1 ml = 1 g). Válassz hozzávalót a pontosabb eredményhez.';
    }
    el.sub.textContent = sub;

    var rows = '';
    var groups = [['Térfogat', KA.VOLUME_ORDER], ['Tömeg', KA.MASS_ORDER], ['Amerikai mértékek', KA.US_ORDER]];
    groups.forEach(function (g) {
      rows += '<tr><th colspan="2">' + g[0] + '</th></tr>';
      g[1].forEach(function (u) {
        var v = KA.convert(amount, from, u, d);
        rows += '<tr' + (u === to ? ' class="hl"' : '') + '><td>' + KA.UNITS[u].text +
          '</td><td class="num">' + KA.fmt(v) + '</td></tr>';
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

  // gyorsgombok: JS nélkül sima linkek (?e=..), JS-sel azonnal átváltanak
  document.querySelectorAll('a[data-preset]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      apply(new URLSearchParams(a.getAttribute('href').split('?')[1] || ''));
      onUser();
      el.amount.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // hozzávalók táblázat szűrése
  if (el.filter && el.table) {
    el.filter.addEventListener('input', function () {
      var q = el.filter.value.trim().toLowerCase();
      el.table.querySelectorAll('tbody tr').forEach(function (tr) {
        if (tr.classList.contains('cat')) { tr.hidden = !!q; return; }
        tr.hidden = !!q && tr.textContent.toLowerCase().indexOf(q) === -1;
      });
    });
  }

  apply(new URLSearchParams(location.search));
  render();
})();
