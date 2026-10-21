const MAX_COUNT = 100;
const MIN_FACES = 2;
const MAX_FACES = 1000;

function parseTerm(p) {
  if (/^\d+$/.test(p)) return { type: "number", value: parseInt(p) };
  const m = p.match(/^(\d+)d(\d+)$/);
  if (m) {
    const count = parseInt(m[1]), faces = parseInt(m[2]);
    if (count >= 1 && count <= MAX_COUNT && faces >= MIN_FACES && faces <= MAX_FACES) {
      return { type: "dice", count, faces };
    }
  }
  return { type: "invalid", text: p };
}

// Converte un'espressione tipo "2d6+1d4+3" (senza spazi) in una lista di termini.
// Le parti non riconosciute o fuori dai limiti (da 1 a 100 dadi, da d2 a d1000)
// diventano termini "invalid"; quelle vuote (es. "2d6++3") vengono saltate.
function parseRoll(expr) {
  return expr.split("+").filter(p => p).map(parseTerm);
}

// Legge il valore di `var <name> = '...'` da uno script JS, senza eseguirlo.
function readStringVar(script, name) {
  const match = script.match(
    new RegExp(`var\\s+${name}\\s*=\\s*(['"])((?:\\\\.|(?!\\1)[^\\\\])*)\\1`)
  );
  if (!match) throw new Error(`Variabile ${name} non trovata nello script`);
  return match[2].replace(/\\(.)/g, (_, c) => ({ n: "\n", r: "\r", t: "\t" })[c] ?? c);
}

// Estrae nome (come testo, per la caption) e URL della foto grande dallo script
// restituito da santodelgiorno.it.
function parseSanto(script) {
  const nome = readStringVar(script, "nomeSanto");
  const immagine = readStringVar(script, "immagine");
  return {
    caption: nome
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/(<([^>]+)>)/gi, ""),
    img: immagine.replace("small", "big")
  };
}

module.exports = { MAX_COUNT, MIN_FACES, MAX_FACES, parseRoll, parseSanto };
