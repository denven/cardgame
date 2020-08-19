// client socket, player operations on browser
// game logic is implemented here,
// send players move to backend and write data to database for persisance
$(() => {
	let localGameState = null;
	const WIN_SCORE = 45;
	const cardText = {
		"1": "A",
		"11": "J",
		"12": "Q",
		"13": "K",
	};

	let lastSeenRound = null;

	// TODO: with real JWT, we need to decode the base64 to actually get the username
	const username = document.cookie.replace(/(?:(?:^|.*;\s*)jwt\s*\=\s*([^;]*).*$)|^.*$/, "$1");

	const roundWinner = (round, playerPair) => {
		if (round[playerPair[0]] === null || round[playerPair[1]] === null) return false;

		if (round[playerPair[0]] === round[playerPair[1]]) return null;

		return round[playerPair[0]] > round[playerPair[1]] ? playerPair[0] : playerPair[1];
	};

	const convertCardNumToText = (cardValue) => {
		return cardText[String(cardValue)] || cardValue;
	};

	const calcScore = (cards, history, playerPair) => {
		const score = {
			[playerPair[0]]: 0,
			[playerPair[1]]: 0,
		};

		history.forEach((round, index) => {
			const winner = roundWinner(round, playerPair);
			if (winner === null) {
				const halfScore = cards[index] / 2;
				score[playerPair[0]] += halfScore;
				score[playerPair[1]] += halfScore;
			} else if (winner !== false) {
				score[winner] += cards[index];
			}
		});

		return score;
	};

	const renderPlayedCards = (playerOrder, playerCard) => {
		if (playerCard) {
			$(`#gsp-played-card-${playerOrder}`).text(convertCardNumToText(playerCard));

			if (playerCard !== "?") {
				$(`#gsp-played-card-${playerOrder}`).removeClass("gsp-card__flipped").removeClass("gsp-card__unrevealed");
			} else {
				$(`#gsp-played-card-${playerOrder}`).addClass("gsp-card__unrevealed");
			}
		}
	};

	const renderAllPlayedCards = (orderedPlayersPair, history) => {
		orderedPlayersPair.forEach((player, index) => {
			const playerCard = history[history.length - 1][player];
			renderPlayedCards(index + 1, playerCard);
		});
	};

	const renderPlayerCards = (userCards) => {
		$(".gsp-player-card").each(function () {
			if (userCards.includes($(this).data("cardValue"))) {
				$(this).removeClass("hidden");
			} else {
				$(this).addClass("hidden");
			}
		});
	};

	const renderScore = (orderedPlayersPair, cards, history) => {
		const score = calcScore(cards, history, orderedPlayersPair);
		const percentWidthToReachEnd = 90;

		orderedPlayersPair.forEach((player, index) => {
			$(`#gsp-score-${index + 1}`).text(WIN_SCORE - score[player]);
			$(`#gsp-sprite-player-${index + 1}`).css(
				"left",
				`${Math.min((score[player] / WIN_SCORE) * percentWidthToReachEnd, percentWidthToReachEnd)}%`
			);
		});
	};

	const renderWinner = (orderedPlayersPair, cards, history) => {
		const score = calcScore(cards, history, orderedPlayersPair);

		if (score[orderedPlayersPair[0]] >= WIN_SCORE && score[orderedPlayersPair[1]] >= WIN_SCORE) {
			$("#gsp-winner-banner").text("You Tie!");
		} else if (score[orderedPlayersPair[0]] >= WIN_SCORE) {
			$("#gsp-winner-banner").text(orderedPlayersPair[0] === username ? "You Win!" : "You Lose!");
		} else if (score[orderedPlayersPair[1]] >= WIN_SCORE) {
			$("#gsp-winner-banner").text(orderedPlayersPair[1] === username ? "You Win!" : "You Lose!");
		} else {
			return;
		}

		const color = orderedPlayersPair[0] === username ? "blue" : "red";
		$("#gsp-winner-banner").addClass(`gsp-text-box__${color}`);

		$("#gsp-winner-banner-modal").removeClass("hidden");
	};

	const renderPlayerNames = (orderedPlayersPair) => {
		orderedPlayersPair.forEach((player, index) => {
			$(`#gsp-player-name-${index + 1}`).text(player);
		});
	};

	const orderPlayers = (players) =>
		Object.keys(players).sort((a, b) => {
			return players[a].order - players[b].order;
		});

	// Render by gameState when all players have shown the card each round
	const render = (gameState) => {
		const { cards, players, history } = gameState;
		const centerCard = cards[history.length - 1];
		const orderedPlayersPair = orderPlayers(players);
		const userCards = players[username].cards;
		const lastRound = history[history.length - 1];

		$("#gsp-center-card").text(convertCardNumToText(centerCard));
		$(".gsp-card__played").addClass("gsp-card__flipped");
		renderPlayerNames(orderedPlayersPair);

		if (lastRound && !Object.values(lastRound).includes(null)) {
			renderAllPlayedCards(orderedPlayersPair, history); // all players have shown cards
		} else if (lastRound && lastRound[username] !== null) {
			renderPlayedCards(players[username].order, lastRound[username]); // I've shown the card
		} else if (lastRound && lastRound[username] === null) {
			let opponent = Object.keys(lastRound).find((key) => key !== username);
			if (lastRound[opponent] !== null) {
				renderPlayedCards(players[opponent].order, "?"); // opponent card has shown but hidden
			}
		}

		renderScore(orderedPlayersPair, cards, history);
		renderWinner(orderedPlayersPair, cards, history);
		renderPlayerCards(userCards);
	};

	const renderDefault = (gameState) => {
		$(".gsp-player-card").removeClass("hidden");
		$("#gsp-gameboard").addClass("gsp-not-started");
		$("#gsp-player-name-1").text(Object.keys(gameState.players)[0]);
		$("#gsp-player-name-2").text("Waiting");
		$(".gsp-player-score").text(45);
	};

	// Click space area to toogle visibility of navigation bar
	$(document).click((e) => {
		if (!e.target.id) {
			if ($("#top-nav-bar").hasClass("hidden")) {
				$("#top-nav-bar").removeClass("hidden");
			} else {
				$("#top-nav-bar").addClass("hidden");
			}
		}
	});

	// Click to show one card each round: put one card on table from pile in hand
	$(".gsp-player-card").each(function () {
		$(this).click(() => {
			const history = localGameState.history;

			if (Object.keys(localGameState.players).length < 2) {
				return;
			}

			if (
				history[history.length - 1][username] === null &&
				(lastSeenRound === history.length - 1 || history.length === 1)
			) {
				// if (history[history.length - 1][username] === null || history.length === 1) {
				const cardValue = $(this).data("cardValue");

				history[history.length - 1][username] = cardValue; // record what I put
				renderPlayedCards(localGameState.players[username].order, cardValue); // flip my shown card to myself

				const newCards = [...localGameState.players[username].cards].filter((card) => card !== cardValue);
				localGameState.players[username].cards = newCards;
				renderPlayerCards(newCards); // update the pile in my hand by removing my shown card

				const orderedPlayersPair = orderPlayers(localGameState.players);
				renderScore(orderedPlayersPair, localGameState.cards, localGameState.history);
				renderWinner(orderedPlayersPair, localGameState.cards, localGameState.history);

				socket.emit("gsp-move", { card: cardValue });
			}
		});
	});

	// Click to begin a new round
	$("#gsp-next-round").click(() => {
		$("#gsp-next-round").addClass("hidden");
		render(localGameState);
		lastSeenRound = localGameState.history.length - 1;
	});

	// Listen to gamestate updating from the server all the time
	socket.on("hydrate-state", (data) => {
		console.log("game state updated:", data);
		localGameState = data.gameState;

		if (Object.keys(data.gameState.players).length < 2) {
			renderDefault(data.gameState);
		} else {
			$("#gsp-gameboard").removeClass("gsp-not-started");

			const history = data.gameState.history;
			const historyLength = history.length;

			if (lastSeenRound === historyLength - 1 || historyLength === 1 || history[historyLength - 1][username] !== null) {
				// if (Object.values(history[historyLength - 1]).includes(null)) {
				render(data.gameState);

				if (historyLength === 1) {
					$("#gsp-winner-banner-modal").addClass("hidden");
					$("#gsp-next-round").addClass("hidden");
				}
			} else {
				$("#gsp-next-round").removeClass("hidden"); // show 'NEXT' button
				const lastRoundState = {
					...data.gameState,
					history: data.gameState.history.slice(0, historyLength - 1),
				};

				render(lastRoundState);
			}
		}
	});
});
