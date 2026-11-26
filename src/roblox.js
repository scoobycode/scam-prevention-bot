"use strict";

// Talks to Roblox's official web APIs directly (the old roblox-js package stopped working years ago).

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 500;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

let fetchImpl = (...args) => globalThis.fetch(...args);
const cache = new Map();

class RobloxError extends Error {
	name = "RobloxError";
}

function cached(key, load) {
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.promise;
	const promise = load();
	cache.set(key, { at: Date.now(), promise });
	promise.catch(() => cache.delete(key));
	if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
	return promise;
}

async function robloxFetch(url, init = {}) {
	let response;
	try {
		response = await fetchImpl(url, {
			...init,
			headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}) },
			signal: AbortSignal.timeout(8000),
		});
	} catch (err) {
		throw new RobloxError("Couldn't reach Roblox. Please try again in a moment.", { cause: err });
	}
	if (response.status === 404 || response.status === 400) return null;
	if (response.status === 429) throw new RobloxError("Roblox is rate limiting requests right now. Please try again in a minute.");
	if (!response.ok) throw new RobloxError(`Roblox returned an error (${response.status}). Please try again later.`);
	return response.json();
}

/** Looks up a user by exact username. Returns { id, name, displayName } or null. */
function findUserByUsername(username) {
	return cached(`name:${username.toLowerCase()}`, async () => {
		const body = await robloxFetch("https://users.roblox.com/v1/usernames/users", {
			method: "POST",
			body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
		});
		const user = body?.data?.[0];
		return user ? { id: String(user.id), name: user.name, displayName: user.displayName } : null;
	});
}

/** Full profile by ID: { id, name, displayName, description, created, isBanned } or null. */
function getUser(id) {
	return cached(`user:${id}`, async () => {
		const user = await robloxFetch(`https://users.roblox.com/v1/users/${encodeURIComponent(id)}`);
		return user ? { ...user, id: String(user.id) } : null;
	});
}

/** Same as getUser but always asks Roblox (used for verification, where the bio just changed). */
async function getUserFresh(id) {
	cache.delete(`user:${id}`);
	return getUser(id);
}

function getFriendCount(id) {
	return cached(`friends:${id}`, async () => {
		const body = await robloxFetch(`https://friends.roblox.com/v1/users/${encodeURIComponent(id)}/friends/count`);
		return typeof body?.count === "number" ? body.count : null;
	});
}

/**
 * Picture of a user's Roblox avatar, or null.
 * kind: "headshot" (face, good for small thumbnails) or "full" (whole body).
 */
function getAvatarUrl(id, kind = "full") {
	const endpoint = kind === "headshot" ? "avatar-headshot" : "avatar";
	return cached(`avatar:${kind}:${id}`, async () => {
		const url = `https://thumbnails.roblox.com/v1/users/${endpoint}?userIds=${encodeURIComponent(id)}&size=420x420&format=Png&isCircular=false`;
		// Roblox sometimes needs a moment to render an avatar it hasn't drawn recently.
		for (let attempt = 0; attempt < 3; attempt++) {
			const image = (await robloxFetch(url))?.data?.[0];
			if (image?.state === "Completed" && image.imageUrl) return image.imageUrl;
			if (image?.state !== "Pending") return null;
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
		return null;
	});
}

/** Same as getAvatarUrl, but never throws (an avatar is never worth failing a command over). */
const tryAvatarUrl = (id, kind) => getAvatarUrl(id, kind).catch(() => null);

/** Looks up to 100 users per request. Returns a Map of id -> { id, name, displayName }; missing IDs are left out. */
async function getUsersBatch(ids) {
	const users = new Map();
	for (let i = 0; i < ids.length; i += 100) {
		const chunk = ids.slice(i, i + 100).map(Number);
		const body = await robloxFetch("https://users.roblox.com/v1/users", {
			method: "POST",
			body: JSON.stringify({ userIds: chunk, excludeBannedUsers: false }),
		});
		for (const user of body?.data ?? []) users.set(String(user.id), { id: String(user.id), name: user.name, displayName: user.displayName });
	}
	return users;
}

/** Full-body avatar pictures for up to 100 users per request. Returns a Map of id -> image URL. */
async function getAvatarUrlsBatch(ids) {
	const urls = new Map();
	for (let i = 0; i < ids.length; i += 100) {
		let pending = ids.slice(i, i + 100);
		for (let attempt = 0; attempt < 3 && pending.length; attempt++) {
			if (attempt) await new Promise((resolve) => setTimeout(resolve, 1500));
			const body = await robloxFetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${pending.join(",")}&size=420x420&format=Png&isCircular=false`);
			for (const image of body?.data ?? []) {
				if (image.state === "Completed" && image.imageUrl) urls.set(String(image.targetId), image.imageUrl);
			}
			const stillPending = new Set((body?.data ?? []).filter((image) => image.state === "Pending").map((image) => String(image.targetId)));
			pending = pending.filter((id) => stillPending.has(String(id)));
		}
	}
	return urls;
}

/** Accepts a username (or a numeric user ID) and returns { id, name, displayName } or null. */
async function resolveUser(input) {
	const value = String(input ?? "").trim();
	const numeric = /^\d+$/.test(value);
	if (!USERNAME_PATTERN.test(value) && !numeric) return null;
	if (USERNAME_PATTERN.test(value)) {
		const byName = await findUserByUsername(value);
		if (byName) return byName;
	}
	if (numeric) {
		const byId = await getUser(value);
		if (byId) return { id: byId.id, name: byId.name, displayName: byId.displayName };
	}
	return null;
}

const profileUrl = (id) => `https://www.roblox.com/users/${id}/profile`;

module.exports = {
	RobloxError,
	findUserByUsername,
	getAvatarUrl,
	getAvatarUrlsBatch,
	getFriendCount,
	getUser,
	getUserFresh,
	getUsersBatch,
	profileUrl,
	resolveUser,
	tryAvatarUrl,
	// For tests.
	_setFetch(fn) {
		fetchImpl = fn;
		cache.clear();
	},
};
