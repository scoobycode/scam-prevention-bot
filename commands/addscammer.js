"use strict";

const roblox = require("../src/roblox");
const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, field, modLog, slash } = require("../src/util");

module.exports = {
	category: "Support",
	staffOnly: true,
	requiredLevel: LEVELS.SUPPORT,
	data: slash("addscammer", "Adds a scammer to the scammers database")
		.addStringOption((o) => o.setName("username").setDescription("The scammer's Roblox username").setRequired(true).setMaxLength(20)),

	async execute(interaction, { client, stores }) {
		const username = interaction.options.getString("username", true);
		await interaction.deferReply({ flags: EPHEMERAL });
		const user = await roblox.resolveUser(username);
		if (!user) return interaction.editReply("Invalid user.");
		if (stores.scammers.has(user.id)) return interaction.editReply(`**${user.name}** is already in the scammer database!`);

		// Posting the card in #list-of-scammers is what adds them to the database.
		await stores.scammers.add(user, await roblox.tryAvatarUrl(user.id, "full"));
		await interaction.editReply(`✅ Added **${user.name}** to the scammer database.`);
		await modLog(client, "Scammer Added", [
			field("Moderator", `<@${interaction.user.id}>`),
			field("User Added", `${user.name} (${user.id})`),
		]);
	},
};
