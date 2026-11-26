"use strict";

// /report flow:
//   1. Type /report (nothing else) and a form pops up with every question and a screenshot upload box
//   2. A preview with the scammer's avatar: Send / Edit / Cancel
//   3. Sent to staff, with the screenshots re-uploaded so they never expire

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, FileUploadBuilder, LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const roblox = require("../src/roblox");
const { nextCaseNumber } = require("../src/reports");
const { channelFor } = require("../src/channels");
const { COLORS, EPHEMERAL, field, infoEmbed, slash, timestamp, truncate } = require("../src/util");

const DRAFT_TTL_MS = 15 * 60 * 1000;
const drafts = new Map();

// ---- Helpers ---------------------------------------------------------------------------------

function saveDraft(userId, draft) {
	drafts.set(userId, draft);
	setTimeout(() => {
		if (drafts.get(userId) === draft) drafts.delete(userId);
	}, DRAFT_TTL_MS).unref();
}

const isMedia = (attachment) => !attachment.contentType || /^(image|video)\//.test(attachment.contentType);

function form(draft) {
	const text = (id, label, description, style, { placeholder, value, min, max, required = true }) => {
		const input = new TextInputBuilder().setCustomId(id).setStyle(style).setRequired(required).setMaxLength(max);
		if (placeholder) input.setPlaceholder(placeholder);
		if (min) input.setMinLength(min);
		if (value) input.setValue(value);
		return new LabelBuilder().setLabel(label).setDescription(description).setTextInputComponent(input);
	};
	// Files can't be pre-filled, so when editing, the screenshots already added are kept unless new ones are uploaded.
	const hasProof = draft.attachments?.length > 0;
	const upload = new LabelBuilder()
		.setLabel("Screenshots or videos")
		.setDescription(hasProof ? `Leave empty to keep the ${draft.attachments.length} you already added.` : "Proof of the scam: the trade, the chat, anything that shows what happened.")
		.setFileUploadComponent(new FileUploadBuilder().setCustomId("proof").setMinValues(hasProof ? 0 : 1).setMaxValues(5).setRequired(!hasProof));

	return new ModalBuilder()
		.setCustomId("report:form")
		.setTitle("Report a scammer")
		.addLabelComponents(
			text("scammer", "Scammer's Roblox username", "Their username, not their display name.", TextInputStyle.Short, { placeholder: "e.g. Builderman", value: draft.scammerInput, min: 3, max: 20 }),
			text("yours", "Your Roblox username", "So staff can check your side of the trade.", TextInputStyle.Short, { placeholder: "e.g. Roblox", value: draft.reporterRoblox, min: 3, max: 20 }),
			text("what", "What happened?", "Tell us what was agreed and how they scammed you.", TextInputStyle.Paragraph, {
				placeholder: "e.g. I traded my Dominus for 50k Robux, sent it, and they left without paying.",
				value: draft.description,
				min: 10,
				max: 1000,
			}),
			upload,
			text("links", "Video links (optional)", "YouTube, Gyazo or Medal links, one per line.", TextInputStyle.Paragraph, {
				value: draft.links?.join("\n"),
				max: 500,
				required: false,
			}),
		);
}

const buttons = (...list) => new ActionRowBuilder().addComponents(list.map(([id, label, style]) => new ButtonBuilder().setCustomId(`report:${id}`).setLabel(label).setStyle(style)));
const SEND = ["confirm", "Send report", ButtonStyle.Success];
const EDIT = ["edit", "Edit", ButtonStyle.Secondary];
const FIX = ["edit", "Fix it", ButtonStyle.Primary];
const CANCEL = ["cancel", "Cancel", ButtonStyle.Danger];

function proofList(draft) {
	return [...draft.attachments.map((a) => `📎 ${a.name}`), ...draft.links.map((l) => `🔗 ${l}`)].join("\n");
}

