const fetch = require("node-fetch");

const lastText = {
	time: 0,
	uuids: [],
	quotaRemaining: 200,
};
const httpsUrl = "https://goof-spiel.herokuapp.com/games/";

// only 1 sms is allowed to send in 5 minutes, due to cost
const sendTexttoMaster = (sender, text) => {
	fetch("https://textbelt.com/text", {
		method: "post",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			phone: process.env.PHONE_NUM,
			message: `${lastText.quotaRemaining}: ${sender} just joined your Goofspiel game, game link: ${httpsUrl}${text}`,
			key: process.env.SMS_KEY,
		}),
	})
		.then((response) => {
			// console.log("sms service response: ", response);
			return response.json();
		})
		.then((data) => {
			console.log("sms service results: ", data);
			lastText.quotaRemaining = --data.quotaRemaining;
			lastText.time = Date.now();
			if (lastText.uuids.length === 5) {
				lastText.uuids.shift();
			}
			lastText.uuids.push(text);
		});
};

module.exports = { sendTexttoMaster, lastText };
