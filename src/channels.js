"use strict";

// Finds every channel the bot needs in the support server once at startup.
// The bot never creates channels, except #scam-bot-data (hidden, bot-only) when it's missing.
// Commands then get channels with channelFor("reports") etc., with no API calls.

const { ChannelType, PermissionFlagsBits } = require("discord.js");
const config = require("../config");

const registry = new Map();

class SetupError extends Error {
	name = "SetupError";
	expose = true;
}

const TEXT_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

async function createHiddenChannel(guild, name, near) {
	return guild.channels.create({
		name,
		type: ChannelType.GuildText,
		parent: near?.parentId ?? undefined,
		permissionOverwrites: [
			{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
			{
				id: guild.members.me.id,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
			},
		],
		topic: "The Scam Reports bot stores its data here. Please don't delete or post in this channel.",
		reason: "Scam Prevention Bot data channel",
	});
}

async function setupChannels(client) {
	const guild = await client.guilds.fetch(config.guilds.support).catch(() => null);
	if (!guild) throw new Error(`The bot isn't in the support server (${config.guilds.support}).`);
	await guild.channels.fetch();

	registry.clear();
	for (const [key, spec] of Object.entries(config.channels)) {
		let channel = spec.id ? guild.channels.cache.get(spec.id) : null;
		if (!channel && spec.name) channel = guild.channels.cache.find((c) => TEXT_TYPES.includes(c.type) && c.name === spec.name);
		if (!channel && spec.create) {
			try {
				channel = await createHiddenChannel(guild, spec.name, registry.get("reports"));
				console.log(`Created #${spec.name} in ${guild.name}.`);
			} catch (err) {
				console.error(`Couldn't create #${spec.name}: ${err.message}. Give the bot Manage Channels, or create a #${spec.name} channel yourself.`);
			}
		}
		if (channel) registry.set(key, channel);
		else console.error(`Couldn't find the ${key} channel (${spec.id ?? `#${spec.name}`}) in ${guild.name}.`);
	}
	console.log(`Using ${registry.size}/${Object.keys(config.channels).length} channels in ${guild.name}.`);
	return guild;
}

/** The channel for a key in config.channels. Throws a message users can read if it's missing. */
function channelFor(key) {
	const channel = registry.get(key);
	if (!channel) throw new SetupError("The bot isn't set up properly right now. Please let the bot owner know.");
	return channel;
}

const hasChannel = (key) => registry.has(key);

module.exports = { SetupError, channelFor, hasChannel, setupChannels };
