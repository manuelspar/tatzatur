(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Tatzatur = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Reihen: [Hauptebene, Shift-Ebene, x-Versatz in Tastenbreiten]
  var ROWS = [
    ['^1234567890ß´', '°!"§$%&/()=?`', 0],
    ['qwertzuiopü+', 'QWERTZUIOPÜ*', 0.5],
    ['asdfghjklöä#', 'ASDFGHJKLÖÄ\'', 0.75],
    ['<yxcvbnm,.-', '>YXCVBNM;:_', 1.25]
  ];
  var SPACE = { x: 4.25, w: 5, row: 4 };

  // keys: { main, shift, x, row }
  var KEYS = [];
  ROWS.forEach(function (r, ri) {
    var m = Array.from(r[0]), s = Array.from(r[1]);
    m.forEach(function (c, i) { KEYS.push({ main: c, shift: s[i], x: r[2] + i, row: ri }); });
  });
  var LAYOUT = {
    rows: ROWS.map(function (r) { return { main: r[0], shift: r[1], offset: r[2] }; }),
    space: SPACE,
    keys: KEYS
  };

  var KEY_OF = {};
  KEYS.forEach(function (k) { KEY_OF[k.main] = k; KEY_OF[k.shift] = k; });

  var SPACE_NEIGHBORS = ['c', 'v', 'b', 'n', 'm'];
  var FALLBACK = Array.from('abcdefghijklmnopqrstuvwxyz0123456789#+*-_.,;:!?%&/()=<>');

  function isWs(c) { return /\s/.test(c); }

  function keyNeighbors(k) {
    return KEYS.filter(function (o) {
      if (o === k) return false;
      var dx = Math.abs(o.x - k.x), dy = Math.abs(o.row - k.row);
      return (dy === 0 && dx === 1) || (dy === 1 && dx < 1);
    });
  }

  var POOLS = {};
  function neighbors(ch) {
    if (POOLS[ch]) return POOLS[ch].slice();
    var out = [];
    if (ch === ' ') {
      SPACE_NEIGHBORS.forEach(function (c) { out.push(c, KEY_OF[c].shift); });
    } else if (KEY_OF[ch]) {
      keyNeighbors(KEY_OF[ch]).forEach(function (o) {
        // Space gehört nicht zu den Füllzeichen der Buchstabentasten
        out.push(o.main, o.shift);
      });
    }
    out = out.filter(function (c) { return !isWs(c); });
    POOLS[ch] = out;
    return out.slice();
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(i) {
    var h = Math.imul(i + 1, 0x9E3779B1) ^ 0x85EBCA6B;
    h = Math.imul(h ^ (h >>> 16), 0x7FEB352D);
    h = Math.imul(h ^ (h >>> 15), 0x846CA68B);
    return (h ^ (h >>> 16)) | 0;
  }

  // 32-Bit-Hash (FNV-1a mit Avalanche) über die Codepoints des Passworts; leer = kein Schlüssel.
  function keyHash(key) {
    if (key === undefined || key === null || key === '') return null;
    var h = 0x811C9DC5;
    Array.from(String(key)).forEach(function (c) {
      h = Math.imul(h ^ c.codePointAt(0), 0x01000193);
    });
    h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B);
    h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35);
    return (h ^ (h >>> 16)) | 0;
  }

  // Seed je Position: ohne Schlüssel wie bisher, mit Schlüssel zweistufig verwürfelt.
  function seedFor(i, key) {
    var kh = keyHash(key);
    if (kh === null) return hash(i);
    var h = hash((hash(i) ^ kh) | 0);
    h = Math.imul(h ^ kh, 0xC2B2AE35);
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D);
    return (h ^ (h >>> 16)) | 0;
  }

  // Gemeinsame Form für Encoder und Decoder: nur von Index und Schlüssel abhängig.
  function groupShape(i, key) {
    var rng = mulberry32(seedFor(i, key));
    var L = 3 + ((rng() * 3) | 0);
    var p = 1 + ((rng() * (L - 2)) | 0);
    return { L: L, p: p, rng: rng };
  }

  function group(ch, i, key) {
    var s = groupShape(i, key);
    var pool = neighbors(ch);
    if (!pool.length) pool = FALLBACK;
    var cells = [];
    for (var j = 0; j < s.L; j++) {
      cells.push(j === s.p ? ch : pool[(s.rng() * pool.length) | 0]);
    }
    return { chars: cells, p: s.p };
  }

  function encode(str, key) {
    return Array.from(String(str)).map(function (ch, i) { return group(ch, i, key).chars.join(''); }).join('');
  }

  function decode(str, key) {
    var cps = Array.from(String(str)), out = '', pos = 0, i = 0;
    while (pos < cps.length) {
      var s = groupShape(i++, key);
      if (pos + s.L > cps.length) throw new Error('Kein gültiger Tatzatur-Text');
      out += cps[pos + s.p];
      pos += s.L;
    }
    return out;
  }

  return { encode: encode, decode: decode, neighbors: neighbors, group: group, groupShape: groupShape, keyHash: keyHash, LAYOUT: LAYOUT, keyOf: function (c) { return KEY_OF[c] || null; } };
});
