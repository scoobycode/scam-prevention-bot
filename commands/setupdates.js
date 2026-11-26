"use strict";

const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, getChannel, slash } = require("../src/util");

module.exports = {
	category: "Owners",
	staffOnly: true,
	requiredLevel: LEVELS.OWNER,
	data: slash("setupdates", "Sets the /updates response")
		.addStringOption((o) => o.setName("text").setDescription("The new updates text").setRequired(true).setMaxLength(2000)),
	async execute(interaction, { client, config }) {
		const text = interaction.options.getString("text", true).replace(/\\n/g, "\n");
		await interaction.deferReply({ flags: EPHEMERAL });
		const channel = await getChannel(client, config.channels.updates);
		const message = await channel.messages.fetch(config.messages.updates);
		await message.edit({ content: text, allowedMentions: { parse: [] } });
		await interaction.editReply("✅ Updated the `/updates` message. (Tip: type `\\n` for a new line.)");
	},
};
