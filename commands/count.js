"use strict";

const { slash } = require("../src/util");

module.exports = {
	category: "Public",
	data: slash("count", "Gives you our bot's server count"),
	async execute(interaction) {
		await interaction.reply(`${interaction.client.guilds.cache.size.toLocaleString("en-US")} servers!`);
	},
};
