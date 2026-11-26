"use strict";

const { EmbedBuilder } = require("discord.js");
const { COLORS, EPHEMERAL, slash } = require("../src/util");
const { LEVELS } = require("../src/permissions");

const CATEGORIES = [
	{ name: "Public", level: LEVELS.PUBLIC },
	{ name: "Premium", level: LEVELS.PUBLIC },
	{ name: "Support", level: LEVELS.SUPPORT },
	{ name: "Owners", level: LEVELS.OWNER },
];

module.exports = {
	category: "Public",
	data: slash("help", "Shows you a list of commands"),
	async execute(interaction, { commands, permissionLevel }) {
		const embed = new EmbedBuilder().setTitle("Commands").setColor(COLORS.info);
		for (const category of CATEGORIES) {
			if (permissionLevel < category.level) continue;
			const lines = commands
				.filter((command) => command.category === category.name)
				.map((command) => `\`/${command.data.name}\` - ${command.data.description}`)
				.sort();
			if (lines.length) embed.addFields({ name: category.name, value: lines.join("\n") });
		}
		if (permissionLevel >= LEVELS.SUPPORT) embed.setFooter({ text: "Support and Owner commands only show up in the support server." });
		await interaction.reply({ embeds: [embed], flags: EPHEMERAL });
	},
};
