"use strict";

const { EmbedBuilder } = require("discord.js");
const { profileUrl } = require("./roblox");

/**
 * The public post for one scammer in the scammer list channel.
 * The profile link stays in the message text: /removescammer and /refreshscammers use it to find the post.
 * @param {{id: string, name?: string, displayName?: string}} user
 * @param {string | null} avatar
 */
function scammerPost(user, avatar) {
	const name = user.name ?? `Unknown user ${user.id}`;
	const card = new EmbedBuilder()
		.setTitle(`⚠️ ${name}`)
		.setURL(profileUrl(user.id))
		.setColor(0xff0000)
		.setDescription(`Display name: **${user.displayName || name}**\nUser ID: \`${user.id}\``)
		.setImage(avatar ?? null);
	return { content: `**${name}**, ${profileUrl(user.id)}`, embeds: [card], allowedMentions: { parse: [] } };
}

/** True if a message in the scammer list channel is the post for this Roblox user ID. */
const isPostFor = (message, robloxId) => message.content.includes(`/users/${robloxId}/`);

module.exports = { isPostFor, scammerPost };
