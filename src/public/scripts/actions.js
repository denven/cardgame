$(() => {
	let accountName = $(".nav-name-tag").text().slice(4, -1);
	console.log("111", accountName.length);
	if (accountName.length == 0) {
		$("#play-game-button").prop("disabled", true);
		$("#play-game-button").addClass("button-disabled");
		$("#new-game-button").removeClass("button-primary");
	} else {
		$("#play-game-button").prop("disabled", false);
		$("#play-game-button").removeClass("button-disabled");
		$("#play-game-button").addClass("button-primary");
	}

	if (accountName === "SuperMe" || accountName === "") {
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
							"130px",
							`Information`,
							`You have already got 10 games not completed in your room, please play some games before creating.`,
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

	// For quick play with username: 'SuperMe'
	$("#quick-join-button").click(() => {
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
					// setTimeout(() => {
					$.ajax({
						type: "PUT",
						url: `/games/${uuid}`,
					})
						.done((data) => {
							window.location.href = `/games/${uuid}`;
						})
						.fail((err) => console.log(err));
					// }, 3000);
				})
				.fail((err) => console.log(err));
		}
	});

	$("#play-game-button").click(() => {
		if (accountName.length > 0) {
			window.location.href = `/games`;
		}
	});
});
