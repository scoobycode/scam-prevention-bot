"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
const config = require("./config");
const { setupChannels } = require("./src/channels");
const { createStores, isPremium, seedScammersFromPosts, sweepExpiredPremium } = require("./src/stores");
const { ReportIndex } = require("./src/reports");
const { getPermissionLevel } = require("./src/permissions");
const { registerCommands } = require("./src/register");
const { EPHEMERAL, respond } = require("./src/util");

if (!config.token) {
	console.error("No bot token found. Set BOT_TOKEN in your environment or in a .env file.");
	process.exit(1);
}

// Slash commands only need the Guilds intent. The optional features ask for more.
const intents = [GatewayIntentBits.Guilds];
if (config.features.streamStatus) intents.push(GatewayIntentBits.GuildPresences);
if (config.features.upvoteRelay) intents.push(GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent);

const client = new Client({
	intents,
	// Never ping @everyone or roles from bot messages.
	allowedMentions: { parse: ["users"] },
});

// ---- Load commands -------------------------------------------------------------------------

const commands = new Collection();
const commandsDir = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"))) {
	try {
		const command = require(path.join(commandsDir, file));
		if (!command.data || typeof command.execute !== "function") throw new Error("it must export `data` and `execute`");
		commands.set(command.data.name, command);
	} catch (err) {
		console.error(`The ${file} command failed to load:`, err);
	}
}

const stores = createStores(client);
const reports = new ReportIndex(client);
const ctx = { client, commands, config, reports, stores, isPremium: (userId) => isPremium(stores, userId) };
let ready = false;

// ---- Startup -------------------------------------------------------------------------------

client.once(Events.ClientReady, async () => {
	await setupChannels(client).catch((err) => console.error("Channel setup failed:", err.message));
	await stores.loadAll();
	await reports.load().then((n) => console.log(`Loaded ${n} open reports.`)).catch((err) => console.error("Couldn't load open reports:", err));
	await registerCommands(client, commands).catch((err) => console.error("Couldn't register slash commands:", err));

	for (const file of fs.readdirSync(path.join(__dirname, "load")).filter((f) => f.endsWith(".js"))) {
		try {
			require(path.join(__dirname, "load", file)).start(client, ctx);
		} catch (err) {
			console.error(`The ${file} module failed to start:`, err);
		}
	}

	await sweepExpiredPremium(client, stores);
	setInterval(() => sweepExpiredPremium(client, stores), 10 * 60 * 1000).unref();

	ready = true;
	seedScammersFromPosts(stores).catch((err) => console.error("Couldn't rebuild the scammer database:", err));
	console.log(`${client.user.tag} is online. ${commands.size} commands loaded.`);
});

// ---- Command handling ----------------------------------------------------------------------

const cooldowns = new Map();

function onCooldown(userId) {
	const until = cooldowns.get(userId);
	if (until && until > Date.now()) return true;
	cooldowns.set(userId, Date.now() + config.cooldownMs);
	setTimeout(() => {
		if ((cooldowns.get(userId) ?? 0) <= Date.now()) cooldowns.delete(userId);
	}, config.cooldownMs).unref();
	return false;
}

async function runCommand(interaction) {
	const command = commands.get(interaction.commandName);
	if (!command) return;

	if (!ready) return interaction.reply({ content: "I'm still starting up, please try again in a few seconds.", flags: EPHEMERAL });
	if (onCooldown(interaction.user.id)) return interaction.reply({ content: "You cannot use this command yet!", flags: EPHEMERAL });

	const permissionLevel = await getPermissionLevel(client, interaction.user.id);
	const allowed = command.ownerOnly ? interaction.user.id === config.ownerId : permissionLevel >= (command.requiredLevel ?? 0);
	if (!allowed) return interaction.reply({ content: "You don't have permission to use this command.", flags: EPHEMERAL });

	await command.execute(interaction, { ...ctx, permissionLevel });
}

client.on(Events.InteractionCreate, async (interaction) => {
	try {
		if (interaction.isChatInputCommand()) {
			await runCommand(interaction);
		} else if (interaction.isButton() || interaction.isModalSubmit()) {
			// Buttons and forms use custom IDs like "report:confirm".
			const [name, ...args] = interaction.customId.split(":");
			const command = commands.get(name);
			if (command?.handleComponent) await command.handleComponent(interaction, ctx, args);
		}
	} catch (err) {
		console.error(`Error handling ${interaction.isChatInputCommand() ? `/${interaction.commandName}` : interaction.customId}:`, err);
		const message = err?.expose ? err.message : "Something went wrong. Please try again, and contact support with /server if it keeps happening.";
		await respond(interaction, { content: message, flags: EPHEMERAL, embeds: [], components: [] }).catch(() => {});
	}
});

// ---- Process ------------------------------------------------------------------------------

process.on("unhandledRejection", (err) => console.error("Unhandled promise rejection:", err));
for (const signal of ["SIGINT", "SIGTERM"]) {
	process.once(signal, async () => {
		await client.destroy();
		process.exit(0);
	});
}

client.login(config.token);
