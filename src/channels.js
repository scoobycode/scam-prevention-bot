"use strict";

// Finds (or creates) every channel the bot needs in the support server, once at startup.
// Commands then get channels with channelFor("reports") etc., with no API calls.

const { ChannelType, PermissionFlagsBits } = require("discord.js");
const config = require("../config");

const registry = new Map();

class SetupError extends Error {
	name = "SetupError";
	expose = true;
}

const STAFF_ALLOW = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory];
const BOT_ALLOW = [
	PermissionFlagsBits.ViewChannel,
	PermissionFlagsBits.SendMessages,
	PermissionFlagsBits.ReadMessageHistory,
	PermissionFlagsBits.EmbedLinks,
	PermissionFlagsBits.AttachFiles,
	PermissionFlagsBits.ManageMessages,
	PermissionFlagsBits.ManageChannels,
];

function overwritesFor(kind, guild) {
	const me = guild.members.me.id;
	const everyone = guild.roles.everyone.id;
	const staffRoles = [config.roles.support, config.roles.coOwner, config.roles.owner].filter((id) => guild.roles.cache.has(id));
	const overwrites = [{ id: me, allow: BOT_ALLOW }];
	if (kind === "public") {
		overwrites.push({ id: everyone, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] });
	} else {
		overwrites.push({ id: everyone, deny: [PermissionFlagsBits.ViewChannel] });
		if (kind === "staff") for (const id of staffRoles) overwrites.push({ id, allow: STAFF_ALLOW });
	}
	return overwrites;
}

async function findOrCreateCategory(guild, kind) {
	const name = config.categories[kind];
	if (!name) return null;
	const existing = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === name.toLowerCase());
	if (existing) return existing;
	console.log(`Creating category "${name}" in ${guild.name}…`);
	return guild.channels.create({ name, type: ChannelType.GuildCategory, permissionOverwrites: overwritesFor(kind, guild), reason: "Scam Prevention Bot setup" });
}

async function setupChannels(client) {
	const guild = await client.guilds.fetch(config.guilds.support).catch(() => null);
	if (!guild) throw new Error(`The bot isn't in the support server (${config.guilds.support}). Invite it there with Administrator.`);
	await guild.channels.fetch();
	await guild.roles.fetch();

	registry.clear();
	const created = [];
	for (const [key, spec] of Object.entries(config.channels)) {
		let channel = spec.legacyId ? guild.channels.cache.get(spec.legacyId) : null;
		// #list-of-scammers is an announcement channel, so accept both kinds.
		channel ??= guild.channels.cache.find((c) => (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) && c.name === spec.name);
		if (!channel) {
			try {
				const parent = await findOrCreateCategory(guild, spec.kind);
				channel = await guild.channels.create({
					name: spec.name,
					type: ChannelType.GuildText,
					parent: parent?.id,
					permissionOverwrites: overwritesFor(spec.kind, guild),
					reason: "Scam Prevention Bot setup",
				});
				created.push(`#${spec.name}`);
			} catch (err) {
				console.error(`Couldn't create #${spec.name}. Give the bot Administrator (or Manage Channels + Manage Roles) in ${guild.name}.`, err.message);
				continue;
			}
		}
		registry.set(key, channel);
	}
	if (created.length) console.log(`Created ${created.join(", ")} in ${guild.name}.`);
	console.log(`Using ${registry.size}/${Object.keys(config.channels).length} channels in ${guild.name}.`);
	return guild;
}

/** The channel for a key in config.channels. Throws a message users can read if it isn't set up. */
function channelFor(key) {
	const channel = registry.get(key);
	if (!channel) throw new SetupError(`The bot's #${config.channels[key]?.name ?? key} channel isn't set up. Ask the bot owner to check the bot's console.`);
	return channel;
}

const hasChannel = (key) => registry.has(key);

module.exports = { SetupError, channelFor, hasChannel, setupChannels };
