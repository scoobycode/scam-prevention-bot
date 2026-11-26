"use strict";

const { LEVELS } = require("../src/permissions");
const { channelFor } = require("../src/channels");
const { EPHEMERAL, field, modLog, slash } = require("../src/util");

module.exports = {
	category: "Support",
	staffOnly: true,
	requiredLevel: LEVELS.SUPPORT,
	data: slash("open", "Opens up the report command"),
	async execute(interaction, { client }) {
		await interaction.deferReply({ flags: EPHEMERAL });
		const channel = channelFor("reports");
		await channel.setTopic("open");
		await interaction.editReply("✅ Reports are open.");
		await modLog(client, "Reports Opened", [field("Moderator", `<@${interaction.user.id}>`)]);
	},
};
