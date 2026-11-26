"use strict";

const config = require("../config");
const { ChannelStore, formatPair, formatSingle, parsePair, parseSingle } = require("./db");

function createStores(client) {
	const single = (id) => async () => {
		const channel = await client.channels.fetch(id);
		return { read: [channel], write: channel };
	};

	// Verified Roblox accounts are spread across every "roblox-database" channel in the database server.
	const robloxDatabase = async () => {
		const guild = await client.guilds.fetch(config.guilds.database);
		const channels = await guild.channels.fetch();
		const read = [...channels.values()].filter((channel) => channel?.isTextBased() && /roblox-database/i.test(channel.name));
		if (!read.some((channel) => channel.id === config.channels.legacyVerified)) {
			const legacy = await client.channels.fetch(config.channels.legacyVerified).catch(() => null);
			if (legacy) read.push(legacy);
		}
		const write = read.find((channel) => channel.name === "roblox-database") ?? read[0];
		return { read, write };
	};

	const stores = {
		// key: Roblox user ID
		scammers: new ChannelStore({ name: "scammers", resolve: single(config.channels.scammers), parse: parseSingle, format: formatSingle }),
		// key: Discord user ID
		blacklistedUsers: new ChannelStore({ name: "blacklisted users", resolve: single(config.channels.blacklistedUsers), parse: parseSingle, format: formatSingle }),
		// key: Discord server ID
		blacklistedGuilds: new ChannelStore({ name: "blacklisted servers", resolve: single(config.channels.blacklistedGuilds), parse: parseSingle, format: formatSingle }),
		// key: code, value: months of premium ("0" = forever)
		premiumCodes: new ChannelStore({ name: "premium codes", resolve: single(config.channels.premiumCodes), parse: parsePair, format: formatPair }),
		// key: Discord user ID, value: expiry timestamp in ms ("0" = never)
		premiumUsers: new ChannelStore({ name: "premium users", resolve: single(config.channels.premiumUsers), parse: parsePair, format: formatPair }),
		// key: Discord user ID, value: Roblox user ID
		verified: new ChannelStore({ name: "verified accounts", resolve: robloxDatabase, parse: parsePair, format: formatPair }),
	};

	stores.loadAll = async () => {
		const names = Object.keys(stores).filter((name) => stores[name] instanceof ChannelStore);
		const results = await Promise.allSettled(names.map((name) => stores[name].load()));
		results.forEach((result, i) => {
			if (result.status === "fulfilled") console.log(`Loaded ${result.value} ${stores[names[i]].name}.`);
			else console.error(`Couldn't load the ${stores[names[i]].name} database:`, result.reason);
		});
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
