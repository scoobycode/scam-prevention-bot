"use strict";

const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, field, modLog, slash } = require("../src/util");

module.exports = {
	category: "Support",
	staffOnly: true,
	requiredLevel: LEVELS.SUPPORT,
	data: slash("unblacklist", "Unblacklists a user from using the report command")
		.addUserOption((o) => o.setName("user").setDescription("The user (you can paste a user ID)").setRequired(true)),

	async execute(interaction, { client, stores }) {
		const user = interaction.options.getUser("user", true);
		if (!stores.blacklistedUsers.has(user.id)) return interaction.reply({ content: "This user isn't blacklisted!", flags: EPHEMERAL });

		await interaction.deferReply({ flags: EPHEMERAL });
		await stores.blacklistedUsers.delete(user.id);
		await interaction.editReply(`✅ Unblacklisted **${user.username}**.`);
		await modLog(client, "Unblacklisted User", [
			field("Moderator", `<@${interaction.user.id}>`),
			field("Unblacklisted", user.username),
			field("Unblacklisted ID", user.id),
		]);
	},
};
