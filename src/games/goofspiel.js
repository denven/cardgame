const WIN_SCORE = 45;

const orderPlayers = (players) =>
	Object.keys(players).sort((a, b) => {
		return players[a].order - players[b].order;
	});

const roundWinner = (round, playerPair) => {
	if (round[playerPair[0]] === null || round[playerPair[1]] === null) {
		return false; // no body shows a card in current round
	}

	if (round[playerPair[0]] === round[playerPair[1]]) {
		return null; // a tie
	}

	return round[playerPair[0]] > round[playerPair[1]] ? playerPair[0] : playerPair[1];
};

// current score(for both players), calculated by shown cards recored in history array.
const calcScore = (gameState) => {
	const { cards, history, players } = gameState;
	const playerPair = orderPlayers(players);

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

// return an array, it may be a tie which contains two winners.
const getWinners = (gameState) => {
	const score = calcScore(gameState);
	return Object.entries(score).reduce((acc, [player, score]) => {
		return score >= WIN_SCORE ? [...acc, player] : acc;
	}, []);
};

module.exports = {
	WIN_SCORE,
	calcScore,
	getWinners,
};
