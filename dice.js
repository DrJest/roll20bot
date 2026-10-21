// crypto.randomInt non destrutturato, così i test possono sostituirlo con mock.method.
const crypto = require("crypto");

async function dice(max, min) {
  if (typeof min === "undefined") min = 1;
  return {
    type: `D${max}`,
    value: crypto.randomInt(min, Number(max) + 1)
  };
}

// D100 come due d10 da 0 a 9 (unità e decine); 00 vale 100.
async function roll(max) {
  if (max === 100) {
    let d10 = await dice(9, 0),
      d100 = await dice(9, 0),
      value;
    if (d100.value === 0 && d10.value === 0) value = 100;
    else value = d10.value + d100.value * 10;
    return {
      type: "D100",
      value
    };
  }
  return dice(max);
}

module.exports = { dice, roll };
