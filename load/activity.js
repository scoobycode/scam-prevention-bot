"use strict";

const { ActivityType } = require("discord.js");

// Rotating status messages. {users}, {servers} and {channels} are filled in automatically.
const STATUSES = [
	{ text: "{users} users", type: ActivityType.Listening },
	{ text: "for /help", type: ActivityType.Watching },
	{ text: "on {servers} servers", type: ActivityType.Playing },
	{ text: "for /updates", type: ActivityType.Watching },
	{ text: "premium for as low as $3/3 months", type: ActivityType.Listening },
	{ text: "for /buypremium", type: ActivityType.Watching },
	{ text: "for scammers", type: ActivityType.Listening },
	{ text: "for /report", type: ActivityType.Watching },
	{ text: "on {channels} channels", type: ActivityType.Playing },
	{ text: "for /invite", type: ActivityType.Watching },
];

module.exports.start = (client, ctx) => {
	let index = 0;
	const update = () => {
		// The stream-status module pauses the rotation while the streamer is live.
		if (ctx.streaming) return;
		const status = STATUSES[index];
		index = (index + 1) % STATUSES.length;
		const users = client.guilds.cache.reduce((total, guild) => total + (guild.memberCount ?? 0), 0);
		const text = status.text
			.replace("{users}", users.toLocaleString("en-US"))
			.replace("{servers}", client.guilds.cache.size.toLocaleString("en-US"))
			.replace("{channels}", client.channels.cache.size.toLocaleString("en-US"));
		client.user.setActivity(text, { type: status.type });
	};
	update();
	setInterval(update, 30000).unref();
};
