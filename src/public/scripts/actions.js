$(() => {
	let accountName = $(".nav-name-tag").text().slice(4, -1);
	if (accountName === "SuperMe") {
		$("#new-game-button").prop("disabled", true);
		$("#new-game-button").addClass("button-disabled");
		$("#new-game-button").removeClass("button-primary");
	} else {
		$("#new-game-button").prop("disabled", false);
		$("#new-game-button").removeClass("button-disabled");
		$("#new-game-button").addClass("button-primary");

		$("#new-game-button").click(() => {
			$.ajax({
				type: "POST",
				url: "/games",
				contentType: "application/json; charset=utf-8",
				dataType: "json",
				data: JSON.stringify({
					game_type: $(".new-game-button").data("game"),
				}),
			})
				.done((data) => {
					if (data.status === "NOT_ALLOWED") {
						openModal(
							"380px",
							"120px",
							`Information`,
							`You have already got 10 games not played in your room, please complete some games before creating more.`,
							false
						); //
						return;
					}
					if (data.uuid) window.location.href = `/games/${data.uuid}`;
				})
				.fail((err) => console.log(err));
		});
	}

	// we have multiple Join buttons
	$(".join-game-button").each(function () {
		$(this).click(() => {
			$.ajax({
				type: "PUT",
				url: `/games/${$(this).data("uuid")}`,
			})
				.done((data) => {
					window.location.href = `/games/${data.uuid}`;
				})
				.fail((err) => console.log(err));
		});
	});

	const sendSMStoPlayer = () => {
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
				return response.json();
			})
			.then((data) => {
				console.log(data);
				openModal(
					"380px",
					"120px",
					`Information`,
					`Please wait for a moment, Chengwen is on his way to play this game with you...`,
					false
				); //
			});
	};

	// For quick play with username: 'SuperMe'
	$("#quck-join-button").click(() => {
		let uuid = window.location.pathname.split("/")[2];

		if (uuid) {
			$.ajax({
				type: "POST",
				url: "/login",
				contentType: "application/json; charset=utf-8",
				dataType: "json",
				data: JSON.stringify({ username: "SuperMe", password: "123" }),
			})
				.done((data) => {
					console.log("login sucessfully");
					setTimeout(() => {
						$.ajax({
							type: "PUT",
							url: `/games/${uuid}`,
						})
							.done((data) => {
								window.location.href = `/games/${uuid}`;
								sendSMStoPlayer(); // send sms to my cellphone
							})
							.fail((err) => console.log(err));
					}, 3000);
				})
				.fail((err) => console.log(err));
		}
	});
});
