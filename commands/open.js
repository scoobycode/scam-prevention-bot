"use strict";

const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, field, getChannel, modLog, slash } = require("../src/util");

module.exports = {
	category: "Support",
	staffOnly: true,
	requiredLevel: LEVELS.SUPPORT,
	data: slash("open", "Opens up the report command"),
	async execute(interaction, { client, config }) {
		await interaction.deferReply({ flags: EPHEMERAL });
		const channel = await getChannel(client, config.channels.reports);
		await channel.setTopic("open");
		await interaction.editReply("✅ Reports are open.");
		await modLog(client, "Reports Opened", [field("Moderator", `<@${interaction.user.id}>`)]);
	},
};
