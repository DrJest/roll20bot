# roll20bot

Bot Telegram per le sessioni di gioco di ruolo: tira dadi, genera i Venti della Magia e le locazioni dei colpi (Warhammer Fantasy Roleplay) e manda il santo del giorno.

## Comandi

Tutti i comandi accettano anche il suffisso `@nomebot` (es. `/roll20@roll20bot` o `/roll@roll20bot 2d6`).

| Comando | Cosa fa |
| --- | --- |
| `/rollN` | Tira un dado da N facce. N può essere 2, 4, 6, 8, 10, 12, 20 o 100. Es. `/roll20` → `Hai tirato un D20, il tuo risultato è 14` |
| `/roll <espressione>` | Somma dadi e costanti. Es. `/roll 2d6+1d4+3` → `2d6+1d4+3: [5+2+4+3] = 14` |
| `/venti` | Tira un d10 per ciascuno degli otto Venti della Magia e ne mostra il modificatore |
| `/location` | Locazione del colpo |
| `/santodelgiorno` | Foto e nome del santo del giorno, da [santodelgiorno.it](https://www.santodelgiorno.it) |
| `/help` | Elenco dei comandi |

### Espressioni di `/roll`

- I termini si separano con `+` e gli spazi vengono ignorati (`/roll 2d6 + 3` va bene).
- Un termine è `NdM` (N dadi da M facce, `d` minuscola) oppure un numero intero. N va da 1 a 100, M da 2 a 1000.
- Se un termine non è valido o è fuori dai limiti, il bot non tira niente e risponde con un avviso che elenca i termini sbagliati, seguito da un promemoria della sintassi. Es. `/roll 1d5000+2D6+3` → `Espressione non valida: 1d5000, 2D6`. Non sono supportati la `D` maiuscola, `d6` senza numero di dadi e la sottrazione (`2d6-1`).

### `/venti`

| d10 | Modificatore |
| --- | --- |
| 1 | −30 |
| 2 | −10 |
| 3–4 | 0 |
| 5–8 | +10 |
| 9–10 | +30 |

### `/location`

Tira un d100 e ne inverte le cifre (es. 37 → 73, 05 → 50, 100 → 00), poi consulta la tabella:

| d100 invertito | Locazione |
| --- | --- |
| 00–09 | Testa |
| 10–24 | Braccio Sinistro |
| 25–44 | Braccio Destro |
| 45–79 | Torso |
| 80–89 | Gamba Sinistra |
| 90–99 | Gamba Destra |

## Configurazione

Le variabili d'ambiente vengono lette anche da un file `.env` nella root del progetto (escluso da git e dall'immagine Docker).

| Variabile | Obbligatoria | Descrizione |
| --- | --- | --- |
| `TELEGRAM_TOKEN` | sì | Token del bot, da [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_WEBHOOK_URL` | no | URL pubblico di base (es. `https://bot.example.org`). Se manca, il bot usa il long polling |
| `TELEGRAM_WEBHOOK_PORT` | con il webhook | Porta su cui ascolta il server HTTP del webhook |
| `TELEGRAM_WEBHOOK_SECRET` | no | Se impostata, Telegram la invia nell'header `X-Telegram-Bot-Api-Secret-Token` e il bot rifiuta le richieste senza |

Esempio di `.env` minimo, per il polling:

```sh
TELEGRAM_TOKEN=123456:ABC...
```

### Webhook

Con `TELEGRAM_WEBHOOK_URL` impostata, all'avvio il bot registra su Telegram il webhook `<TELEGRAM_WEBHOOK_URL>/bot<TELEGRAM_TOKEN>` e apre un server HTTP su `TELEGRAM_WEBHOOK_PORT` che risponde solo su quel path. Il server parla HTTP semplice: il TLS va terminato da un reverse proxy davanti al bot (Telegram accetta solo webhook HTTPS).

## Sviluppo

Serve Node.js 24 (la stessa versione dell'immagine Docker).

```sh
npm install
node app.js
npm test
```

I test usano il test runner integrato di Node (`node --test`). Coprono il parsing in `parsers.js` (le espressioni di `/roll` e la risposta di santodelgiorno.it) e i dadi in `dice.js`, compresa la distribuzione del d100. Lo script restituito da santodelgiorno.it viene letto con delle regex, mai eseguito.

### Struttura

- `app.js`: avvio del bot e handler dei comandi
- `dice.js`: tiri di dado, basati su `crypto.randomInt`
- `parsers.js`: funzioni di parsing pure, senza dipendenze
- `test/`: test di `dice.js` e `parsers.js`

## Docker

```sh
docker build -t roll20bot .
docker run --env-file .env roll20bot
```

## Deploy

Il workflow `.github/workflows/docker-image.yml` parte a ogni push sul branch `production`:

1. esegue `npm test`: se un test fallisce, il deploy si ferma qui;
2. builda l'immagine e la pubblica su GHCR come `ghcr.io/<owner>/<repo>:production` e `:<sha corto>`;
3. entra via SSH sul server, aggiorna l'immagine del servizio in `docker-compose.yml` e lancia `docker compose pull` e `docker compose up -d`.

Su GitHub serve un environment chiamato `production` con:

- secret: `SERVER_HOST`, `SERVER_USERNAME`, `SERVER_SSH_KEY`, `DEPLOY_PATH` (cartella sul server che contiene `docker-compose.yml`);
- variabile: `SERVICE_NAME` (nome del servizio del bot in `docker-compose.yml`).

Sul server servono Docker con il plugin Compose e [`yq`](https://github.com/kislyuk/yq) nella versione Python (il workflow usa l'opzione `-y`). Le variabili d'ambiente del bot vanno configurate nel `docker-compose.yml` del server.
