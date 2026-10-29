# Tatzatur

Tatzatur codiert Text so, als wäre eine Katze über eine deutsche QWERTZ-Tastatur gelaufen: Jedes Zeichen wird von Zeichen seiner Nachbartasten umgeben. Der Katzentext lässt sich verlustfrei zurückverwandeln, optional mit einem Passwort.

Live-Demo: https://manuelspar.github.io/tatzatur/

```
Hallo Welt  →  bHBgBwaq<OPlm,löK8Io)Cb mQs!WS§eRMlÖrGtF%
```

## So funktioniert es

- Jedes Zeichen des Eingabetexts wird zu einer Gruppe aus 3 bis 5 Zeichen. Das Original steht darin nie an erster oder letzter Stelle.
- Die Füllzeichen stammen von den direkt benachbarten Tasten, jeweils Haupt- und Shift-Belegung. Für das Leerzeichen sind das `c v b n m` und ihre Großbuchstaben. Zeichen, die nicht auf dem Layout liegen (etwa `é`, `€`, Emoji), bekommen Füllzeichen aus einem festen Ersatzvorrat.
- Länge und Position des Originals in jeder Gruppe hängen nur vom Index des Zeichens und vom Passwort ab, nicht vom Zeichen selbst. Der Decoder rechnet dieselbe Folge nach und liest an jeder Gruppe das Original ab.
- Füllzeichen sind nie Whitespace. Leerzeichen, Tabs und Zeilenumbrüche bleiben in Anzahl erhalten, und der Katzentext beginnt und endet nie mit Whitespace.
- Die Ausgabe ist deterministisch: gleicher Text und gleiches Passwort ergeben immer denselben Katzentext.
- Das Passwort verändert Länge und Position jeder Gruppe. Mit falschem Passwort liefert `decode` einen Fehler oder einen anderen Text.

Tatzatur ist keine Verschlüsselung. Die Originalzeichen stehen in ihrer Reihenfolge im Katzentext, das Passwort bestimmt nur, an welchen Stellen.

## Nutzung

`tatzatur.js` hat keine Abhängigkeiten und läuft ohne Build.

Im Browser:

```html
<script src="tatzatur.js"></script>
<script>
  const katze = Tatzatur.encode('Hallo Welt', 'Geheim');
  const klar  = Tatzatur.decode(katze, 'Geheim'); // 'Hallo Welt'
</script>
```

In Node:

```js
const { encode, decode } = require('./tatzatur.js');

encode('Hallo Welt');                 // ohne Passwort
const katze = encode('Hallo Welt', 'Geheim');
decode(katze, 'Geheim');              // 'Hallo Welt'
decode(katze, 'falsch');              // wirft Error: Kein gültiger Tatzatur-Text
```

- `encode(text, key?)` gibt den Katzentext zurück.
- `decode(text, key?)` gibt den Klartext zurück oder wirft `Error('Kein gültiger Tatzatur-Text')`, wenn der Text nicht zur erwarteten Gruppenfolge passt.
- `key` ist optional. Ein leerer String, `undefined` und `null` bedeuten jeweils „kein Passwort“.

Daneben exportiert das Modul `neighbors`, `group`, `groupShape`, `keyHash`, `keyOf` und `LAYOUT`, die die Demo für die Tastatur-Animation nutzt.

## Tests

```sh
node test.js
```

Die Tests prüfen unter anderem den Round-Trip für 10.000 Zufallstexte ohne und 5.000 mit Passwort, die Whitespace-Regel und 1.000 Fälle mit falschem Passwort.
