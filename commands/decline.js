"use strict";

const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, field, infoEmbed, modLog, slash } = require("../src/util");

const DEFAULT_MESSAGE = ":x: **Scam Report Declined -- After reviewing your report, our moderators and admins have decided this is not a valid scam report. This might have been declined due to lack of evidence or lack of information in general. As a result, this user will not be added to our database.** :x:";

module.exports = {
	category: "Support",
	staffOnly: true,
	requiredLevel: LEVELS.SUPPORT,
	data: slash("decline", "Declines a user's scam report")
		.addIntegerOption((o) => o.setName("case").setDescription("The case number").setRequired(true).setMinValue(1))
		.addStringOption((o) => o.setName("reason").setDescription("Why it was declined (sent to the reporter)").setMaxLength(1000)),

	async execute(interaction, { client, reports }) {
		const caseNumber = interaction.options.getInteger("case", true);
		const reason = interaction.options.getString("reason");
		await interaction.deferReply({ flags: EPHEMERAL });
		const report = await reports.findByCase(caseNumber);
		if (!report) return interaction.editReply("Please provide a correct case number!");

		const user = report.reporterId ? await client.users.fetch(report.reporterId).catch(() => null) : null;
		const text = reason
			? `:x: **Scam Report Declined -- After reviewing your report, our staff members have decided this is not a valid scam report. Here is the reason your report was declined: ${reason}** :x:`
			: DEFAULT_MESSAGE;
		const dmSent = user ? await user.send({ embeds: [infoEmbed(text)] }).then(() => true, () => false) : false;

		await reports.remove(report);
		await interaction.editReply(`✅ Declined case #${caseNumber}.${dmSent ? "" : " I couldn't DM the reporter."}`);
		await modLog(client, "Declined Report", [
			field("Case Number", String(caseNumber)),
			field("Moderator", `<@${interaction.user.id}>`),
			field("Declined", user?.username ?? "Unknown user"),
			field("Declined ID", report.reporterId ?? "Unknown"),
			field("Reason", reason ?? "No reason provided."),
		]);
	},
};
