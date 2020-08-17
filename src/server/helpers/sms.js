const fetch = require("node-fetch");

const sendSMStoMaster = () => {
	fetch("https://textbelt.com/text", {
		method: "post",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			phone: "16046283456",
			message: "Someone is waiting to play Goofspiel with you...",
			key: "textbelt",
			// key:"bd6d7e308dd6f6e7aeecdf9dcdff21d6bdd5c1d0Ulxrymxbs3WzciUX8lhnOv914"
		}),
	})
		.then((response) => {
			// console.log("sms service response: ", response);
			return response.json();
		})
		.then((data) => {
			console.log("sms service results: ", data);
		});
};

module.exports = { sendSMStoMaster };
