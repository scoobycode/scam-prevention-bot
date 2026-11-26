"use strict";

const roblox = require("../src/roblox");
const { slash } = require("../src/util");

module.exports = {
	category: "Public",
	data: slash("scamcheck", "Tells you whether a Roblox user is in our scam database")
		.addStringOption((o) => o.setName("username").setDescription("Their Roblox username").setRequired(true).setMaxLength(20)),
	async execute(interaction, { stores }) {
		const username = interaction.options.getString("username", true);
		await interaction.deferReply();
		const user = await roblox.resolveUser(username);
		if (!user) return interaction.editReply(`I couldn't find a Roblox user called \`${username}\`.`);
		if (stores.scammers.has(user.id)) {
			return interaction.editReply(`⚠️ **${user.name}** is in our scammers database!\n**Link to their profile:** ${roblox.profileUrl(user.id)}`);
		}
		await interaction.editReply(`**${user.name}** is not in our scammers database.`);
	},
};
