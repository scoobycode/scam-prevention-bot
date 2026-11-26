"use strict";

const { ActivityType, Events } = require("discord.js");

// While the streamer (config.streamerId) is live on Twitch/YouTube, the bot's status shows their stream.
// Turn on with STREAM_STATUS=true; it needs the Presence Intent enabled in the Developer Portal.

module.exports.start = (client, ctx) => {
	const { config } = ctx;
	if (!config.features.streamStatus) return;

	const apply = (presence) => {
		const stream = presence?.activities?.find((activity) => activity.type === ActivityType.Streaming && activity.url);
		if (stream) {
			ctx.streaming = true;
			client.user.setActivity(stream.details || stream.name, { type: ActivityType.Streaming, url: stream.url });
		} else {
			ctx.streaming = false;
		}
	};

	const initial = client.guilds.cache.map((guild) => guild.presences.cache.get(config.streamerId)).find(Boolean);
	apply(initial);

	client.on(Events.PresenceUpdate, (_, presence) => {
		if (presence?.userId === config.streamerId) apply(presence);
	});
};
