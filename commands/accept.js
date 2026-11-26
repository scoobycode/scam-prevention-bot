"use strict";

const { LEVELS } = require("../src/permissions");
const { EPHEMERAL, field, infoEmbed, modLog, slash } = require("../src/util");

module.exports = {
	category: "Support",
	staffOnly: true,
	requiredLevel: LEVELS.SUPPORT,
	data: slash("accept", "Accepts a user's scam report")
		.addIntegerOption((o) => o.setName("case").setDescription("The case number").setRequired(true).setMinValue(1)),

	async execute(interaction, { client, reports }) {
		const caseNumber = interaction.options.getInteger("case", true);
		await interaction.deferReply({ flags: EPHEMERAL });
		const report = await reports.findByCase(caseNumber);
		if (!report) return interaction.editReply("Please provide a correct case number!");

		const user = report.reporterId ? await client.users.fetch(report.reporterId).catch(() => null) : null;
		const dmSent = user
			? await user.send({ embeds: [infoEmbed(":white_check_mark: **Scam Report Accepted -- After reviewing your report, our moderators and admins have decided this is a valid scam report. This user will be added to our database shortly.** :white_check_mark:")] }).then(() => true, () => false)
			: false;

		await reports.remove(report);
		await interaction.editReply(`✅ Accepted case #${caseNumber}.${dmSent ? "" : " I couldn't DM the reporter."} Don't forget to \`/addscammer\` them.`);
		await modLog(client, "Accepted Report", [
			field("Case Number", String(caseNumber)),
			field("Moderator", `<@${interaction.user.id}>`),
			field("Accepted", user?.username ?? "Unknown user"),
			field("Accepted ID", report.reporterId ?? "Unknown"),
		]);
	},
};
