"use strict";

const config = require("../config");

/**
 * Registers slash commands with Discord.
 * Public and premium commands are global; Support and Owner commands are only registered
 * in the support server so regular users never see them.
 */
async function registerCommands(client, commands) {
	const globalCommands = [];
	const staffCommands = [];
	for (const command of commands.values()) {
		(command.staffOnly ? staffCommands : globalCommands).push(command.data.toJSON());
	}

	await client.application.commands.set(globalCommands);

	const supportGuild = await client.guilds.fetch(config.guilds.support).catch(() => null);
	if (supportGuild) {
		await supportGuild.commands.set(staffCommands);
	} else {
		console.warn("The bot isn't in the support server, so staff commands weren't registered.");
	}

	console.log(`Registered ${globalCommands.length} global and ${staffCommands.length} staff slash commands.`);
}

module.exports = { registerCommands };
