const fetch = require("node-fetch");
let smsSentTime = 0;

// only allow to send sms again in 5 minutes or more
const sendSMStoMaster = () => {
	if ((Date.now() - smsSentTime) / 1000 > 60 * 5) {
		fetch("https://textbelt.com/text", {
			method: "post",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				phone: process.env.PHONE_NUM,
				message: "Someone is waiting for you to play Goofspiel...",
				key: process.env.SMS_KEY,
			}),
		})
			.then((response) => {
				// console.log("sms service response: ", response);
				return response.json();
			})
			.then((data) => {
				console.log("sms service results: ", data);
				smsSentTime = Date.now();
			});
	}
};

module.exports = { sendSMStoMaster };
