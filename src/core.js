/*
 * Közös átváltó mag: a böngésző (főoldali kalkulátor) és a generáló script (build.js) is ezt használja.
 * Sűrűség: gramm / milliliter.
 */
(function (root) {
  'use strict';

  var UNITS = {
    ml:        { type: 'v', f: 1,    text: 'ml',        ask: 'ml',        label: 'ml – milliliter',    slug: 'ml' },
    dl:        { type: 'v', f: 100,  text: 'dl',        ask: 'dl',        label: 'dl – deciliter',     slug: 'dl' },
    l:         { type: 'v', f: 1000, text: 'liter',     ask: 'liter',     label: 'liter',              slug: 'liter' },
    bogre:     { type: 'v', f: 250,  text: 'bögre',     ask: 'bögre',     label: 'bögre (2,5 dl)',     slug: 'bogre',    ext: ' (2,5 dl)' },
    pohar:     { type: 'v', f: 200,  text: 'pohár',     ask: 'pohár',     label: 'pohár (2 dl)',       slug: 'pohar',    ext: ' (2 dl)' },
    evokanal:  { type: 'v', f: 15,   text: 'evőkanál',  ask: 'evőkanál',  label: 'evőkanál (15 ml)',   slug: 'evokanal', ext: ' (15 ml)' },
    teaskanal: { type: 'v', f: 5,    text: 'teáskanál', ask: 'teáskanál', label: 'teáskanál (5 ml)',   slug: 'teaskanal', ext: ' (5 ml)' },
    g:         { type: 'm', f: 1,    text: 'g',         ask: 'gramm',     label: 'g – gramm',          slug: 'gramm' },
    dkg:       { type: 'm', f: 10,   text: 'dkg',       ask: 'dkg',       label: 'dkg – dekagramm',    slug: 'dkg' },
    kg:        { type: 'm', f: 1000, text: 'kg',        ask: 'kg',        label: 'kg – kilogramm',     slug: 'kg' }
  };

  var VOLUME_ORDER = ['ml', 'dl', 'l', 'bogre', 'pohar', 'evokanal', 'teaskanal'];
  var MASS_ORDER = ['g', 'dkg', 'kg'];

  /** Átváltás; a density (g/ml) csak térfogat <-> tömeg között számít. */
  function convert(amount, from, to, density) {
    var a = UNITS[from], b = UNITS[to];
    var d = density > 0 ? density : 1;
    if (a.type === b.type) return amount * a.f / b.f;
    if (a.type === 'v') return amount * a.f * d / b.f;
    return amount * a.f / d / b.f;
  }

  /** Magyar számformátum, ~3 értékes jegy, felesleges nullák nélkül. */
  function fmt(n) {
    if (!isFinite(n)) return '–';
    if (n === 0) return '0';
    var a = Math.abs(n);
    var d = Math.min(6, Math.max(0, 2 - Math.floor(Math.log10(a))));
    var s = n.toFixed(d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('.', ',');
  }

  /** Konyhai kerekítés grammra: 100 g felett 5 g-os, 10 g felett 1 g-os lépés stb. */
  function niceMass(g) {
    var a = Math.abs(g);
    var step = a >= 100 ? 5 : a >= 10 ? 1 : a >= 1 ? 0.5 : 0.1;
    return Math.round(g / step) * step;
  }

  var VOL_STEP = { ml: 5, dl: 0.1, l: 0.01, bogre: 0.1, pohar: 0.1, evokanal: 0.25, teaskanal: 0.25 };

  /** Konyhai kerekítés térfogat-mértékegységekre. */
  function niceVol(x, unit) {
    var step = VOL_STEP[unit] || 0.1;
    var r = Math.round(x / step) * step;
    return r === 0 ? x : r;
  }

  var KA = {
    UNITS: UNITS,
    VOLUME_ORDER: VOLUME_ORDER,
    MASS_ORDER: MASS_ORDER,
    convert: convert,
    fmt: fmt,
    niceMass: niceMass,
    niceVol: niceVol
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = KA;
  else root.KA = KA;
})(this);