function previewEmbed(draft) {
	const embed = new EmbedBuilder()
		.setTitle("Check your report")
		.setColor(COLORS.info)
		.setDescription("Make sure everything is right, then press **Send report**. Staff will DM you when they've reviewed it.")
		.addFields(
			field("Scammer", `[${draft.scammer.name}](${roblox.profileUrl(draft.scammer.id)})${draft.scammer.displayName && draft.scammer.displayName !== draft.scammer.name ? ` (${draft.scammer.displayName})` : ""}`, true),
			field("You", draft.reporterRoblox, true),
			field("What happened", draft.description),
			field("Proof", proofList(draft)),
		)
		.setFooter({ text: "⚠️ False reports get you blacklisted from reporting." });
	if (draft.avatar) embed.setThumbnail(draft.avatar);
	const firstImage = draft.attachments.find((a) => a.contentType?.startsWith("image/"));
	if (firstImage) embed.setImage(firstImage.url);
	return embed;
}

function reportEmbed(title, draft, caseNumber) {
	return new EmbedBuilder()
		.setTitle(title)
		.setColor(COLORS.log)
		.setThumbnail(draft.avatar ?? null)
		.addFields(
			// Field names are read back by /accept, /decline and /cancelreport, so keep them the same.
			field("Case Number", String(caseNumber)),
			field("Guild Reported From", draft.guildName),
			field("Guild ID", draft.guildId),
			field("Reporter", `<@${draft.reporterId}>`),
			field("Reporter's Username", draft.reporterName),
			field("Reporter's User ID", draft.reporterId),
			field("Time Reported", timestamp(new Date(draft.createdAt))),
			field("Reported User", `${draft.scammer.name} (${roblox.profileUrl(draft.scammer.id)})`),
			field("Reporter's Roblox Username", draft.reporterRoblox),
			field("Proof Of Scam", [...draft.links, draft.attachments.length ? `${draft.attachments.length} file(s) attached to this message` : ""].filter(Boolean).join("\n")),
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

/** Reasons this user can't report right now, or null. Uses cached data only, so the form opens instantly. */
async function blocker(interaction, { reports, stores }) {
	const channel = channelFor("reports");
	if ((channel.topic ?? "").trim().toLowerCase() === "closed") return "🔨 Reports are closed for maintenance right now. Please try again later!";
	if (stores.blacklistedUsers.has(interaction.user.id)) return "You can't send reports because you're blacklisted. If you think this is a mistake, ask in our support server (`/server`).";
	if (stores.blacklistedGuilds.has(interaction.guildId)) return "Reports can't be sent from this server. Try running `/report` in another server.";
	const pending = await reports.findByReporter(interaction.user.id);
	if (pending) return `You already have a report waiting for review (case #${pending.caseNumber}). Please wait for staff to look at it, or cancel it with \`/cancelreport\` to send a new one.`;
	return null;
}

// ---- Command ---------------------------------------------------------------------------------

module.exports = {
	category: "Public",
	data: slash("report", "Report a scammer to our staff team"),

	async execute(interaction, ctx) {
		const reason = await blocker(interaction, ctx);
		if (reason) return interaction.reply({ content: reason, flags: EPHEMERAL });

		const draft = {
			attachments: [],
			links: [],
			reporterId: interaction.user.id,
			reporterName: interaction.user.username,
			guildId: interaction.guildId,
			guildName: interaction.guild?.name ?? "Unknown",
		};
		saveDraft(interaction.user.id, draft);
		await interaction.showModal(form(draft));
	},

	async handleComponent(interaction, ctx, [action]) {
		const { reports, stores } = ctx;
		const draft = drafts.get(interaction.user.id);
		if (!draft) {
			const expired = { content: "This report timed out. Run `/report` again to start over.", embeds: [], components: [] };
			return interaction.isModalSubmit() && !interaction.isFromMessage() ? interaction.reply({ ...expired, flags: EPHEMERAL }) : interaction.update(expired);
		}

		if (action === "cancel") {
			drafts.delete(interaction.user.id);
			return interaction.update({ content: "Report cancelled. Nothing was sent.", embeds: [], components: [] });
		}

		if (action === "edit") return interaction.showModal(form(draft));

		if (action === "form") {
			// The first form submission creates a new reply; submitting again after "Edit" updates it.
			if (interaction.isFromMessage()) await interaction.deferUpdate();
			else await interaction.deferReply({ flags: EPHEMERAL });

			const value = (id) => interaction.fields.getTextInputValue(id).trim();
			draft.scammerInput = value("scammer");
			draft.reporterRoblox = value("yours");
			draft.description = value("what");
			const rawLinks = value("links").split(/\s+/).filter(Boolean);
			draft.links = rawLinks.filter((link) => /^https?:\/\/\S+$/i.test(link));
			const badLinks = rawLinks.length - draft.links.length;

			const uploaded = [...(interaction.fields.getUploadedFiles("proof", false)?.values() ?? [])];
			if (uploaded.length) {
				if (!uploaded.every(isMedia)) {
					return interaction.editReply({ content: "", embeds: [infoEmbed("Proof has to be pictures or videos (like .png, .jpg or .mp4). Press **Fix it** to upload them again.")], components: [buttons(FIX, CANCEL)] });
				}
				draft.attachments = uploaded.map((a) => ({ url: a.url, name: a.name, contentType: a.contentType }));
			}

			const problem = (text) => interaction.editReply({ content: "", embeds: [infoEmbed(text)], components: [buttons(FIX, CANCEL)] });

			const scammer = await roblox.resolveUser(draft.scammerInput);
			if (!scammer) return problem(`❓ I couldn't find a Roblox user called **${draft.scammerInput}**.\nCheck the spelling (it's their **username**, not their display name) and press **Fix it**.`);
			if (scammer.name.toLowerCase() === draft.reporterRoblox.toLowerCase()) return problem("You put the same name for you and the scammer. Press **Fix it** to change one of them.");
			if (stores.scammers.has(scammer.id)) {
				drafts.delete(interaction.user.id);
				return interaction.editReply({
					content: "",
					embeds: [infoEmbed(`✅ **${scammer.name}** is already in our scammer database, so there's no need to report them again. Thanks for looking out!\n${roblox.profileUrl(scammer.id)}`)],
					components: [],
				});
			}

			draft.scammer = scammer;
			draft.avatar = await roblox.tryAvatarUrl(scammer.id, "headshot");
			return interaction.editReply({
				content: badLinks ? `ℹ️ ${badLinks} link${badLinks === 1 ? " wasn't" : "s weren't"} added because ${badLinks === 1 ? "it doesn't" : "they don't"} start with http:// or https://.` : "",
				embeds: [previewEmbed(draft)],
				components: [buttons(SEND, EDIT, CANCEL)],
			});
		}

		if (action === "confirm") {
			if (!draft.scammer) return interaction.showModal(form(draft));
			drafts.delete(interaction.user.id);
			await interaction.update({ content: "📨 Sending your report…", embeds: [], components: [] });

			// Things might have changed while the preview was open.
			const reason = await blocker(interaction, ctx);
			if (reason) return interaction.editReply(reason);

			draft.createdAt = Date.now();
			const caseNumber = await nextCaseNumber(stores);
			const [sent] = await Promise.all([
				sendReport(channelFor("reports"), reportEmbed("New Scam Report", draft, caseNumber), draft),
				sendReport(channelFor("modLogs"), reportEmbed("Copy Of Report - Logging Purposes", draft, caseNumber), draft).catch((err) => console.warn("Couldn't log report copy:", err)),
			]);
			reports.add(sent);

			return interaction.editReply({
				content: "",
				embeds: [infoEmbed([
					`✅ **Report sent!** Your case number is **#${caseNumber}**.`,
					"",
					`Staff will review your report about **${truncate(draft.scammer.name, 20)}** and DM you with the result, so keep your DMs open.`,
					"Changed your mind? Use `/cancelreport` any time before it's reviewed.",
				].join("\n")).setThumbnail(draft.avatar ?? null)],
			});
		}
	},
};
