"use strict";

// Single values (the /updates text, the case counter) stored as one bot message each in #db-settings.
// Message format: "key:\nvalue".

const { fetchAllMessages } = require("./db");

class MetaStore {
	constructor(getChannel) {
		this.getChannel = getChannel;
		this.entries = new Map();
	}

	async load(botId) {
		this.entries.clear();
		const messages = await fetchAllMessages(this.getChannel());
		for (const message of messages.reverse()) {
			if (message.author.id !== botId) continue;
			const match = /^([a-z-]+):\n?([\s\S]*)$/.exec(message.content);
			if (match) this.entries.set(match[1], { value: match[2], message });
		}
	}

	get(key, fallback = null) {
		return this.entries.has(key) ? this.entries.get(key).value : fallback;
	}

	async set(key, value) {
		const content = `${key}:\n${value}`;
		if (content.length > 2000) throw new Error(`${key} is too long to store (max ${2000 - key.length - 2} characters).`);
		const existing = this.entries.get(key);
		const message = existing
			? await existing.message.edit({ content, allowedMentions: { parse: [] } })
			: await this.getChannel().send({ content, allowedMentions: { parse: [] } });
		this.entries.set(key, { value: String(value), message });
	}
}

module.exports = { MetaStore };
