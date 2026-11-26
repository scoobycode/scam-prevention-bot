"use strict";

// Builds every slash command definition to catch mistakes before they reach Discord.
// Skipped when discord.js isn't installed (run `npm install` first).

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

let hasDiscord = true;
try {
	require.resolve("discord.js");
} catch {
	hasDiscord = false;
}

test("every command builds a valid slash command", { skip: !hasDiscord && "discord.js is not installed" }, () => {
	const dir = path.join(__dirname, "..", "commands");
	const names = new Set();
	for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
		const command = require(path.join(dir, file));
		const json = command.data.toJSON();
		assert.match(json.name, /^[a-z0-9_-]{1,32}$/, file);
		assert.ok(json.description.length <= 100, `${file}: description too long`);
		assert.ok(!names.has(json.name), `${file}: duplicate name`);
		assert.ok(["Public", "Premium", "Support", "Owners"].includes(command.category), `${file}: bad category`);
		assert.equal(typeof command.execute, "function", file);
		names.add(json.name);
	}
	assert.equal(names.size, 29);
});
