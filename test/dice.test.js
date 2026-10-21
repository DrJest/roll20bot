const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { dice, roll } = require("../dice");

describe("dice", () => {
  test("tira da 1 a N compresi", async (t) => {
    const randomInt = t.mock.method(crypto, "randomInt", () => 4);
    assert.deepEqual(await dice(6), { type: "D6", value: 4 });
    assert.deepEqual(randomInt.mock.calls[0].arguments, [1, 7]);
  });
});

describe("roll(100)", () => {
  test("i due d10 vanno da 0 a 9 e ogni risultato da 1 a 100 esce una volta sola", async (t) => {
    let queue = [];
    const randomInt = t.mock.method(crypto, "randomInt", () => queue.shift());

    const results = [];
    for (let units = 0; units < 10; ++units) {
      for (let tens = 0; tens < 10; ++tens) {
        queue = [units, tens];
        results.push((await roll(100)).value);
      }
    }

    for (const call of randomInt.mock.calls) {
      assert.deepEqual(call.arguments, [0, 10]);
    }
    assert.deepEqual(
      results.sort((a, b) => a - b),
      Array.from({ length: 100 }, (_, i) => i + 1)
    );
  });

  test("00 vale 100", async (t) => {
    t.mock.method(crypto, "randomInt", () => 0);
    assert.deepEqual(await roll(100), { type: "D100", value: 100 });
  });
});
