"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ChannelStore, fetchAllMessages, formatPair, parsePair, parseSingle } = require("../src/db");

let nextId = 1;
function fakeMessage(content, channel) {
	const message = {
		id: String(nextId++),
		content,
		createdTimestamp: nextId,
		deleted: false,
		async delete() {
			message.deleted = true;
			channel.messages.list = channel.messages.list.filter((m) => m !== message);
		},
	};
	return message;
}

function fakeChannel(contents = []) {
	const channel = { messages: { list: [] } };
	// Newest first, like Discord.
	channel.messages.list = contents.map((c) => fakeMessage(c, channel)).reverse();
	channel.messages.fetch = async ({ limit, before }) => {
		const start = before ? channel.messages.list.findIndex((m) => m.id === before) + 1 : 0;
		const page = channel.messages.list.slice(start, start + limit);
		const map = new Map(page.map((m) => [m.id, m]));
		map.lastKey = () => page.at(-1)?.id;
		return map;
	};
	channel.send = async ({ content }) => {
		const message = fakeMessage(content, channel);
		channel.messages.list.unshift(message);
		return message;
	};
	return channel;
}

test("parsers", () => {
	assert.deepEqual(parseSingle(" 123 "), { key: "123" });
	assert.equal(parseSingle(""), null);
	assert.deepEqual(parsePair("111 0"), { key: "111", value: "0" });
	assert.equal(parsePair("111"), null);
	assert.equal(formatPair({ key: "a", value: "b" }), "a b");
});

test("fetchAllMessages pages past 100 messages", async () => {
	const channel = fakeChannel(Array.from({ length: 250 }, (_, i) => String(i)));
	const all = await fetchAllMessages(channel);
	assert.equal(all.length, 250);
});

test("ChannelStore loads, sets, replaces and deletes records", async () => {
	const channel = fakeChannel(["1 100", "2 200", "1 150", "junk"]);
	const store = new ChannelStore({ name: "test", resolve: async () => ({ read: [channel], write: channel }), parse: parsePair, format: formatPair });

	assert.equal(await store.load(), 2);
	// The newest duplicate wins.
	assert.equal(store.get("1").value, "150");

	await store.set({ key: "1", value: "999" });
	assert.equal(store.get("1").value, "999");
	// Both old "1" messages were cleaned up.
	assert.deepEqual(channel.messages.list.map((m) => m.content).sort(), ["1 999", "2 200", "junk"]);

	assert.equal(await store.delete("2"), true);
	assert.equal(await store.delete("2"), false);
	assert.equal(store.has("2"), false);
});
