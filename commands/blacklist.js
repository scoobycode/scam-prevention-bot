"use strict";

const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, field, modLog, slash } = require("../src/util");

module.exports = {
	category: "Support",
	staffOnly: true,
	requiredLevel: LEVELS.SUPPORT,
	data: slash("blacklist", "Blacklists a user from using the report command")
		.addUserOption((o) => o.setName("user").setDescription("The user (you can paste a user ID)").setRequired(true)),

	async execute(interaction, { client, stores }) {
		const user = interaction.options.getUser("user", true);
		if (stores.blacklistedUsers.has(user.id)) return interaction.reply({ content: "This user is already blacklisted!", flags: EPHEMERAL });

		await interaction.deferReply({ flags: EPHEMERAL });
		await stores.blacklistedUsers.set({ key: user.id });
		await interaction.editReply(`✅ Blacklisted **${user.username}**.`);
		await modLog(client, "Blacklisted User", [
			field("Moderator", `<@${interaction.user.id}>`),
			field("Blacklisted", user.username),
			field("Blacklisted ID", user.id),
		]);
	},
};
