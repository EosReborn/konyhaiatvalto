/* Recept adagszám-átszámoló. Függőség: core.js (window.KA). */
(function () {
  'use strict';
  var KA = window.KA;
  function $(id) { return document.getElementById(id); }
  var src = $('s-src'), from = $('s-from'), to = $('s-to'), out = $('s-out'), fac = $('s-factor'), copy = $('s-copy'), msg = $('s-msg');
  if (!src || !KA) return;

  var FR = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
  var NUM = '(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?|[½¼¾⅓⅔])';
  var RE = new RegExp('^(\\s*(?:[-–•*]\\s*)?)(' + NUM + ')(?:\\s*[-–]\\s*(' + NUM + '))?(?=\\s|$|[A-Za-zÀ-ž])(.*)$');
  var COUNT = /^\s*(db|darab|tojás|gerezd|fej|szem|szelet|csomag|zacskó|kocka)/i;

  function num(t) {
    t = t.trim();
    if (FR[t] !== undefined) return FR[t];
    var m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (m) return +m[1] + +m[2] / +m[3];
    m = t.match(/^(\d+)\/(\d+)$/);
    if (m) return +m[1] / +m[2];
    return parseFloat(t.replace(',', '.'));
  }
  function parse(v) {
    var n = parseFloat(String(v).replace(',', '.'));
    return isFinite(n) && n > 0 ? n : NaN;
  }

  var lastText = '';
  function render() {
    var a = parse(from.value), b = parse(to.value);
    if (isNaN(a) || isNaN(b)) { fac.textContent = 'Adj meg érvényes adagszámot'; out.textContent = ''; lastText = ''; return; }
    var k = b / a;
    fac.textContent = 'Szorzó: × ' + KA.fmt(k);
    var lines = src.value.split(/\r?\n/).map(function (line) {
      var m = line.match(RE);
      if (!m) return line;
      var x = num(m[2]) * k;
      var s = KA.fmt(x);
      if (m[3]) s += '–' + KA.fmt(num(m[3]) * k);
      var rest = m[4];
      var hint = COUNT.test(rest) && Math.abs(x - Math.round(x)) > 0.01 ? ' (kerekítsd)' : '';
      return m[1] + s + rest + hint;
    });
    lastText = lines.join('\n');
    out.textContent = lastText;
  }

  ['input', 'change'].forEach(function (ev) {
    src.addEventListener(ev, render);
    from.addEventListener(ev, render);
    to.addEventListener(ev, render);
  });
  copy.addEventListener('click', function () {
    var done = function () { msg.textContent = 'Kimásolva'; setTimeout(function () { msg.textContent = ''; }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lastText).then(done, function () { msg.textContent = 'Nem sikerült másolni'; });
    else msg.textContent = 'A böngésző nem engedi a másolást';
  });
  render();
})();
