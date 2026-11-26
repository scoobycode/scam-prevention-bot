"use strict";

const { EPHEMERAL, slash } = require("../src/util");

module.exports = {
	category: "Public",
	data: slash("redeem", "Redeems a premium code to get you premium")
		.addStringOption((o) => o.setName("code").setDescription("Your premium code").setRequired(true).setMaxLength(64)),
	async execute(interaction, { config, isPremium, stores }) {
		const code = interaction.options.getString("code", true).trim();
		if (isPremium(interaction.user.id)) return interaction.reply({ content: "You already have premium!", flags: EPHEMERAL });

		const entry = stores.premiumCodes.get(code);
		if (!entry) return interaction.reply({ content: "Not a valid code!", flags: EPHEMERAL });

		await interaction.deferReply({ flags: EPHEMERAL });
		// Remove the code first so it can't be used twice.
		await stores.premiumCodes.delete(code);
		const months = Number(entry.value) || 0;
		const expires = months === 0 ? 0 : Date.now() + months * config.monthMs;
		await stores.premiumUsers.set({ key: interaction.user.id, value: String(expires) });
		await interaction.editReply(months === 0 ? "You now have premium, forever!" : `You now have premium for ${months} month${months === 1 ? "" : "s"}!`);
	},
};
