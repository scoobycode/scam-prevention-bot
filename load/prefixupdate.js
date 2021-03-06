module.exports.run = async (bot) => {
	bot.on("message", (message) => {
		if (!message.author.bot || message.channel.type !== "dm") {
			var rawPrefix = bot.data.prefixes.find((value) => value.guild === message.guild.id);
			if (new RegExp(`^<@!?${bot.user.id}> prefix$`, "").test(message.content.toLowerCase())) {
				var prefix = (rawPrefix != null) ? rawPrefix.prefix : bot.defaultPrefix;
				if (bot.data.timeout.find((value) => value.id === message.author.id)) return message.reply("You cannot use this command yet!").catch(() => {
					return message.author.send(`You attempted to use a command in ${message.channel}, but I can not chat there.`).catch(function() {});
				});
				bot.data.timeout.push({ id: message.author.id });
				bot.setTimeout(function() {
					bot.data.timeout.splice(bot.data.timeout.indexOf(bot.data.timeout.find((value) => value.id === message.author.id)), 1);
				}, 2000);
				return message.reply(`My prefix is \`${prefix}\``).catch(() => {
					return message.author.send(`You attempted to use a command in ${message.channel}, but I can not chat there.`).catch(function() {});
				});
			}
			if (new RegExp(`^<@!?${bot.user.id}> prefix reset$`, "").test(message.content.toLowerCase()) && (message.member.hasPermission("MANAGE_GUILD"))) {
				if (bot.data.timeout.find((value) => value.id === message.author.id)) return message.reply("You cannot use this command yet!").catch(() => {
					return message.author.send(`You attempted to use a command in ${message.channel}, but I can not chat there.`).catch(function() {});
				});
				if (prefix !== bot.defaultPrefix) {
					bot.data.prefixes.splice(bot.data.prefixes.indexOf(bot.data.prefixes.find((value) => value.guild === message.guild.id)), 1);
					if (rawPrefix) rawPrefix.msg.delete();
					bot.data.timeout.push({ id: message.author.id });
					bot.setTimeout(function() {
						bot.data.timeout.splice(bot.data.timeout.indexOf(bot.data.timeout.find((value) => value.id === message.author.id)), 1);
					}, 2000);
					return message.react("\u2705").catch(function() {});
				} else {
					bot.data.timeout.push({ id: message.author.id });
					bot.setTimeout(function() {
						bot.data.timeout.splice(bot.data.timeout.indexOf(bot.data.timeout.find((value) => value.id === message.author.id)), 1);
					}, 2000);
					return message.react("\u2705").catch(function() {});
				}
			}
		}
	});
};
