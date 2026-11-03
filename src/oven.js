/* Sütőhőfok-átváltó. Függőség: core.js (window.KA). */
(function () {
  'use strict';
  var KA = window.KA;
  function $(id) { return document.getElementById(id); }
  var val = $('o-val'), from = $('o-from'), main = $('o-main'), body = $('o-body');
  if (!val || !KA) return;

  function parse(s) {
    s = String(s).trim().replace(',', '.');
    var m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (m) return +m[1] / +m[2];
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }
  function toC(v, f) {
    if (f === 'c') return v;
    if (f === 'fan') return v + 20;
    if (f === 'f') return KA.fToC(v);
    return KA.cFromGas(v);
  }
  function render() {
    var v = parse(val.value);
    if (isNaN(v) || v < 0) { main.textContent = 'Adj meg egy érvényes hőmérsékletet'; body.innerHTML = ''; return; }
    var c = toC(v, from.value);
    var fan = Math.round(c - 20), f = Math.round(KA.cToF(c)), gas = KA.gasLabel(KA.gasFromC(c));
    main.textContent = Math.round(c) + ' °C alsó-felső = ' + fan + ' °C légkeveréssel = ' + f + ' °F';
    body.innerHTML =
      '<tr><th scope="row">°C – alsó-felső (hagyományos)</th><td class="num">' + Math.round(c) + ' °C</td></tr>' +
      '<tr><th scope="row">°C – légkeveréses</th><td class="num">' + fan + ' °C</td></tr>' +
      '<tr><th scope="row">°F – Fahrenheit</th><td class="num">' + f + ' °F</td></tr>' +
      '<tr><th scope="row">Gázfokozat (kb.)</th><td class="num">' + gas + '</td></tr>';
  }
  val.addEventListener('input', render);
  from.addEventListener('change', render);
  render();
})();
