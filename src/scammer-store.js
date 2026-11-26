"use strict";

// The scammer database is #list-of-scammers itself: every post there links one Roblox profile.
// Adding a scammer posts a card; removing one deletes their post.

const { channelFor } = require("./channels");
const { deleteMessages, fetchAllMessages } = require("./db");
const { scammerPost } = require("./scammer-post");

const PROFILE_LINK = /roblox\.com\/users\/(\d+)/;

class ScammerStore {
	constructor() {
		this.name = "scammers";
		this.entries = new Map();
	}

	async load() {
		const messages = await fetchAllMessages(channelFor("scammerPosts"));
		const entries = new Map();
		for (const message of messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp)) {
			const text = `${message.content} ${message.embeds.map((e) => e.url ?? "").join(" ")}`;
			const id = PROFILE_LINK.exec(text)?.[1];
			if (!id) continue;
			const entry = entries.get(id) ?? { key: id, messages: [] };
			entry.messages.push(message);
			entries.set(id, entry);
		}
		this.entries = entries;
		return entries.size;
	}

	has(id) {
		return this.entries.has(id);
	}

	get(id) {
		return this.entries.get(id) ?? null;
	}

	values() {
		return this.entries.values();
	}

	get size() {
		return this.entries.size;
	}

	/** Posts a scammer card in #list-of-scammers. */
	async add(user, avatar) {
		const message = await channelFor("scammerPosts").send(scammerPost(user, avatar));
		this.entries.set(user.id, { key: user.id, messages: [message] });
	}

	/** Reposts a scammer's card (fresh name and avatar), then removes the old post(s). */
	async replace(user, avatar) {
		const old = this.entries.get(user.id)?.messages ?? [];
		await this.add(user, avatar);
		await deleteMessages(old);
	}

	/** Deletes a scammer's post(s). Returns false if they weren't listed. */
	async delete(id) {
		const entry = this.entries.get(id);
		if (!entry) return false;
		await deleteMessages(entry.messages);
		this.entries.delete(id);
		return true;
	}
}

module.exports = { ScammerStore };
