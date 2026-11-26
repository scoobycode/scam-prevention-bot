"use strict";

// Where the bot's data lives:
//   scammers        -> the posts in #list-of-scammers
//   everything else -> tagged messages in the hidden #scam-bot-data channel, e.g. "premium-user 123 0"

const { ChannelStore, fetchAllMessages, formatPair, formatSingle, parsePair, parseSingle, tagged } = require("./db");
const { channelFor } = require("./channels");
const { MetaStore } = require("./meta");
const { ScammerStore } = require("./scammer-store");

function createStores(client) {
	const dataChannel = async () => {
		const channel = channelFor("data");
		return { read: [channel], write: channel };
	};
	const store = (name, tag, kind) => new ChannelStore({
		name,
		resolve: dataChannel,
		...(kind === "pair" ? tagged(tag, parsePair, formatPair) : tagged(tag, parseSingle, formatSingle)),
	});

	const stores = {
		// key: Roblox user ID
		scammers: new ScammerStore(),
		// key: Discord user ID
		blacklistedUsers: store("blacklisted users", "blacklist-user", "single"),
		// key: Discord server ID
		blacklistedGuilds: store("blacklisted servers", "blacklist-server", "single"),
		// key: code, value: months of premium ("0" = forever)
		premiumCodes: store("premium codes", "premium-code", "pair"),
		// key: Discord user ID, value: expiry timestamp in ms ("0" = never)
		premiumUsers: store("premium users", "premium-user", "pair"),
		// key: Discord user ID, value: Roblox user ID
		verified: store("verified accounts", "verified", "pair"),
	};

	// The /updates text and the case counter ("updates:\n…", "case-counter:\n12").
	stores.meta = new MetaStore(() => channelFor("data"));

	stores.loadAll = async () => {
		await stores.scammers.load()
			.then((n) => console.log(`Loaded ${n} scammers from #list-of-scammers.`))
			.catch((err) => console.error("Couldn't load #list-of-scammers:", err.message));

		// Every other kind of data shares #scam-bot-data, so read it once.
		let messages;
		try {
			messages = await fetchAllMessages(channelFor("data"));
		} catch (err) {
			return console.error("Couldn't load #scam-bot-data:", err.message);
		}
		for (const s of Object.values(stores)) {
			if (s instanceof ChannelStore) console.log(`Loaded ${s.loadFrom(messages, channelFor("data"))} ${s.name}.`);
		}
		stores.meta.loadFrom(messages, client.user.id);
	};

	return stores;
}

/** True when the user has premium that hasn't expired. */
function isPremium(stores, userId) {
	const entry = stores.premiumUsers.get(userId);
	if (!entry) return false;
	return entry.value === "0" || Number(entry.value) > Date.now();
}

/** Removes expired premium and DMs the user. */
async function sweepExpiredPremium(client, stores) {
	const now = Date.now();
	for (const entry of [...stores.premiumUsers.values()]) {
		if (entry.value === "0" || Number(entry.value) > now) continue;
		try {
			await stores.premiumUsers.delete(entry.key);
			const user = await client.users.fetch(entry.key);
			await user.send("Your premium has expired!").catch(() => {});
		} catch (err) {
			console.warn("Couldn't remove expired premium:", err);
		}
	}
}

module.exports = { createStores, isPremium, sweepExpiredPremium };
