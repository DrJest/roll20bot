const emoji = require("node-emoji");
const { Bot, InputFile, run, startWebhook } = require("node-telegram-bot-api/node");
const dotenv = require("dotenv");
const { dice, roll } = require("./dice");
const { MAX_COUNT, MIN_FACES, MAX_FACES, parseRoll, parseSanto } = require("./parsers");

dotenv.config({ quiet: true });

const token = process.env.TELEGRAM_TOKEN;
if (!token) {
  console.error("TELEGRAM_TOKEN is not set in the environment variables.");
  process.exit(1);
}

const bot = new Bot(token);

const FACES = [2, 4, 6, 8, 10, 12, 20, 100];

// Ogni risposta cita il messaggio con il comando, anche se nel frattempo è stato cancellato.
const replyParams = ctx => ({
  reply_parameters: { message_id: ctx.message.message_id, allow_sending_without_reply: true }
});

bot.hears(/^\/help(\@[_A-Za-z0-9]+)?$/, async (ctx) => {
  await ctx.reply([
    "Comandi disponibili:",
    `${FACES.map(f => `/roll${f}`).join(" ")} – tira un dado con quel numero di facce`,
    `/roll <espressione> – somma dadi e numeri separati da +, es. /roll 2d6+1d4+3 (da 1 a ${MAX_COUNT} dadi, da d${MIN_FACES} a d${MAX_FACES})`,
    "/venti – modificatori dei Venti della Magia",
    "/location – locazione del colpo",
    "/santodelgiorno – foto e nome del santo del giorno",
    "/help – questo messaggio"
  ].join("\n"), replyParams(ctx));
});

bot.hears(/^\/roll(\d+)(\@[_A-Za-z0-9]+)?$/, async (ctx) => {
  const faces = parseInt(ctx.match[1]);
  if (FACES.indexOf(faces) > -1) {
    let dice = await roll(faces);
    let rndm = dice.value;
    await ctx.reply(`Hai tirato un D${faces}, il tuo risultato è ${rndm}`, replyParams(ctx));
  }
});

bot.hears(/^\/roll(\@[_A-Za-z0-9]+)? (.*)$/, async (ctx) => {
  const expr = ctx.match[2].replace(/\s/g, '');
  if(!expr) return;
  const terms = parseRoll(expr);
  const invalid = terms.filter(t => t.type === "invalid").map(t => t.text);
  if(!terms.length || invalid.length) {
    const which = invalid.length ? `: ${invalid.join(", ")}` : "";
    return ctx.reply(
      `Espressione non valida${which}\n` +
      `Usa dadi NdM (da 1 a ${MAX_COUNT} dadi, da d${MIN_FACES} a d${MAX_FACES}) e numeri, separati da +. Es. /roll 2d6+3`,
      replyParams(ctx)
    );
  }
  let total = 0, values = [];
  for( let term of terms ) {
    if(term.type === "dice") {
      for(let q = 0; q < term.count; ++q) {
        let v = (await dice(term.faces)).value;
        total += v;
        values.push(v);
      }
    }
    if(term.type === "number") {
      total += term.value;
      values.push(term.value);
    }
  }
  await ctx.reply(`${expr}: [${values.join('+')}] = ${total}`, replyParams(ctx));
});

bot.hears(/^\/venti(\@[_A-Za-z0-9]+)?$/, async (ctx) => {
  async function getMod(color) {
    let d10 = (await roll(10)).value;
    let mod = -30;
    if (d10 > 1) mod = -10;
    if (d10 > 2) mod = 0;
    if (d10 > 4) mod = 10;
    if (d10 > 8) mod = 30;
    return mod;
  }

  let venti = [
    {
      color: "GIADA",
      emoji: "green_heart",
      name: "Sapere della Vita"
    },
    {
      color: "BLU",
      emoji: "large_blue_diamond",
      name: "Sapere dell'Empireo"
    },
    {
      color: "GRIGIO",
      emoji: "black_circle",
      name: "Sapere delle Ombre"
    },
    {
      color: "AMETISTA",
      emoji: "purple_heart",
      name: "Sapere della Morte"
    },
    {
      color: "ROSSO",
      emoji: "red_circle",
      name: "Sapere del Fuoco"
    },
    {
      color: "AMBRA",
      emoji: "yellow_heart",
      name: "Sapere delle Bestie"
    },
    {
      color: "BIANCO",
      emoji: "white_circle",
      name: "Sapere della Luce"
    },
    {
      color: "ORO",
      emoji: "trophy",
      name: "Sapere del Metallo"
    }
  ];

  let promises = venti.map(async v => {
    return `${emoji.get(v.emoji)} ${v.name} : ${await getMod(v.color)}`;
  });

  const message = await Promise.all(promises);

  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const date = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  await ctx.reply(`${date} ${time}` + "\n" + message.join("\n"), replyParams(ctx));
});

bot.hears(/^\/location(\@[_A-Za-z0-9]+)?$/, async (ctx) => {
  let d = (await roll(100)).value;
  if( d < 10 ) d = '0' + d;
  if( d == 100 ) d = '00';
  d = d.toString() .split('').reverse().join('');
  d = parseInt(d);
  let loc = "Testa";
  if(d>9) loc = "Braccio Sinistro";
  if(d>24) loc = "Braccio Destro";
  if(d>44) loc = "Torso";
  if(d>79) loc = "Gamba Sinistra";
  if(d>89) loc = "Gamba Destra";
  return ctx.reply(loc, replyParams(ctx));
});

bot.hears(/^\/santodelgiorno(\@[_A-Za-z0-9]+)?$/, async (ctx) => {
  const msg = ctx.message;
  let body = await fetch(
    `https://www.santodelgiorno.it/_scriptjs/santodelgiorno.php`
  );
  const santo = parseSanto(await body.text());

  let photo = await fetch(santo.img);
  photo = new Uint8Array(await photo.arrayBuffer());
  return bot.api.sendPhoto({
    chat_id: msg.chat.id,
    photo: new InputFile(photo, { filename: "photo.jpg", contentType: "image/jpeg" }),
    caption: santo.caption,
    parse_mode: "Markdown",
    ...replyParams(ctx)
  });
});

async function start() {
  if(!process.env.TELEGRAM_WEBHOOK_URL) {
    return run(bot);
  }
  // Il path contenente il token resta l'autenticazione di default;
  // TELEGRAM_WEBHOOK_SECRET (opzionale) aggiunge il controllo dell'header secret_token.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || undefined;
  const path = `/bot${token}`;
  await bot.api.setWebhook({
    url: `${process.env.TELEGRAM_WEBHOOK_URL}${path}`,
    secret_token: secret
  });
  return startWebhook(bot, {
    port: Number(process.env.TELEGRAM_WEBHOOK_PORT),
    path,
    secretToken: secret,
    allowUnauthenticated: !secret
  });
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
