"use strict";

const { LEVELS } = require("../src/permissions");
const { channelFor } = require("../src/channels");
const { EPHEMERAL, field, modLog, slash } = require("../src/util");

module.exports = {
	category: "Support",
	staffOnly: true,
	requiredLevel: LEVELS.SUPPORT,
	data: slash("close", "Closes the report command"),
	async execute(interaction, { client }) {
		await interaction.deferReply({ flags: EPHEMERAL });
		const channel = channelFor("reports");
		await channel.setTopic("closed");
		await interaction.editReply("✅ Reports are closed. (Discord only allows changing a channel topic twice every 10 minutes.)");
		await modLog(client, "Reports Closed", [field("Moderator", `<@${interaction.user.id}>`)]);
	},
};
