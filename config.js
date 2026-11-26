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
		// Your support server ("Roblox Dev Requests"). Staff roles live here, staff-only commands are
		// registered here, and the bot creates the channels it needs here (see `channels` below).
		support: "400508946709872660",
	},

	roles: {
		support: "469588873090170880",
		coOwner: "400511826745360405",
		owner: "400511217061330955",
	},

	// Channels the bot uses in the support server. It never creates channels, except #scam-bot-data
	// (hidden, bot-only) if that one is missing.
	channels: {
		// Every post here is one scammer: this channel IS the scammer database.
		scammerPosts: { id: "578332698939228160" },
		reports: { id: "580919991415603219" },
		// Staff logs and premium /request submissions.
		modLogs: { name: "mod-logs" },
		// Everything else (premium, codes, blacklists, verified accounts, /updates text, case numbers).
		data: { name: "scam-bot-data", create: true },
	},

	// Upvote relay channels (only used with UPVOTE_RELAY=true).
	upvotes: {
		holding: process.env.UPVOTE_HOLDING_CHANNEL || "448615839533498388",
		announce: process.env.UPVOTE_ANNOUNCE_CHANNEL || "469615231618777118",
	},

	links: {
		premium: "https://selly.gg/p/3b0483db",
		// Shown by /server and in error messages. SUPPORT_INVITE in .env overrides it.
		supportServer: process.env.SUPPORT_INVITE || "https://discord.gg/3dECRh8",
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
