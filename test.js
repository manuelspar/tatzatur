'use strict';
var assert = require('assert');
var T = require('./tatzatur.js');
var n = 0;
function ok(name, fn) { fn(); n++; console.log('ok - ' + name); }
function rt(s) { assert.strictEqual(T.decode(T.encode(s)), s, JSON.stringify(s)); }

var layoutChars = T.LAYOUT.rows.map(function (r) { return r.main + r.shift; }).join('') + ' ';

ok('Round-Trip Einzelfälle', function () {
  ['', 'Hallo Welt', layoutChars, 'äöüÄÖÜß', 'a\nb\r\nc', 'a\tb\t', '  vorn und hinten  ', ' ', '\n', '\t',
    '🐱🐾', 'x🐱y🐾z', '1a!2b?3c.;:', 'é€ñ', ' '].forEach(rt);
});
ok('Round-Trip 10.000 Zufallsstrings', function () {
  var pool = Array.from(layoutChars + ' \n\t').concat(['🐱', '🐾', 'é', '€', '漢', '\r', ' ']);
  var seed = 12345;
  function r() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  for (var k = 0; k < 10000; k++) {
    var len = (r() * 201) | 0, s = '';
    for (var j = 0; j < len; j++) s += pool[(r() * pool.length) | 0];
    rt(s);
  }
});
ok('Kein Whitespace außer Originalen, nie am Rand', function () {
  var ws = /\s/g;
  ['Hallo Welt', ' a b\nc\t ', layoutChars, '   '].forEach(function (s) {
    var e = T.encode(s);
    assert.strictEqual((e.match(ws) || []).length, (s.match(ws) || []).length);
    assert.ok(!/^\s/.test(e) && !/\s$/.test(e));
  });
});
ok('Deterministisch', function () {
  assert.strictEqual(T.encode('Hallo Welt 🐱'), T.encode('Hallo Welt 🐱'));
});
ok('Müll liefert Fehler statt Crash', function () {
  assert.throws(function () { T.decode('ab'); }, /Kein gültiger Tatzatur-Text/);
  assert.throws(function () { T.decode('abcdefghijklmnopqrstuvwxyz'.slice(0, 1)); }, /Kein gültiger/);
  var e = T.encode('Hallo');
  assert.throws(function () { T.decode(e.slice(0, -1)); }, /Kein gültiger/);
});
ok('Ziffern/Sonderzeichen im Output', function () {
  var e = T.encode('Hallo Welt');
  assert.ok(/[0-9]/.test(e), e);
  assert.ok(/[^A-Za-z0-9\s]/.test(e), e);
});
ok('Nachbarn', function () {
  var nb = T.neighbors('g');
  ['f', 'h', 'z', 't', 'v', 'c'].forEach(function (c) { assert.ok(nb.indexOf(c) >= 0, c); });
  assert.strictEqual(T.neighbors('c').indexOf(' '), -1);
});
function rtk(s, k) { assert.strictEqual(T.decode(T.encode(s, k), k), s, JSON.stringify([s, k])); }
function mkr(seed) { return function () { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
var kpool = Array.from('abcXYZ019 äöüß€🐱🐾漢!?#\n\t');
function randKey(r) { var l = 1 + ((r() * 20) | 0), k = ''; for (var j = 0; j < l; j++) k += kpool[(r() * kpool.length) | 0]; return k; }
function randStr(r, max) {
  var pool = Array.from(layoutChars + ' \n\t').concat(['🐱', '🐾', 'é', '€', '漢']), len = (r() * max) | 0, s = '';
  for (var j = 0; j < len; j++) s += pool[(r() * pool.length) | 0];
  return s;
}

ok('Ohne Key: altes Verhalten exakt', function () {
  assert.strictEqual(T.encode('Hallo Welt'), 'bHBgBwaq<OPlm,löK8Io)Cb mQs!WS§eRMlÖrGtF%');
  ['Hallo Welt', 'äö 🐱', ''].forEach(function (s) {
    assert.strictEqual(T.encode(s, ''), T.encode(s));
    assert.strictEqual(T.encode(s, undefined), T.encode(s));
    assert.strictEqual(T.encode(s, null), T.encode(s));
    assert.strictEqual(T.decode(T.encode(s), ''), s);
  });
});
ok('Key: Round-Trip Einzelfälle', function () {
  ['', 'Hallo Welt', layoutChars, 'äöüÄÖÜß', 'a\nb\r\nc', '  vorn und hinten  ', ' ', '🐱🐾', 'é€ñ'].forEach(function (s) {
    ['x', 'Geheim 123', ' ', 'ä🐱 ', 'a'.repeat(500)].forEach(function (k) { rtk(s, k); });
  });
});
ok('Key: Round-Trip 5.000 Zufallsstrings mit Zufallspasswörtern', function () {
  var r = mkr(777);
  for (var k = 0; k < 5000; k++) rtk(randStr(r, 150), randKey(r));
});
ok('Key: verschiedene Keys und Eingaben ergeben verschiedene Ausgaben', function () {
  var outs = ['abc', 'abd', 'Abc', 'abc '].map(function (s) { return T.encode(s, 'k'); });
  assert.strictEqual(new Set(outs).size, 4);
  ['Hallo Welt', 'abc', 'x'].forEach(function (s) {
    var e = [undefined, 'a', 'A', 'a ', ' a', 'b', 'ä'].map(function (k) { return T.encode(s, k); });
    assert.strictEqual(new Set(e).size, e.length, s);
  });
  var g0 = T.groupShape(0, 'a'), g1 = T.groupShape(0, 'b'), diff = 0;
  for (var i = 0; i < 50; i++) if (T.groupShape(i, 'a').L !== T.groupShape(i, 'b').L) diff++;
  assert.ok(diff > 10, 'L hängt vom Key ab');
});
ok('Key: falscher Key liefert Fehler oder anderen Text (1.000 Fälle)', function () {
  var r = mkr(4242), bad = 0, tot = 0;
  while (tot < 1000) {
    var s = randStr(r, 60); if (Array.from(s).length < 5) continue;
    var k1 = randKey(r), k2 = randKey(r); if (k1 === k2) continue;
    tot++;
    var e = T.encode(s, k1);
    try { if (T.decode(e, k2) === s) bad++; } catch (x) { assert.ok(/Kein gültiger/.test(x.message)); }
  }
  assert.strictEqual(bad, 0);
});
ok('Key: Whitespace-Regel, Rand und Determinismus', function () {
  ['Hallo Welt', ' a b\nc\t ', layoutChars, '   '].forEach(function (s) {
    var e = T.encode(s, 'Pw 1');
    assert.strictEqual((e.match(/\s/g) || []).length, (s.match(/\s/g) || []).length);
    assert.ok(!/^\s/.test(e) && !/\s$/.test(e));
    assert.strictEqual(e, T.encode(s, 'Pw 1'));
  });
});
console.log('\n' + n + ' Testgruppen bestanden');
