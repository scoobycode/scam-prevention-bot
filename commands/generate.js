"use strict";

const { randomInt } = require("node:crypto");
const { AttachmentBuilder } = require("discord.js");
const { EPHEMERAL, slash } = require("../src/util");

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** 10 random characters from a cryptographically secure source. */
function makeCode() {
	return Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

module.exports = {
	category: "Owners",
	staffOnly: true,
	ownerOnly: true,
	data: slash("generate", "Generates premium codes")
		.addIntegerOption((o) => o.setName("amount").setDescription("How many codes (1-50)").setRequired(true).setMinValue(1).setMaxValue(50))
		.addIntegerOption((o) => o.setName("months").setDescription("Months of premium per code (0 = forever)").setRequired(true).setMinValue(0).setMaxValue(120)),

	async execute(interaction, { stores }) {
		const amount = interaction.options.getInteger("amount", true);
		const months = interaction.options.getInteger("months", true);
		await interaction.deferReply({ flags: EPHEMERAL });

		const codes = [];
		for (let i = 0; i < amount; i++) {
			let code = makeCode();
			while (stores.premiumCodes.has(code)) code = makeCode();
			try {
				await stores.premiumCodes.set({ key: code, value: String(months) });
				codes.push(code);
			} catch (err) {
				console.error("Couldn't save a premium code:", err);
				break;
			}
		}

		const summary = `Generated ${codes.length}/${amount} code${amount === 1 ? "" : "s"} for ${months === 0 ? "lifetime" : `${months} month${months === 1 ? "" : "s"} of`} premium.`;
		if (!codes.length) return interaction.editReply("Stopped because I couldn't add anything to the database.");
		// Only you can see this reply. Codes also come as a .txt file so they're easy to copy.
		await interaction.editReply({
			content: `${summary}\n\`\`\`\n${codes.join("\n")}\n\`\`\``.slice(0, 2000),
			files: [new AttachmentBuilder(Buffer.from(codes.join("\n")), { name: "premium-codes.txt" })],
		});
	},
};
