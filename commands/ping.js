"use strict";

const { slash } = require("../src/util");

module.exports = {
	category: "Public",
	data: slash("ping", "Responds with the bot's ping"),
	async execute(interaction) {
		const { resource } = await interaction.reply({ content: "Pinging…", withResponse: true });
		const roundTrip = resource.message.createdTimestamp - interaction.createdTimestamp;
		const gateway = interaction.client.ws.ping;
		await interaction.editReply(`Pong! \`${roundTrip}ms\` round trip${gateway >= 0 ? `, \`${gateway}ms\` gateway` : ""}.`);
	},
};
