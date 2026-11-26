"use strict";

const { EmbedBuilder } = require("discord.js");
const roblox = require("../src/roblox");
const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, field, getChannel, modLog, slash } = require("../src/util");

module.exports = {
	category: "Support",
	staffOnly: true,
	requiredLevel: LEVELS.SUPPORT,
	data: slash("addscammer", "Adds a scammer to the scammers database")
		.addStringOption((o) => o.setName("username").setDescription("The scammer's Roblox username").setRequired(true).setMaxLength(20)),

	async execute(interaction, { client, config, stores }) {
		const username = interaction.options.getString("username", true);
		await interaction.deferReply({ flags: EPHEMERAL });
		const user = await roblox.resolveUser(username);
		if (!user) return interaction.editReply("Invalid user.");
		if (stores.scammers.has(user.id)) return interaction.editReply(`**${user.name}** is already in the scammer database!`);

		await stores.scammers.set({ key: user.id });
		const posts = await getChannel(client, config.channels.scammerPosts);
		const avatar = await roblox.tryAvatarUrl(user.id, "full");
		const card = new EmbedBuilder()
			.setTitle(`⚠️ ${user.name}`)
			.setURL(roblox.profileUrl(user.id))
			.setColor(0xff0000)
			.setDescription(`Display name: **${user.displayName || user.name}**\nUser ID: \`${user.id}\``)
			.setImage(avatar)
			.setTimestamp();
		// The profile link stays in the message text: /removescammer uses it to find this post.
		await posts.send({ content: `**${user.name}**, ${roblox.profileUrl(user.id)}`, embeds: [card] }).catch((err) => console.warn("Couldn't post the new scammer:", err));
		await interaction.editReply(`✅ Added **${user.name}** to the scammer database.`);
		await modLog(client, "Scammer Added", [
			field("Moderator", `<@${interaction.user.id}>`),
			field("User Added", `${user.name} (${user.id})`),
		]);
	},
};
