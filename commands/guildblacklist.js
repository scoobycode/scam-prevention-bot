"use strict";

const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, field, isSnowflake, modLog, slash } = require("../src/util");

module.exports = {
	category: "Support",
	staffOnly: true,
	requiredLevel: LEVELS.SUPPORT,
	data: slash("guildblacklist", "Blacklists a server from using the report command")
		.addStringOption((o) => o.setName("server_id").setDescription("The server ID").setRequired(true).setMaxLength(20)),

	async execute(interaction, { client, stores }) {
		const guildId = interaction.options.getString("server_id", true).trim();
		if (!isSnowflake(guildId)) return interaction.reply({ content: "That isn't a valid server ID.", flags: EPHEMERAL });
		if (stores.blacklistedGuilds.has(guildId)) return interaction.reply({ content: "This server is already blacklisted!", flags: EPHEMERAL });

		await interaction.deferReply({ flags: EPHEMERAL });
		await stores.blacklistedGuilds.set({ key: guildId });
		const name = client.guilds.cache.get(guildId)?.name;
		await interaction.editReply(`✅ Blacklisted server \`${guildId}\`${name ? ` (${name})` : ""}.`);
		await modLog(client, "Guild Blacklisted", [
			field("Moderator", `<@${interaction.user.id}>`),
			field("Guild ID", name ? `${guildId} (${name})` : guildId),
		]);
	},
};
