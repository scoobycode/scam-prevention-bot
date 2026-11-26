"use strict";

const { ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { channelFor } = require("../src/channels");
const { COLORS, EPHEMERAL, field, slash } = require("../src/util");

const input = (id, label, style, maxLength) => new ActionRowBuilder().addComponents(
	new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setMaxLength(maxLength).setRequired(true),
);

module.exports = {
	category: "Premium",
	data: slash("request", "Requests something to be developed for you"),

	async execute(interaction, { isPremium }) {
		if (!isPremium(interaction.user.id)) {
			return interaction.reply({ content: "You must be a premium user to use this command! For more information, run `/buypremium`.", flags: EPHEMERAL });
		}
		const modal = new ModalBuilder()
			.setCustomId("request:submit")
			.setTitle("Development request")
			.addComponents(
				input("username", "Your Roblox username", TextInputStyle.Short, 20),
				input("type", "What type of request is this? (e.g. Build)", TextInputStyle.Short, 100),
				input("description", "Describe what you want in detail", TextInputStyle.Paragraph, 1000),
				input("contact", "How should people contact you?", TextInputStyle.Short, 200),
			);
		await interaction.showModal(modal);
	},

	async handleComponent(interaction, { isPremium }) {
		if (!interaction.isModalSubmit()) return;
		if (!isPremium(interaction.user.id)) return interaction.reply({ content: "Your premium has expired.", flags: EPHEMERAL });

		const value = (id) => interaction.fields.getTextInputValue(id);
		const embed = new EmbedBuilder()
			.setTitle("New Request")
			.setColor(COLORS.log)
			.addFields(
				field("Requester's Discord ID", interaction.user.id),
				field("Requester's Username", value("username")),
				field("Type Of Request", value("type")),
				field("Description", value("description")),
				field("How To Contact", value("contact")),
			);
		const channel = channelFor("modLogs");
		await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
		await interaction.reply({ content: "✅ Your request was sent! Abusing this will get your premium removed without a refund.", flags: EPHEMERAL });
	},
};
