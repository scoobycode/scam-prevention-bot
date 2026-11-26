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

**Owners** (support server only): `/puser` `/generate` `/resetcase` `/setupdates`

## How data is stored

The bot still keeps its data as messages in private channels of the database server, in the same format as before, so no existing data needs moving. Everything is loaded into memory at startup, so commands don't have to read the channels again. Channel and role IDs live in `config.js`.

## Development

```sh
npm run lint   # check code style
npm test       # run tests
```
