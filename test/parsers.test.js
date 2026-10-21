const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { parseRoll, parseSanto } = require("../parsers");

describe("parseRoll", () => {
  test("singolo gruppo di dadi", () => {
    assert.deepEqual(parseRoll("2d6"), [{ type: "dice", count: 2, faces: 6 }]);
  });

  test("dadi e costanti sommati", () => {
    assert.deepEqual(parseRoll("2d6+1d4+3"), [
      { type: "dice", count: 2, faces: 6 },
      { type: "dice", count: 1, faces: 4 },
      { type: "number", value: 3 }
    ]);
  });

  test("numeri a più cifre vengono convertiti in Number", () => {
    assert.deepEqual(parseRoll("10d100+15"), [
      { type: "dice", count: 10, faces: 100 },
      { type: "number", value: 15 }
    ]);
  });

  test("solo costante", () => {
    assert.deepEqual(parseRoll("5"), [{ type: "number", value: 5 }]);
  });

  test("le parti non valide restano nella lista come invalid, quelle vuote vengono saltate", () => {
    assert.deepEqual(parseRoll("2d6+abc++3+"), [
      { type: "dice", count: 2, faces: 6 },
      { type: "invalid", text: "abc" },
      { type: "number", value: 3 }
    ]);
    assert.deepEqual(parseRoll("+"), []);
  });

  test("limiti: da 1 a 100 dadi, da 2 a 1000 facce", () => {
    assert.deepEqual(parseRoll("1d2+100d1000"), [
      { type: "dice", count: 1, faces: 2 },
      { type: "dice", count: 100, faces: 1000 }
    ]);
    const outOfRange = ["1d0", "1d1", "0d6", "101d6", "1d1001", "999999999d6"];
    assert.deepEqual(
      parseRoll(outOfRange.join("+")),
      outOfRange.map(text => ({ type: "invalid", text }))
    );
  });

  test("formati non supportati", () => {
    for (const text of ["2D6", "d6", "2d6-1", "2d"]) {
      assert.deepEqual(parseRoll(text), [{ type: "invalid", text }]);
    }
  });
});

// Risposta reale di santodelgiorno.it (21/10/2026), accorciata; righe separate da CRLF.
const SANTO_SCRIPT = [
  "var nomeSanto = '<b>Beato Giuseppe Puglisi</b><br /><i>Presbitero</i>';",
  "var immagine = 'https://www.santodelgiorno.it/foto/santo8236small.jpg';",
  "var descrizione = '<br /><span style=\"font-size: 14px;\">Don Giuseppe Puglisi nacque a Brancaccio...</span>'",
  "document.getElementById(\"SantoDelGiorno\").innerHTML = nomeSanto;",
  "document.getElementById(\"Immagine\").setAttribute(\"src\",immagine);",
  ""
].join("\r\n");

function santoScript(nome, immagine = "https://example.org/santo1small.jpg") {
  return `var nomeSanto = '${nome}';\nvar immagine = '${immagine}';\n`;
}

describe("parseSanto", () => {
  test("risposta reale: caption in testo e foto grande", () => {
    assert.deepEqual(parseSanto(SANTO_SCRIPT), {
      caption: "Beato Giuseppe Puglisi\nPresbitero",
      img: "https://www.santodelgiorno.it/foto/santo8236big.jpg"
    });
  });

  test("tutte le varianti di <br> diventano a capo", () => {
    const { caption } = parseSanto(santoScript("A<br>B<br/>C<BR />D"));
    assert.equal(caption, "A\nB\nC\nD");
  });

  test("apostrofi con escape", () => {
    const { caption } = parseSanto(santoScript("Sant\\'Antonio Abate"));
    assert.equal(caption, "Sant'Antonio Abate");
  });

  test("stringhe tra doppi apici", () => {
    const script = `var nomeSanto = "Sant'Agata";\nvar immagine = "https://example.org/xsmall.jpg";`;
    assert.deepEqual(parseSanto(script), {
      caption: "Sant'Agata",
      img: "https://example.org/xbig.jpg"
    });
  });

  test("lo script non viene eseguito", () => {
    const script = "globalThis.santoEseguito = true;\n" + santoScript("San Mario");
    assert.equal(parseSanto(script).caption, "San Mario");
    assert.equal(globalThis.santoEseguito, undefined);
  });

  test("errore se manca una variabile", () => {
    assert.throws(
      () => parseSanto("var immagine = 'https://example.org/a.jpg';"),
      /nomeSanto/
    );
  });
});
