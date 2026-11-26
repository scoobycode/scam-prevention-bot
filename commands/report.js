"use strict";

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const roblox = require("../src/roblox");
const { nextCaseNumber } = require("../src/reports");
const { COLORS, EPHEMERAL, field, getChannel, infoEmbed, slash, timestamp, truncate } = require("../src/util");

const DRAFT_TTL_MS = 10 * 60 * 1000;
const drafts = new Map();

function proofText(draft) {
	const lines = [...draft.links];
	if (draft.attachments.length) lines.push(`${draft.attachments.length} file${draft.attachments.length === 1 ? "" : "s"} attached to this message`);
	return lines.join("\n");
}

function reportEmbed(title, draft, caseNumber) {
	const scammer = draft.scammer ? `${draft.scammer.name} (${roblox.profileUrl(draft.scammer.id)})` : draft.scammerInput;
	return new EmbedBuilder()
		.setTitle(title)
		.setColor(COLORS.log)
		.addFields(
			// Field names are read back by /accept, /decline and /cancelreport, so keep them the same.
			field("Case Number", String(caseNumber)),
			field("Guild Reported From", draft.guildName),
			field("Guild ID", draft.guildId),
			field("Reporter", `<@${draft.reporterId}>`),
			field("Reporter's Username", draft.reporterName),
			field("Reporter's User ID", draft.reporterId),
			field("Time Reported", timestamp(new Date(draft.createdAt))),
			field("Reported User", scammer),
			field("Reporter's Roblox Username", draft.reporterRoblox),
			field("Proof Of Scam", proofText(draft)),
			field("Description", draft.description),
		);
}

/** Sends a report with its proof files re-uploaded (Discord's links to the originals expire). */
async function sendReport(channel, embed, draft) {
	const files = draft.attachments.map((a) => ({ attachment: a.url, name: a.name }));
	try {
		return await channel.send({ embeds: [embed], files, allowedMentions: { parse: [] } });
	} catch (err) {
		if (!files.length) throw err;
		// Files too big to re-upload: fall back to links.
		const withLinks = EmbedBuilder.from(embed).spliceFields(9, 1, field("Proof Of Scam", [...draft.links, ...draft.attachments.map((a) => a.url)].join("\n")));
		return channel.send({ embeds: [withLinks], allowedMentions: { parse: [] } });
	}
}

module.exports = {
	category: "Public",
	data: slash("report", "Reports a scammer to our staff team")
		.addStringOption((o) => o.setName("scammer").setDescription("The scammer's Roblox username").setRequired(true).setMaxLength(20))
		.addStringOption((o) => o.setName("your_username").setDescription("Your Roblox username").setRequired(true).setMaxLength(20))
		.addStringOption((o) => o.setName("description").setDescription("How were you scammed? Explain anything we need to know.").setRequired(true).setMaxLength(1000))
		.addAttachmentOption((o) => o.setName("proof").setDescription("A screenshot or video proving the scam").setRequired(true))
		.addAttachmentOption((o) => o.setName("proof2").setDescription("More proof"))
		.addAttachmentOption((o) => o.setName("proof3").setDescription("More proof"))
		.addStringOption((o) => o.setName("links").setDescription("Links to more proof, separated by spaces").setMaxLength(1000)),

	async execute(interaction, { client, config, reports, stores }) {
		await interaction.deferReply({ flags: EPHEMERAL });

		const channel = await getChannel(client, config.channels.reports);
		if ((channel.topic ?? "").trim().toLowerCase() === "closed") return interaction.editReply("🔨 We are currently undergoing maintenance! We will be back soon! 🔨");
		if (stores.blacklistedUsers.has(interaction.user.id)) return interaction.editReply("You cannot use this command because you are blacklisted!");
		if (stores.blacklistedGuilds.has(interaction.guildId)) return interaction.editReply("You cannot use this command because this server is blacklisted from using it!");
		if (await reports.findByReporter(interaction.user.id)) {
			return interaction.editReply("You already have a pending report. To prevent spam, you must wait until it is accepted or declined. If you don't want to wait, you can cancel it with `/cancelreport`.");
		}

		const scammerInput = interaction.options.getString("scammer", true).trim();
		const scammer = await roblox.resolveUser(scammerInput).catch(() => undefined);
		if (scammer === null) return interaction.editReply(`I couldn't find a Roblox user called \`${scammerInput}\`. Please check the spelling.`);

		const draft = {
			scammerInput,
			scammer,
			reporterId: interaction.user.id,
			reporterName: interaction.user.username,
			reporterRoblox: interaction.options.getString("your_username", true).trim(),
			description: interaction.options.getString("description", true),
			attachments: ["proof", "proof2", "proof3"].map((name) => interaction.options.getAttachment(name)).filter(Boolean).map((a) => ({ url: a.url, name: a.name })),
			links: (interaction.options.getString("links") ?? "").split(/\s+/).filter((link) => /^https?:\/\/\S+$/i.test(link)),
			guildId: interaction.guildId,
			guildName: interaction.guild?.name ?? "Unknown",
			createdAt: Date.now(),
		};
		drafts.set(interaction.user.id, draft);
		setTimeout(() => {
			if (drafts.get(interaction.user.id) === draft) drafts.delete(interaction.user.id);
		}, DRAFT_TTL_MS).unref();

		const preview = infoEmbed([
			"**The following information will be sent:**",
			`Scammer's Roblox Username: ${draft.scammer?.name ?? scammerInput}`,
			`Your Roblox Username: ${draft.reporterRoblox}`,
			`Proof Of Scam: ${draft.attachments.map((a) => a.name).concat(draft.links).join(", ")}`,
			`Other Information: ${truncate(draft.description, 1500)}`,
			"",
			"Remember, false reports will get you blacklisted from the system!",
		].join("\n"));
		await interaction.editReply({
			embeds: [preview],
			components: [new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId("report:confirm").setLabel("Send report").setStyle(ButtonStyle.Danger),
				new ButtonBuilder().setCustomId("report:cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
			)],
		});
	},

	async handleComponent(interaction, { client, config, reports }, [action]) {
		const draft = drafts.get(interaction.user.id);
		drafts.delete(interaction.user.id);
		if (!draft) return interaction.update({ content: "This report expired. Run `/report` again.", embeds: [], components: [] });
		if (action !== "confirm") return interaction.update({ content: "Prompt Cancelled.", embeds: [], components: [] });

		await interaction.update({ content: "Sending your report…", embeds: [], components: [] });
		const caseNumber = await nextCaseNumber(client);
		const [reportsChannel, logChannel] = await Promise.all([getChannel(client, config.channels.reports), getChannel(client, config.channels.modLogs)]);
		const [sent] = await Promise.all([
			sendReport(reportsChannel, reportEmbed("New Scam Report", draft, caseNumber), draft),
			sendReport(logChannel, reportEmbed("Copy Of Report - Logging Purposes", draft, caseNumber), draft).catch((err) => console.warn("Couldn't log report copy:", err)),
		]);
		reports.add(sent);

		await interaction.editReply({
			content: "",
			embeds: [infoEmbed(`✅ **Successfully Submitted! -- Your report (case #${caseNumber}) will be reviewed by our admins and moderators shortly!** ✅`)],
		});
	},
};
