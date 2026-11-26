"use strict";

const { slash } = require("../src/util");

module.exports = {
	category: "Public",
	data: slash("invite", "Sends you my invite"),
	async execute(interaction) {
		const url = `https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=469892311&scope=bot%20applications.commands`;
		await interaction.reply(`**Invite me here!:** <${url}>`);
	},
};
