"use strict";

const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, slash, timestamp } = require("../src/util");

module.exports = {
	category: "Owners",
	staffOnly: true,
	requiredLevel: LEVELS.OWNER,
	data: slash("puser", "Gives or removes a user's premium")
		.addUserOption((o) => o.setName("user").setDescription("The user (you can paste a user ID)").setRequired(true))
		.addIntegerOption((o) => o.setName("months").setDescription("How long to give premium for (0 = forever). Leave empty to remove premium.").setMinValue(0).setMaxValue(120)),

	async execute(interaction, { config, stores }) {
		const user = interaction.options.getUser("user", true);
		const months = interaction.options.getInteger("months");
		await interaction.deferReply({ flags: EPHEMERAL });

		if (stores.premiumUsers.has(user.id) && months === null) {
			await stores.premiumUsers.delete(user.id);
			return interaction.editReply(`Removed **${user.username}**'s premium.`);
		}
		if (months === null) return interaction.editReply(`**${user.username}** doesn't have premium. Include \`months\` (0 = forever) to give it to them.`);

		const expires = months === 0 ? 0 : Date.now() + months * config.monthMs;
		await stores.premiumUsers.set({ key: user.id, value: String(expires) });
		await interaction.editReply(`Successfully given **${user.username}** premium ${expires === 0 ? "forever" : `until ${timestamp(new Date(expires))}`}!`);
	},
};
