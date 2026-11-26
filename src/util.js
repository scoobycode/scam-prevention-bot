"use strict";

const { EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder, time, TimestampStyles } = require("discord.js");

const COLORS = { info: 0x0000ff, log: 0xff0000 };
const EPHEMERAL = MessageFlags.Ephemeral;

function truncate(text, max) {
	const value = String(text ?? "");
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Builds an embed field, keeping it inside Discord's limits. */
function field(name, value, inline = false) {
	const text = truncate(value, 1024).trim();
	return { name, value: text || "None", inline };
}

const infoEmbed = (description) => new EmbedBuilder().setColor(COLORS.info).setDescription(truncate(description, 4096));

const timestamp = (date = new Date()) => time(date, TimestampStyles.LongDateTime);

async function getChannel(client, id) {
	return client.channels.cache.get(id) ?? client.channels.fetch(id);
}

/** Posts an entry to the staff log channel. Never throws. */
async function modLog(client, title, fields, extra = {}) {
	try {
		const channel = require("./channels").channelFor("modLogs");
		const embed = new EmbedBuilder().setTitle(title).setColor(COLORS.log).addFields(fields).setTimestamp();
		await channel.send({ embeds: [embed], allowedMentions: { parse: [] }, ...extra });
	} catch (err) {
		console.warn(`Couldn't write "${title}" to the log channel:`, err);
	}
}

/** Replies, or edits the reply if the interaction was already deferred/answered. */
async function respond(interaction, payload) {
	const body = typeof payload === "string" ? { content: payload } : payload;
	if (interaction.deferred || interaction.replied) {
		// Flags (like ephemeral) can only be set on the first reply.
		const { flags, ...edit } = body; // eslint-disable-line no-unused-vars
		return interaction.editReply(edit);
	}
	return interaction.reply(body);
}

/** A slash command that can only be used inside servers (like the old bot, which ignored DMs). */
const slash = (name, description) => new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)
	.setContexts(InteractionContextType.Guild);

const isSnowflake = (value) => /^\d{17,20}$/.test(String(value ?? ""));

module.exports = { COLORS, EPHEMERAL, field, getChannel, infoEmbed, isSnowflake, modLog, respond, slash, timestamp, truncate };
