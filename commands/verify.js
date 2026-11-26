"use strict";

const { randomInt } = require("node:crypto");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const roblox = require("../src/roblox");
const { EPHEMERAL, infoEmbed, slash } = require("../src/util");

const WORDS = ["vase", "hello", "lamp", "bus", "button", "book", "battery", "blanket", "mouse", "can", "rug", "pants", "pillow", "duck", "roblox", "lego"];
const PENDING_TTL_MS = 10 * 60 * 1000;
const pending = new Map();

function makePhrase() {
	const words = Array.from({ length: 5 }, () => WORDS[randomInt(WORDS.length)]);
	return `music ${words.join(" ")}`;
}

const buttons = () => new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId("verify:check").setLabel("I've added it").setStyle(ButtonStyle.Success),
	new ButtonBuilder().setCustomId("verify:cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
);

module.exports = {
	category: "Public",
	data: slash("verify", "Links your Roblox account to your Discord account")
		.addStringOption((o) => o.setName("username").setDescription("Your Roblox username or user ID").setRequired(true).setMaxLength(20)),

	async execute(interaction) {
		const input = interaction.options.getString("username", true);
		await interaction.deferReply({ flags: EPHEMERAL });
		const user = await roblox.resolveUser(input);
		if (!user) return interaction.editReply(`I couldn't find a Roblox user called \`${input}\`.`);

		const attempt = { robloxId: user.id, robloxName: user.name, phrase: makePhrase() };
		pending.set(interaction.user.id, attempt);
		setTimeout(() => {
			if (pending.get(interaction.user.id) === attempt) pending.delete(interaction.user.id);
		}, PENDING_TTL_MS).unref();

		await interaction.editReply({
			embeds: [infoEmbed(`To prove you own **${user.name}**, put this text in your Roblox profile's **About** section:\n\n\`${attempt.phrase}\`\n\nThen press **I've added it**. This expires in 10 minutes.`)],
			components: [buttons()],
		});
	},

	async handleComponent(interaction, { stores }, [action]) {
		const attempt = pending.get(interaction.user.id);
		if (action === "cancel" || !attempt) {
			pending.delete(interaction.user.id);
			return interaction.update({ content: attempt ? "Cancelled prompt." : "This verification expired. Run `/verify` again.", embeds: [], components: [] });
		}

		await interaction.deferUpdate();
		const profile = await roblox.getUserFresh(attempt.robloxId);
		if (!profile?.description?.toLowerCase().includes(attempt.phrase)) {
			return interaction.editReply({
				embeds: [infoEmbed(`I couldn't find \`${attempt.phrase}\` in **${attempt.robloxName}**'s About section yet. Roblox can take a minute to update, so double-check it saved and press the button again.`)],
				components: [buttons()],
			});
		}

		pending.delete(interaction.user.id);
		await stores.verified.set({ key: interaction.user.id, value: attempt.robloxId });
		await interaction.editReply({ content: `✅ Successfully linked your Discord account to **${attempt.robloxName}**. You can remove the text from your profile now.`, embeds: [], components: [] });
	},
};
