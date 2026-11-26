"use strict";

const roblox = require("../src/roblox");
const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, field, modLog, slash } = require("../src/util");

module.exports = {
	category: "Support",
	staffOnly: true,
	requiredLevel: LEVELS.SUPPORT,
	data: slash("removescammer", "Removes a scammer from the scammers database")
		.addStringOption((o) => o.setName("username").setDescription("The scammer's Roblox username or user ID").setRequired(true).setMaxLength(20)),

	async execute(interaction, { client, stores }) {
		const input = interaction.options.getString("username", true);
		await interaction.deferReply({ flags: EPHEMERAL });
		const user = await roblox.resolveUser(input);
		if (!user) return interaction.editReply("Invalid user.");
		if (!stores.scammers.has(user.id)) return interaction.editReply(`**${user.name}** is not in the scammers database!`);

		// Deleting their post in #list-of-scammers is what removes them from the database.
		await stores.scammers.delete(user.id);

		await interaction.editReply(`✅ Removed **${user.name}** from the scammer database.`);
		await modLog(client, "Removed Scammer", [
			field("Moderator", `<@${interaction.user.id}>`),
			field("User Removed", `${user.name} (${user.id})`),
		]);
	},
};
