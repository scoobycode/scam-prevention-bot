"use strict";

const { slash } = require("../src/util");

module.exports = {
	category: "Public",
	data: slash("buypremium", "Gives you a link to buy premium"),
	async execute(interaction, { config }) {
		await interaction.reply(`**You can buy premium here!:** ${config.links.premium}`);
	},
};
