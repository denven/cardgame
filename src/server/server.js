const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const PORT = process.env.PORT || 8888;
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const favicon = require("serve-favicon");

const path = require("path");
require("dotenv").config();
const db = require("./db/index");
const goofspiel = require("../games/goofspiel");

///////////////////////////////////////////////////////////////////////
// data for temporary player/visitor: SuperMe
// data will not write into database, thus, once fresh the browser,
// the sesstion game data will not persist
let vGameState = {
	cards: [], //shuffled cards for each game
	history: [],
	players: [], // SuperMe and X-Warrior
};
//////////////////////////////////////////////////////////////////////

// TEMPLATING
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

// MIDDLEWARE
app.use(
	cookieSession({
		name: "session",
		secret: process.env.COOKIE_SECRET,
	})
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "../public")));
app.use(favicon(path.join(__dirname, "../public/images", "favicon.ico")));

// APP ROUTES
const appRoutes = require("./routes/routes");
const expRoutes = express.Router();
const database = require("./db/index");
appRoutes(expRoutes, database);
app.use("/", expRoutes);

// SOCKET LOGIC

// TODO: Authenticate the handshake before allowing a connection
// We can also validate the game on handshake before making a connection
// Once we know the connection is validated, then we can trust the handshake data
io.on("connection", (socket) => {
	const uuid = socket.handshake.query.uuid;
	const username = socket.handshake.query.token;

	console.log("a user connected");
	// console.log('handshake query', socket.handshake.query.token);

	// a uuid is the game identifier, also symblizes a game's context room
	// tsend game state to client once the user connects to socket
	socket.join(uuid, () => {
		db.getGame(uuid)
			.then((game) => {
				io.to(uuid).emit("hydrate-state", {
					gameState: game.game_state,
				});
			})
			.catch((err) => console.log(err));
	});

	socket.on("disconnect", () => {
		console.log("user disconnected");
	});

	// card is sent from client, it's the one player shows in current move/round
	socket.on("gsp-move", ({ card }) => {
		db.getGame(uuid).then((game) => {
			//TODO split up this logic
			const { history, players } = game.game_state;

			// When one of the players is SuperMe, do not write data to database
			if (Object.keys(players).includes("SuperMe") && Object.keys(players).length == 2) {
				if (history.length == 1 && vGameState.history.length == 0) {
					vGameState = { ...game.game_state };
				}

				if (players[username].cards.includes(card) && history[history.length - 1][username] === null) {
					const newGameState = { ...vGameState }; // get history game data

					newGameState.history[newGameState.history.length - 1][username] = card; // record current move

					// Add new space for recording next round card in history array
					if (!Object.values(newGameState.history[newGameState.history.length - 1]).includes(null)) {
						const playerNames = Object.keys(newGameState.players);
						newGameState.history.push({
							[playerNames[0]]: null,
							[playerNames[1]]: null,
						});
					}

					// remove the shown card from player's own deck array
					let newCards = [...newGameState.players[username].cards].filter((oldCard) => oldCard !== card);
					newGameState.players[username].cards = newCards;
					const winners = goofspiel.getWinners(newGameState);

					if (winners.length > 0) {
						io.to(uuid).emit("hydrate-state", {
							gameState: newGameState,
						});

						vGameState = { ...game.game_state };
						// restart the game in 5 seconds
						setTimeout(() => {
							io.to(uuid).emit("hydrate-state", {
								gameState: vGameState,
							});
						}, 5000);
					} else {
						io.to(uuid).emit("hydrate-state", {
							gameState: newGameState,
						});
					}
				} else {
					socket.emit("hydrate-state", {
						gameState: game.game_state,
					});
				}
			}

			// formal online play, game data will be written into database
			if (!Object.keys(players).includes("SuperMe")) {
				if (players[username].cards.includes(card) && history[history.length - 1][username] === null) {
					const newGameState = { ...game.game_state };

					newGameState.history[newGameState.history.length - 1][username] = card;

					if (!Object.values(newGameState.history[newGameState.history.length - 1]).includes(null)) {
						const playerNames = Object.keys(newGameState.players);
						newGameState.history.push({
							[playerNames[0]]: null,
							[playerNames[1]]: null,
						});
					}

					let newCards = [...newGameState.players[username].cards].filter((oldCard) => oldCard !== card);
					newGameState.players[username].cards = newCards;

					const winners = goofspiel.getWinners(newGameState);

					if (winners.length > 0) {
						db.updateGameAndCreateWinner(uuid, newGameState, winners).then((newGame) => {
							io.to(uuid).emit("hydrate-state", {
								gameState: newGame.game_state,
							});
						});
					} else {
						db.updateGameState(uuid, newGameState).then((newGame) => {
							io.to(uuid).emit("hydrate-state", {
								gameState: newGame.game_state,
							});
						});
					}
				} else {
					socket.emit("hydrate-state", {
						gameState: game.game_state,
					});
				}
			}
		});
	});
});

// START SERVER\
// http.listen(PORT, () => {
// 	console.log(`Server listening on port ${PORT}...`);
// });

// for local LAN testing
http.listen(PORT, "192.168.1.87", () => {
	console.log(`Server listening on port ${PORT}...`);
});
