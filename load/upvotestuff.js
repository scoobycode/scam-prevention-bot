module.exports.run = async (bot) => {
	let upvotesholdingchannel = bot.channels.get("448615839533498388");
	let upvotessend = bot.channels.get("469615231618777118");
	var upvoter;
	upvotesholdingchannel.fetchMessages({ limit: 100 }).then(async (msgs) => {
		for (let msg of msgs.array()) {
			upvoter = await bot.fetchUser(msg.content);
			upvotessend.send(`Many thanks to ${upvoter.tag} for upvoting our bot!`).then(() => {
				msg.delete();
			}).catch(() => {
				console.log("Couldn't access the vote posting channel.");
			});
		}
	}).catch(() => {
		console.log("Couldn't access the database.");
	});
	bot.on("message", async (message) => {
		if (message.channel.id === "448615839533498388") {
			let upvotessend = bot.channels.get("469615231618777118");
			upvoter = await bot.fetchUser(message.content);
			upvotessend.send(`Many thanks to ${upvoter.tag} for upvoting our bot!`).then(() => {
				message.delete();
			}).catch(() => {
				console.log("Couldn't access the vote posting channel.");
			});
		}
	});
};
