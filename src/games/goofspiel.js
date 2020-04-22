const WIN_SCORE = 45;

const orderPlayers = players => Object.keys(players).sort((a, b) => {
  return players[a].order - players[b].order;
});

const roundWinner = (round, playerPair) => {
  if (round[playerPair[0]] === null || round[playerPair[1]] === null) return false;

  if (round[playerPair[0]] === round[playerPair[1]]) return null;
  
  return round[playerPair[0]] > round[playerPair[1]] ? playerPair[0] : playerPair[1];
};

const calcScore = gameState => {
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

const getWinners = gameState => {
  const score = calcScore(gameState);
  return Object.entries(score).reduce((acc, [player, score]) => {
    return score >= WIN_SCORE ? [...acc, player] : acc;
  }, []);
};

module.exports = {
  WIN_SCORE,
  calcScore,
  getWinners
};