"use strict";

const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, getChannel, slash } = require("../src/util");

module.exports = {
	category: "Owners",
	staffOnly: true,
	requiredLevel: LEVELS.OWNER,
	data: slash("resetcase", "Resets case numbers for the report command"),
	async execute(interaction, { client, config }) {
		await interaction.deferReply({ flags: EPHEMERAL });
		const channel = await getChannel(client, config.channels.caseCounter);
		const counter = await channel.messages.fetch(config.messages.caseCounter);
		await counter.edit("1");
		await interaction.editReply("✅ Case numbers reset.");
	},
};
