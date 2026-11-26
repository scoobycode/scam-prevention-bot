# Scam Prevention Bot

A Discord bot for reporting Roblox scammers, checking usernames against a scammer database, and linking Roblox accounts to Discord.

Version 2 is a full rewrite for **discord.js v14** with **slash commands**.

## Setup

1. Install [Node.js 22](https://nodejs.org) or newer.
2. In the [Discord Developer Portal](https://discord.com/developers/applications), open the bot's application → **Bot**, and copy (or reset) the token.
3. Copy `.env.example` to `.env` and paste the token after `BOT_TOKEN=`.
4. Install and start:

   ```sh
   npm install
   npm start
   ```

Slash commands register themselves every time the bot starts. Global commands can take a few minutes to show up the first time.

### Re-invite the bot to existing servers

Slash commands need the `applications.commands` scope, which old invites didn't include. Server owners need to re-invite the bot with the link from `/invite` (they don't need to kick it first).

### Optional features

| Setting in `.env` | What it does | Also needs |
| --- | --- | --- |
| `STREAM_STATUS=true` | Shows Scooby's stream as the bot's status while he's live | **Presence Intent** on in the Developer Portal |
| `UPVOTE_RELAY=true` | Posts "Many thanks to … for upvoting" messages | **Message Content Intent** on in the Developer Portal |

Without these, the bot only needs the default intents.

## Commands

**Public:** `/help` `/report` `/cancelreport` `/scamcheck` `/verify` `/getinfo` `/redeem` `/updates` `/buypremium` `/invite` `/server` `/count` `/ping`

**Premium:** `/request` `/banscammers`

**Support** (support server only): `/accept` `/decline` `/addscammer` `/removescammer` `/blacklist` `/unblacklist` `/guildblacklist` `/guildunblacklist` `/open` `/close`

**Owners** (support server only): `/puser` `/generate` `/resetcase` `/setupdates` `/refreshscammers`

## How data is stored

Everything lives in the support server (`config.js`). The bot never creates channels, except one hidden channel for its data:

- **`#list-of-scammers`** is the scammer database: every post there is one scammer. `/addscammer` posts a card, `/removescammer` deletes it.
- **Reports** go to the reports channel, and **staff logs** and premium requests to `#mod-logs`.
- **`#scam-bot-data`** (hidden, bot-only) holds everything else: premium users and codes, blacklists, verified accounts, the `/updates` text and case numbers. The bot creates it if it's missing.

Data is loaded into memory at startup, so commands are instant.

## Development

```sh
npm run lint   # check code style
npm test       # run tests
```
