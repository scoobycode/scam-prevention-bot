"use strict";

// The bot keeps its data as messages in private Discord channels (one message per record).
// This module loads those channels once at startup into in-memory Maps, so lookups are instant,
// and keeps the Maps and the channels in sync on every write.

const UNKNOWN_MESSAGE = 10008;

/** Fetches every message in a channel, newest first, paging past Discord's 100-message limit. */
async function fetchAllMessages(channel) {
	const all = [];
	let before;
	for (;;) {
		const batch = await channel.messages.fetch({ limit: 100, before, cache: false });
		if (batch.size === 0) break;
		all.push(...batch.values());
		before = batch.lastKey();
		if (batch.size < 100) break;
	}
	return all;
}

async function deleteMessages(messages) {
	await Promise.all(messages.map((message) => message.delete().catch((err) => {
		if (err?.code !== UNKNOWN_MESSAGE) throw err;
	})));
}

/** "123" -> { key: "123" } */
function parseSingle(content) {
	const [key] = String(content ?? "").trim().split(/\s+/);
	return key ? { key } : null;
}

/** "123 456" -> { key: "123", value: "456" } */
function parsePair(content) {
	const [key, value] = String(content ?? "").trim().split(/\s+/);
	return key && value !== undefined ? { key, value } : null;
}

const formatSingle = (record) => record.key;
const formatPair = (record) => `${record.key} ${record.value}`;

class ChannelStore {
	/**
	 * @param {object} options
	 * @param {string} options.name Used in log messages.
	 * @param {() => Promise<{read: object[], write: object}>} options.resolve Returns the channels to read from and write to.
	 * @param {(content: string) => ({key: string} | null)} options.parse
	 * @param {(record: object) => string} options.format
	 */
	constructor({ name, resolve, parse, format }) {
		this.name = name;
		this.resolve = resolve;
		this.parse = parse;
		this.format = format;
		this.entries = new Map();
		this.writeChannel = null;
	}

	async load() {
		const { read, write } = await this.resolve();
		this.writeChannel = write;
		const pages = await Promise.all(read.map(fetchAllMessages));
		// Oldest first, so when a key appears more than once the newest record wins.
		const messages = pages.flat().sort((a, b) => a.createdTimestamp - b.createdTimestamp);
		const entries = new Map();
		for (const message of messages) {
			const record = this.parse(message.content);
			if (!record) continue;
			const existing = entries.get(record.key);
			if (existing) {
				Object.assign(existing, record);
				existing.messages.push(message);
			} else {
				entries.set(record.key, { ...record, messages: [message] });
			}
		}
		this.entries = entries;
		return entries.size;
	}

	has(key) {
		return this.entries.has(key);
	}

	get(key) {
		return this.entries.get(key) ?? null;
	}

	values() {
		return this.entries.values();
	}

	get size() {
		return this.entries.size;
	}

	/** Adds or replaces a record. */
	async set(record) {
		if (!this.writeChannel) throw new Error(`The ${this.name} database channel is not available.`);
		const previous = this.entries.get(record.key);
		const message = await this.writeChannel.send({ content: this.format(record), allowedMentions: { parse: [] } });
		this.entries.set(record.key, { ...record, messages: [message] });
		if (previous) await deleteMessages(previous.messages).catch((err) => console.warn(`[${this.name}] Couldn't remove an old record:`, err));
	}

	/** Removes a record. Returns false when it didn't exist. */
	async delete(key) {
		const entry = this.entries.get(key);
		if (!entry) return false;
		await deleteMessages(entry.messages);
		this.entries.delete(key);
		return true;
	}
}

module.exports = {
	ChannelStore,
	deleteMessages,
	fetchAllMessages,
	formatPair,
	formatSingle,
	parsePair,
	parseSingle,
};
