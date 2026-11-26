"use strict";

const config = require("../config");

// 0 = everyone, 1 = Scam Reports Support, 2 = Co-Owner / Owner
const LEVELS = { PUBLIC: 0, SUPPORT: 1, OWNER: 2 };
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

/** Works out a user's staff level from their roles in the support server (cached for a minute). */
async function getPermissionLevel(client, userId) {
	const hit = cache.get(userId);
	if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.level;

	let level = LEVELS.PUBLIC;
	const guild = client.guilds.cache.get(config.guilds.support);
	if (guild) {
		const member = await guild.members.fetch({ user: userId, force: true }).catch(() => null);
		if (member) {
			const roles = member.roles.cache;
			if (roles.has(config.roles.support)) level = LEVELS.SUPPORT;
			if (roles.has(config.roles.coOwner) || roles.has(config.roles.owner)) level = LEVELS.OWNER;
		}
	}
	if (userId === config.ownerId) level = LEVELS.OWNER;

	cache.set(userId, { level, at: Date.now() });
	if (cache.size > 5000) cache.delete(cache.keys().next().value);
	return level;
}

module.exports = { LEVELS, getPermissionLevel };
