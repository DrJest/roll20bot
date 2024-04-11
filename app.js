const randomNumber = require("random-number-csprng");
const moment = require("moment");
const emoji = require("node-emoji");
const fetch = require("node-fetch");
process.env.NTBA_FIX_319 = 1;
const TelegramBot = require("node-telegram-bot-api");

const token = process.env.TELEGRAM_TOKEN;

const options = {};

if(!process.env.TELEGRAM_WEBHOOK_URL) {
  options.polling = true;
}
else {
  options.webhook = {
    port: process.env.TELEGRAM_WEBHOOK_PORT,
    key: process.env.TELEGRAM_WEBHOOK_KEY,
    cert: process.env.TELEGRAM_WEBHOOK_CERT
  };
}

const bot = new TelegramBot(token, options);

async function dice(max, min) {
  if (typeof min === "undefined") min = 1;
  return {
    type: `D${max}`,
    value: await randomNumber(min, max)
  };
}

async function roll(max) {
  if (max === 100) {
    let d10 = await dice(10, 0),
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

if(options.webhook) {
  bot.setWebHook(`${process.env.TELEGRAM_WEBHOOK_URL}/bot${token}`);
}

bot.onText(/^\/roll(\d+)(\@[_A-Za-z0-9]+)?$/, async (msg, match) => {
  const faces = parseInt(match[1]);
  if ([2, 4, 6, 8, 10, 12, 20, 100].indexOf(faces) > -1) {
    let dice = await roll(faces);
    let rndm = dice.value;
    await bot.sendMessage(
      msg.chat.id,
      `Hai tirato un D${faces}, il tuo risultato è ${rndm}`
    );
  }
});

bot.onText(/^\/roll (.*)$/, async (msg, match) => {
  const expr = match[1].replace(/\s/g, '');
  if(!expr) return;
  const parts = expr.split('+');
  let total = 0, values = [];
  for( let p of parts ) {
    if(/^\d+[d]\d+$/.test(p)) {
      let a = p.split('d');
      for(let q = 0; q < parseInt(a[0]); ++q) {
        let v = (await roll(a[1])).value;
        total += v;
        values.push(v);
      }
    }
    if(/^\d+$/.test(p)) {
      total += parseInt(p);
      values.push(p);
    }
  }
  await bot.sendMessage(
    msg.chat.id,
    `${expr}: [${values.join('+')}] = ${total}`
  );
});

bot.onText(/^\/venti(\@[_A-Za-z0-9]+)?$/, async (msg, match) => {
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

  await bot.sendMessage(
    msg.chat.id,
    moment().format("DD/MM/YYYY HH:mm:ss") + "\n" + message.join("\n")
  );
});

bot.onText(/^\/location(\@[_A-Za-z0-9]+)?$/, async (msg, match) => {
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
  return bot.sendMessage(msg.chat.id, loc);
});

bot.onText(/^\/santodelgiorno(\@[_A-Za-z0-9]+)?$/, async (msg, match) => {
  let body = await fetch(
    `http://www.santodelgiorno.it/_scriptjs/santodelgiorno.php`
  );
  body = await body.text();

  let opts = {
    reply_to_message_id: msg.message_id,
    parse_mode: "Markdown",
    chatId: msg.chat.id,
    uid: msg.from.id,
    isGroup: msg.chat.id != msg.from.id,
    sender: msg.from.username || msg.from.first_name
	};

  body = body.substr(0, body.indexOf(`document.getElementById`));
  body = `(function(){${body}; \n return { nome: nomeSanto, img: immagine.replace('small','big')}; })()`;
  var santo = eval(body);
  opts.caption = santo.nome
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/(<([^>]+)>)/gi, "");
  const photoOpts = {
    filename: "photo",
    contentType: "image/jpeg"
  };

	let photo = await fetch(santo.img);
	photo = await photo.buffer();
  return bot.sendPhoto(opts.chatId, photo, opts, photoOpts);
});
