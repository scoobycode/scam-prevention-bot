"use strict";

const { EmbedBuilder } = require("discord.js");
const roblox = require("../src/roblox");
const { COLORS, slash, timestamp } = require("../src/util");

module.exports = {
	category: "Public",
	data: slash("getinfo", "Gets a user's Roblox information")
		.addUserOption((o) => o.setName("user").setDescription("Who to look up (defaults to you)")),
	async execute(interaction, { stores }) {
		const target = interaction.options.getUser("user") ?? interaction.user;
		const link = stores.verified.get(target.id);
		if (!link) {
			return interaction.reply({ content: `${target.username} is not verified, please tell them to run \`/verify\`.`, allowedMentions: { parse: [] } });
		}

		await interaction.deferReply();
		const [profile, friends, avatar] = await Promise.all([
			roblox.getUser(link.value),
			roblox.getFriendCount(link.value).catch(() => null),
			roblox.tryAvatarUrl(link.value, "headshot"),
		]);
		if (!profile) return interaction.editReply(`${target.username}'s linked Roblox account (ID \`${link.value}\`) no longer exists.`);

		const embed = new EmbedBuilder()
			.setTitle(`${target.username}'s Roblox Info`)
			.setURL(roblox.profileUrl(profile.id))
			.setColor(COLORS.info)
			.setThumbnail(avatar)
			.addFields(
				{ name: "Username", value: `\`${profile.name}\``, inline: true },
				{ name: "Display Name", value: `\`${profile.displayName}\``, inline: true },
				{ name: "User ID", value: `\`${profile.id}\``, inline: true },
				{ name: "Friends", value: friends === null ? "Unknown" : `\`${friends}\``, inline: true },
				{ name: "Joined Roblox", value: profile.created ? timestamp(new Date(profile.created)) : "Unknown", inline: true },
			);
		if (profile.isBanned) embed.addFields({ name: "Status", value: "⛔ Banned from Roblox", inline: true });
		if (stores.scammers.has(profile.id)) embed.addFields({ name: "⚠️ Warning", value: "This account is in our scammers database." });
		await interaction.editReply({ embeds: [embed] });
	},
};
