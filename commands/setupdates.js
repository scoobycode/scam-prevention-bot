"use strict";

const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, slash } = require("../src/util");

module.exports = {
	category: "Owners",
	staffOnly: true,
	requiredLevel: LEVELS.OWNER,
	data: slash("setupdates", "Sets the /updates response")
		.addStringOption((o) => o.setName("text").setDescription("The new updates text").setRequired(true).setMaxLength(1990)),
	async execute(interaction, { stores }) {
		const text = interaction.options.getString("text", true).replace(/\\n/g, "\n");
		await interaction.deferReply({ flags: EPHEMERAL });
		await stores.meta.set("updates", text);
		await interaction.editReply("✅ Updated the `/updates` message. (Tip: type `\\n` for a new line.)");
	},
};
