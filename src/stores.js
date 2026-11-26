"use strict";

const { ChannelStore, fetchAllMessages, formatPair, formatSingle, parsePair, parseSingle } = require("./db");
const { channelFor, hasChannel } = require("./channels");
const { MetaStore } = require("./meta");

function createStores(client) {
	const single = (key) => async () => {
		const channel = channelFor(key);
		return { read: [channel], write: channel };
	};

	const stores = {
		// key: Roblox user ID
		scammers: new ChannelStore({ name: "scammers", resolve: single("scammers"), parse: parseSingle, format: formatSingle }),
		// key: Discord user ID
		blacklistedUsers: new ChannelStore({ name: "blacklisted users", resolve: single("blacklistedUsers"), parse: parseSingle, format: formatSingle }),
		// key: Discord server ID
		blacklistedGuilds: new ChannelStore({ name: "blacklisted servers", resolve: single("blacklistedGuilds"), parse: parseSingle, format: formatSingle }),
		// key: code, value: months of premium ("0" = forever)
		premiumCodes: new ChannelStore({ name: "premium codes", resolve: single("premiumCodes"), parse: parsePair, format: formatPair }),
		// key: Discord user ID, value: expiry timestamp in ms ("0" = never)
		premiumUsers: new ChannelStore({ name: "premium users", resolve: single("premiumUsers"), parse: parsePair, format: formatPair }),
		// key: Discord user ID, value: Roblox user ID
		verified: new ChannelStore({ name: "verified accounts", resolve: single("verified"), parse: parsePair, format: formatPair }),
	};

	// The /updates text and the case counter.
	const meta = new MetaStore(() => channelFor("settings"));

	stores.meta = meta;
	stores.loadAll = async () => {
		const names = Object.keys(stores).filter((name) => stores[name] instanceof ChannelStore);
		const results = await Promise.allSettled(names.map((name) => stores[name].load()));
		results.forEach((result, i) => {
			if (result.status === "fulfilled") console.log(`Loaded ${result.value} ${stores[names[i]].name}.`);
			else console.error(`Couldn't load the ${stores[names[i]].name} database: ${result.reason?.message ?? result.reason}`);
		});
		await meta.load(client.user.id).catch((err) => console.error("Couldn't load bot settings:", err.message));
	};

	return stores;
}

/**
 * The old database server is gone, but #list-of-scammers still has a post for every scammer.
 * When the scammer database is empty, rebuild it from those posts. Runs in the background.
 */
async function seedScammersFromPosts(stores) {
	if (stores.scammers.size > 0 || !hasChannel("scammerPosts")) return;
	const posts = await fetchAllMessages(channelFor("scammerPosts"));
	const ids = [...new Set(posts.reverse().flatMap((m) => [...m.content.matchAll(/roblox\.com\/users\/(\d+)/g)].map((match) => match[1])))];
	if (!ids.length) return;
	console.log(`Rebuilding the scammer database from #list-of-scammers (${ids.length} scammers)…`);
	let saved = 0;
	for (const id of ids) {
		if (stores.scammers.has(id)) continue;
		try {
			await stores.scammers.set({ key: id });
			saved++;
		} catch (err) {
			console.warn(`Couldn't save scammer ${id}:`, err.message);
		}
	}
	console.log(`Scammer database rebuilt: ${saved} scammers saved.`);
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

module.exports = { createStores, isPremium, seedScammersFromPosts, sweepExpiredPremium };
