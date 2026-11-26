"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const roblox = require("../src/roblox");

const json = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

test("resolveUser looks up a username", async () => {
	let calls = 0;
	roblox._setFetch(async (url, init) => {
		calls++;
		assert.equal(url, "https://users.roblox.com/v1/usernames/users");
		assert.deepEqual(JSON.parse(init.body).usernames, ["Builderman"]);
		return json(200, { data: [{ id: 156, name: "builderman", displayName: "Builderman" }] });
	});
	assert.deepEqual(await roblox.resolveUser("Builderman"), { id: "156", name: "builderman", displayName: "Builderman" });
	// Second lookup comes from the cache.
	await roblox.resolveUser("builderman");
	assert.equal(calls, 1);
});

test("resolveUser falls back to a numeric user ID", async () => {
	roblox._setFetch(async (url) => url.includes("usernames")
		? json(200, { data: [] })
		: json(200, { id: 1, name: "Roblox", displayName: "Roblox", description: "", created: "2006-02-27T21:06:40.3Z" }));
	assert.deepEqual(await roblox.resolveUser("1"), { id: "1", name: "Roblox", displayName: "Roblox" });
});

test("resolveUser rejects impossible usernames without calling Roblox", async () => {
	roblox._setFetch(async () => assert.fail("should not call Roblox"));
	assert.equal(await roblox.resolveUser("not a name!"), null);
	assert.equal(await roblox.resolveUser("ab"), null);
});

test("Roblox errors become friendly RobloxErrors", async () => {
	roblox._setFetch(async () => json(429, {}));
	await assert.rejects(roblox.getUser("5"), { name: "RobloxError", message: /rate limiting/ });
	roblox._setFetch(async () => json(404, {}));
	assert.equal(await roblox.getUser("5"), null);
});

test("getAvatarUrl waits for Roblox to finish rendering", async () => {
	let calls = 0;
	roblox._setFetch(async (url) => {
		calls++;
		assert.match(url, /thumbnails\.roblox\.com\/v1\/users\/avatar\?userIds=7/);
		return json(200, { data: [calls === 1 ? { state: "Pending" } : { state: "Completed", imageUrl: "https://tr.rbxcdn.com/abc.png" }] });
	});
	assert.equal(await roblox.getAvatarUrl("7", "full"), "https://tr.rbxcdn.com/abc.png");
	assert.equal(calls, 2);
});

test("tryAvatarUrl never throws", async () => {
	roblox._setFetch(async () => json(500, {}));
	assert.equal(await roblox.tryAvatarUrl("8", "headshot"), null);
});

test("batch lookups split into requests of 100", async () => {
	const ids = Array.from({ length: 150 }, (_, i) => String(i + 1));
	const seen = [];
	roblox._setFetch(async (url, init) => {
		if (url.endsWith("/v1/users")) {
			const { userIds } = JSON.parse(init.body);
			seen.push(userIds.length);
			return json(200, { data: userIds.map((id) => ({ id, name: `user${id}`, displayName: `User ${id}` })) });
		}
		const userIds = new URL(url).searchParams.get("userIds").split(",");
		return json(200, { data: userIds.map((id) => ({ targetId: Number(id), state: "Completed", imageUrl: `https://img/${id}.png` })) });
	});
	const users = await roblox.getUsersBatch(ids);
	const avatars = await roblox.getAvatarUrlsBatch(ids);
	assert.deepEqual(seen, [100, 50]);
	assert.equal(users.get("150").name, "user150");
	assert.equal(avatars.get("1"), "https://img/1.png");
	assert.equal(avatars.size, 150);
});
