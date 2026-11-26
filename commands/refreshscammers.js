"use strict";

const roblox = require("../src/roblox");
const { deleteMessages, fetchAllMessages } = require("../src/db");
const { LEVELS } = require("../src/permissions");
const { isPostFor, scammerPost } = require("../src/scammer-post");
const { EPHEMERAL, field, getChannel, modLog, slash } = require("../src/util");

let running = false;

module.exports = {
	category: "Owners",
	staffOnly: true,
	requiredLevel: LEVELS.OWNER,
	data: slash("refreshscammers", "Reposts every scammer in the scammer list channel with their current name and avatar"),

	async execute(interaction, { client, config, stores }) {
		if (running) return interaction.reply({ content: "A refresh is already running.", flags: EPHEMERAL });
		running = true;
		try {
			await interaction.deferReply({ flags: EPHEMERAL });
			const ids = [...stores.scammers.values()].map((entry) => entry.key).filter((id) => /^\d+$/.test(id));
			if (!ids.length) return interaction.editReply("The scammer database is empty.");

			await interaction.editReply(`Looking up ${ids.length} scammers on Roblox…`);
			// Batched: 100 users per Roblox request instead of one request each.
			const [users, avatars] = await Promise.all([roblox.getUsersBatch(ids), roblox.getAvatarUrlsBatch(ids)]);

			const channel = await getChannel(client, config.channels.scammerPosts);
			let oldPosts = await fetchAllMessages(channel);

			let done = 0;
			let failed = 0;
			// Oldest scammer first, so the newest ones end up at the bottom like before.
			for (const id of ids) {
				try {
					const user = users.get(id) ?? { id };
					await channel.send(scammerPost(user, avatars.get(id) ?? null));
					// Post the new one first, then remove the old one, so nobody is ever missing from the list.
					const old = oldPosts.filter((message) => isPostFor(message, id) && message.author.id === client.user.id);
					await deleteMessages(old);
					oldPosts = oldPosts.filter((message) => !old.includes(message));
					done++;
				} catch (err) {
					failed++;
					console.warn(`Couldn't refresh scammer ${id}:`, err);
				}
				if ((done + failed) % 10 === 0) {
					await interaction.editReply(`Refreshing the scammer list… ${done + failed}/${ids.length}`).catch(() => {});
				}
			}

			const missing = ids.filter((id) => !users.has(id)).length;
			await interaction.editReply([
				`✅ Reposted ${done}/${ids.length} scammers with their avatars.`,
				failed ? `⚠️ ${failed} couldn't be posted (see the bot's console).` : "",
				missing ? `ℹ️ ${missing} Roblox accounts no longer exist, so they show as "Unknown user".` : "",
			].filter(Boolean).join("\n")).catch(() => {}); // The reply can expire after 15 minutes on very long lists.
			await modLog(client, "Scammer List Refreshed", [
				field("Moderator", `<@${interaction.user.id}>`),
				field("Reposted", `${done}/${ids.length}`),
			]);
		} finally {
			running = false;
		}
	},
};
