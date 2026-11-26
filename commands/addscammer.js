"use strict";

const roblox = require("../src/roblox");
const { scammerPost } = require("../src/scammer-post");
const { LEVELS } = require("../src/permissions");
const { channelFor } = require("../src/channels");
const { EPHEMERAL, field, modLog, slash } = require("../src/util");

module.exports = {
	category: "Support",
	staffOnly: true,
	requiredLevel: LEVELS.SUPPORT,
	data: slash("addscammer", "Adds a scammer to the scammers database")
		.addStringOption((o) => o.setName("username").setDescription("The scammer's Roblox username").setRequired(true).setMaxLength(20)),

	async execute(interaction, { client, stores }) {
		const username = interaction.options.getString("username", true);
		await interaction.deferReply({ flags: EPHEMERAL });
		const user = await roblox.resolveUser(username);
		if (!user) return interaction.editReply("Invalid user.");
		if (stores.scammers.has(user.id)) return interaction.editReply(`**${user.name}** is already in the scammer database!`);

		await stores.scammers.set({ key: user.id });
		const posts = channelFor("scammerPosts");
		const avatar = await roblox.tryAvatarUrl(user.id, "full");
		await posts.send(scammerPost(user, avatar)).catch((err) => console.warn("Couldn't post the new scammer:", err));
		await interaction.editReply(`✅ Added **${user.name}** to the scammer database.`);
		await modLog(client, "Scammer Added", [
			field("Moderator", `<@${interaction.user.id}>`),
			field("User Added", `${user.name} (${user.id})`),
		]);
	},
};
