"use strict";

const { PermissionFlagsBits } = require("discord.js");
const { EPHEMERAL, slash } = require("../src/util");

module.exports = {
	category: "Premium",
	data: slash("banscammers", "Bans every verified scammer from your server")
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

	async execute(interaction, { isPremium, stores }) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
			return interaction.reply({ content: "You do not have permission to use this command.", flags: EPHEMERAL });
		}
		if (!isPremium(interaction.user.id)) {
			return interaction.reply({ content: "This is a premium only command. You are not premium. Run `/buypremium` to get it.", flags: EPHEMERAL });
		}
		const me = interaction.guild.members.me;
		if (!me.permissions.has(PermissionFlagsBits.BanMembers)) {
			return interaction.reply({ content: "I do not have permission to ban members in this server.", flags: EPHEMERAL });
		}

		// Discord accounts linked (through /verify) to a Roblox account in the scammers database.
		const targets = [...stores.verified.values()]
			.filter((link) => stores.scammers.has(link.value))
			.map((link) => link.key)
			.filter((id) => id !== interaction.guild.ownerId && id !== interaction.client.user.id);
		if (!targets.length) return interaction.reply("There are no known scammers to ban.");

		await interaction.deferReply();
		const reason = `Known scammer (Scam Prevention Bot, requested by ${interaction.user.username})`;
		let banned = 0;
		let failed = 0;

		if (me.permissions.has(PermissionFlagsBits.ManageGuild)) {
			// Bulk ban: up to 200 users per request, much faster than one at a time.
			for (let i = 0; i < targets.length; i += 200) {
				const result = await interaction.guild.bans.bulkCreate(targets.slice(i, i + 200), { reason });
				banned += result.bannedUsers.length;
				failed += result.failedUsers.length;
			}
		} else {
			for (const id of targets) {
				await interaction.guild.bans.create(id, { reason }).then(() => banned++, () => failed++);
			}
		}

		await interaction.editReply(`🔨 Banned ${banned} known scammer${banned === 1 ? "" : "s"}${failed ? ` (${failed} couldn't be banned or were already banned)` : ""}.`);
	},
};
