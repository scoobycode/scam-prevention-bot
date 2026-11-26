"use strict";

const { slash } = require("../src/util");

module.exports = {
	category: "Public",
	data: slash("server", "Sends you the invite to the support server"),
	async execute(interaction, { config }) {
		await interaction.reply(`**Scam Reports Support Server:** ${config.links.supportServer}`);
	},
};
