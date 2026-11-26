"use strict";

// All Discord IDs the bot depends on live here, so nothing is hard-coded inside commands.
// Secrets (the bot token) come from environment variables or a local .env file.

const flag = (name) => String(process.env[name] ?? "").toLowerCase() === "true";

module.exports = {
	// BOT_TOKEN is the new name; `bottoken` is still accepted so old hosting setups keep working.
	token: process.env.BOT_TOKEN || process.env.bottoken,

	// The only user allowed to run /generate.
	ownerId: "291367352476631040",

	guilds: {
		// Support server: staff roles live here and staff-only commands are registered here.
		support: "400508946709872660",
		// Private server whose channels are used as the bot's database.
		database: "443929284411654144",
	},

	roles: {
		support: "469588873090170880",
		coOwner: "400511826745360405",
		owner: "400511217061330955",
	},

	channels: {
		reports: "469621223513522216",
		modLogs: "469621338089324544",
		scammers: "444588565154889738",
		scammerPosts: "469615976522973189",
		blacklistedUsers: "444588561858035723",
		blacklistedGuilds: "444588563032440833",
		premiumCodes: "444588560859791381",
		premiumUsers: "444588564056113162",
		caseCounter: "444588562793627668",
		updates: "444588564328742926",
		premiumRequests: "434126927406825474",
		// First Roblox verification channel. Every channel named *roblox-database* in the database server is read too.
		legacyVerified: "443931376287481858",
		upvoteHolding: "448615839533498388",
		upvoteAnnounce: "469615231618777118",
	},

	messages: {
		caseCounter: "444593973764292618",
		updates: "444593973756166155",
	},

	links: {
		premium: "https://selly.gg/p/3b0483db",
		supportServer: "https://discord.gg/53Jgcu5",
	},

	// When this user goes live, the bot's status shows their stream.
	streamerId: "291367352476631040",

	features: {
		// Needs the "Presence Intent" switched on in the Discord Developer Portal.
		streamStatus: flag("STREAM_STATUS"),
		// Needs the "Message Content Intent" switched on in the Discord Developer Portal.
		upvoteRelay: flag("UPVOTE_RELAY"),
	},

	// Per-user cooldown between commands.
	cooldownMs: 2000,

	// Premium length unit used by codes and /puser (31 days, same as before).
	monthMs: 31 * 24 * 60 * 60 * 1000,
};
