"use strict";

const { Events } = require("discord.js");
const { fetchAllMessages } = require("../src/db");
const { getChannel } = require("../src/util");

// Thanks people for upvoting: a vote webhook posts the voter's user ID in the holding channel,
// and the bot announces it and removes the ID. Turn on with UPVOTE_RELAY=true; it needs the
// Message Content Intent enabled in the Developer Portal, because the IDs are posted by a webhook.

module.exports.start = async (client, ctx) => {
	const { config } = ctx;
	if (!config.features.upvoteRelay) return;

	const announce = await getChannel(client, config.upvotes.announce).catch(() => null);
	if (!announce) return console.warn("Upvote relay: couldn't access the announcement channel.");

	const relay = async (message) => {
		const userId = message.content.trim();
		if (!/^\d{17,20}$/.test(userId)) return;
		try {
			const voter = await client.users.fetch(userId);
			await announce.send({ content: `Many thanks to ${voter.username} for upvoting our bot!`, allowedMentions: { parse: [] } });
			await message.delete();
		} catch (err) {
			console.warn("Upvote relay failed:", err);
		}
	};

	// Catch up on votes that came in while the bot was offline.
	const holding = await getChannel(client, config.upvotes.holding).catch(() => null);
	if (holding) {
		for (const message of (await fetchAllMessages(holding)).reverse()) await relay(message);
	}

	client.on(Events.MessageCreate, (message) => {
		if (message.channelId === config.upvotes.holding) relay(message);
	});
};
