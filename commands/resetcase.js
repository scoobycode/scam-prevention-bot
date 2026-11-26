"use strict";

const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, slash } = require("../src/util");

module.exports = {
	category: "Owners",
	staffOnly: true,
	requiredLevel: LEVELS.OWNER,
	data: slash("resetcase", "Resets case numbers for the report command"),
	async execute(interaction, { stores }) {
		await interaction.deferReply({ flags: EPHEMERAL });
		await stores.meta.set("case-counter", "0");
		await interaction.editReply("✅ Case numbers reset. The next report will be case #1.");
	},
};
