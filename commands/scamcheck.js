"use strict";

const { EmbedBuilder } = require("discord.js");
const roblox = require("../src/roblox");
const { slash } = require("../src/util");

const RED = 0xff0000;
const GREEN = 0x2ecc71;

module.exports = {
	category: "Public",
	data: slash("scamcheck", "Tells you whether a Roblox user is in our scam database")
		.addStringOption((o) => o.setName("username").setDescription("Their Roblox username").setRequired(true).setMaxLength(20)),
	async execute(interaction, { stores }) {
		const username = interaction.options.getString("username", true);
		await interaction.deferReply();
		const user = await roblox.resolveUser(username);
		if (!user) return interaction.editReply(`I couldn't find a Roblox user called \`${username}\`.`);

		const isScammer = stores.scammers.has(user.id);
		const avatar = await roblox.tryAvatarUrl(user.id, isScammer ? "full" : "headshot");
		const embed = new EmbedBuilder()
			.setTitle(isScammer ? `⚠️ ${user.name} is a known scammer` : `${user.name} is not in our scammer database`)
			.setURL(roblox.profileUrl(user.id))
			.setColor(isScammer ? RED : GREEN)
			.setDescription(isScammer
				? "This person is in our scammers database! Don't trade with them."
				: "That doesn't guarantee they're safe. Always be careful when trading.")
			.addFields(
				{ name: "Display Name", value: user.displayName || user.name, inline: true },
				{ name: "User ID", value: user.id, inline: true },
			);
		// Scammers get a big picture of their avatar so people can recognize them in-game.
		if (avatar && isScammer) embed.setImage(avatar);
		else if (avatar) embed.setThumbnail(avatar);
		await interaction.editReply({ embeds: [embed] });
	},
};
