"use strict";

const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, field, modLog, slash } = require("../src/util");

module.exports = {
	category: "Support",
	staffOnly: true,
	requiredLevel: LEVELS.SUPPORT,
	data: slash("guildunblacklist", "Unblacklists a server from using the report command")
		.addStringOption((o) => o.setName("server_id").setDescription("The server ID").setRequired(true).setMaxLength(20)),

	async execute(interaction, { client, stores }) {
		const guildId = interaction.options.getString("server_id", true).trim();
		if (!stores.blacklistedGuilds.has(guildId)) return interaction.reply({ content: "This server isn't blacklisted!", flags: EPHEMERAL });

		await interaction.deferReply({ flags: EPHEMERAL });
		await stores.blacklistedGuilds.delete(guildId);
		await interaction.editReply(`✅ Unblacklisted server \`${guildId}\`.`);
		await modLog(client, "Unblacklisted Guild", [
			field("Moderator", `<@${interaction.user.id}>`),
			field("Guild ID", guildId),
		]);
	},
};
