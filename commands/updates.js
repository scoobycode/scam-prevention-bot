"use strict";

const { EmbedBuilder } = require("discord.js");
const { COLORS, getChannel, slash } = require("../src/util");

module.exports = {
	category: "Public",
	data: slash("updates", "Gives you our latest updates to the bot"),
	async execute(interaction, { client, config }) {
		const channel = await getChannel(client, config.channels.updates);
		const message = await channel.messages.fetch(config.messages.updates);
		const embed = new EmbedBuilder()
			.setTitle("Updates")
			.setColor(COLORS.log)
			.setDescription(message.content || "No updates yet.")
			.setFooter({ text: `Requested by ${interaction.user.username}` });
		await interaction.reply({ embeds: [embed] });
	},
};
