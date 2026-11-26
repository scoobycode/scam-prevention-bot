"use strict";

const { EmbedBuilder } = require("discord.js");
const { COLORS, slash } = require("../src/util");

module.exports = {
	category: "Public",
	data: slash("updates", "Gives you our latest updates to the bot"),
	async execute(interaction, { stores }) {
		const text = stores.meta.get("updates");
		const embed = new EmbedBuilder()
			.setTitle("Updates")
			.setColor(COLORS.log)
			.setDescription(text || "No updates yet.")
			.setFooter({ text: `Requested by ${interaction.user.username}` });
		await interaction.reply({ embeds: [embed] });
	},
};
