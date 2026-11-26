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

	// Channels the bot uses in the support server. On startup it looks for each one by name and creates
	// it if it's missing (legacyId is tried first, for channels that still exist from the old setup).
	//   staff    = only the bot and staff roles can see it
	//   public   = everyone can read, only the bot can post
	//   database = only the bot can see it; it stores the bot's data as messages
	channels: {
		reports: { name: "scam-reports", kind: "staff", legacyId: "469621223513522216" },
		modLogs: { name: "scam-logs", kind: "staff", legacyId: "469621338089324544" },
		premiumRequests: { name: "premium-requests", kind: "staff", legacyId: "434126927406825474" },
		scammerPosts: { name: "list-of-scammers", kind: "public", legacyId: "469615976522973189" },
		scammers: { name: "db-scammers", kind: "database" },
		blacklistedUsers: { name: "db-blacklisted-users", kind: "database" },
		blacklistedGuilds: { name: "db-blacklisted-servers", kind: "database" },
		premiumCodes: { name: "db-premium-codes", kind: "database" },
		premiumUsers: { name: "db-premium-users", kind: "database" },
		verified: { name: "db-verified", kind: "database" },
		settings: { name: "db-settings", kind: "database" },
	},

	// Categories new channels are created in.
	categories: {
		staff: "Scam Reports Bot",
		public: null,
		database: "Scam Bot Database",
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
