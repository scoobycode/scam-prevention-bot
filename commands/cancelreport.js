"use strict";

const { EPHEMERAL, field, modLog, slash } = require("../src/util");

module.exports = {
	category: "Public",
	data: slash("cancelreport", "Removes your unread scam report"),
	async execute(interaction, { client, reports }) {
		await interaction.deferReply({ flags: EPHEMERAL });
		const report = await reports.findByReporter(interaction.user.id);
		if (!report) return interaction.editReply("You do not have any unread reports!");

		await reports.remove(report);
		await interaction.editReply(`✅ Cancelled your report (case #${report.caseNumber}).`);
		await modLog(client, "Cancelled Report", [
			field("Case Number", report.caseNumber),
			field("Canceller", interaction.user.username),
			field("Canceller ID", interaction.user.id),
		]);
	},
};
