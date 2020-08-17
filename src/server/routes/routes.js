const bcrypt = require("bcrypt");
const helpers = require("../../lib/helpers");
const MAX_GAMES_NUM = 10;

module.exports = function (router, db) {
	// TODO Delete
	// New game create and join test page
	router.get("/test", (req, res) => {
		res.render("games_test");
	});

	// TODO: Delete this route when done
	router.get("/users", (req, res) => {
		db.getAllUsers().then((users) => {
			res.send(users);
		});
	});

	//TODO do front end validation to ensure user name is 6 characters or less
	router.get("/login/:username", (req, res) => {
		req.session.name = req.params.username;
		res.cookie("jwt", req.params.username).redirect("/");
	});

	// User Login with credential
	router.post("/login", (req, res) => {
		const { username, password } = req.body;
		console.log("user login:", username, password);

		db.getUserByName(username)
			.then((user) => {
				if (bcrypt.compareSync(password, user.password)) {
					req.session.name = user.username;
					if (user.username === "SuperMe") {
						res.cookie("jwt", user.username).json({ username, password });
					} else {
						res.cookie("jwt", user.username).redirect(`/room`);
					}
					console.log("success");
					return;
				} else {
					console.log("Bad username or password, cannot login!", username, password);
					return res.redirect("/");
				}
			})
			.catch((e) => res.redirect(`/`));
	});

	// User Exit
	router.post("/logout", (req, res) => {
		req.session.name = "";
		res.redirect(`/`);
	});

	// New user signup, insert to database
	router.post("/signup", (req, res) => {
		const newUser = req.body;
		db.getUserByName(newUser.username)
			.then((user) => {
				if (!user) {
					newUser.password = bcrypt.hashSync(newUser.password, 12);
					db.addNewUser(newUser)
						.then((user) => {
							req.session.name = user.username;
							res.cookie("jwt", user.username).redirect(`/new`);
							return;
						})
						.catch((e) => res.send(e));
				} else {
					console.log("User already exists, failed to create.");
					res.redirect(`/`);
				}
			})
			.catch((e) => res.send(e));
	});

	// login page
	router.get("/login", (req, res) => {
		const username = req.session.name;
		if (!username) {
			res.render(`login`, { loginType: "login", accountName: req.session.name });
		} else {
			res.redirect("/games");
		}
	});

	// Sign up page
	router.get("/signup", (req, res) => {
		const username = req.session.name;
		if (!username) {
			res.render(`login`, { loginType: "signup", accountName: req.session.name });
		} else {
			res.redirect("/games");
		}
	});

	// Home page
	router.get("/", (req, res) => {
		if (!req.session.name) {
			if (req.query["form"]) {
				res.render(`login`, { loginType: req.query["form"], accountName: req.session.name });
			} else {
				res.render(`login`, { loginType: "login", accountName: req.session.name });
			}
		} else {
			res.redirect("/room");
		}
	});

	// Start Game: create a new game
	router.get("/new", (req, res) => {
		const username = req.session.name;
		if (!username) {
			return res.redirect("/");
		}

		res.render(`newgame`, { accountName: req.session.name });
	});

	// Quick Join with fixed credential
	router.get("/join/:uuid", (req, res) => {
		db.getGameCreator(req.params.uuid).then(({ username }) => {
			res.render("quickjoin", { loginType: "join", accountName: "", Inviter: username });
		});
	});

	// Go to game by uuid
	router.get("/games/:uuid", (req, res) => {
		db.getGameData(req.params.uuid).then((data) => {
			if (!data.created_at || data.completed_at || data.deleted_at) {
				return res.redirect("/games");
			}
			// TODO validate user
			// If not started, proceed regardless of user. If started but not a player, redirect to /games
			// console.log(req.params.uuid, req.session.name);
			res.render("game", {
				accountName: req.session.name,
				file_name: data.file_name,
				users: data.users,
				uuid: data.uuid,
				gameName: data.game_name,
			});
		});
	});

	// Create a new game by type
	router.post("/games", (req, res) => {
		db.getMyGamesList(req.session.name).then((myGames) => {
			if (req.session.name !== "SuperMe" && myGames.length < MAX_GAMES_NUM) {
				db.addNewGame(req.body.game_type, req.session.name).then((game) => {
					res.json({ status: 0, uuid: game.uuid });
				});
			} else {
				res.json({ status: "NOT_ALLOWED", uuid: "" });
			}
		});
	});

	// Join a game by username
	router.put("/games/:uuid", (req, res) => {
		db.getGameData(req.params.uuid).then((game) => {
			const withinPlayerMax = game.users.length <= game.player_max;
			const notPlayer = !game.users.find((user) => user.username === req.session.name);

			// console.log(req.params.uuid, game);

			console.log(!game.started_at && !game.deleted_at && withinPlayerMax && notPlayer);
			console.log(game.started_at, game.deleted_at, withinPlayerMax, notPlayer);

			if (!game.started_at && !game.deleted_at && withinPlayerMax && notPlayer) {
				const startGame = game.users.length + 1 === game.player_max;
				db.addUserToGame(req.params.uuid, game.game_state, req.session.name, startGame).then((game) => {
					res.json({ uuid: game.uuid });
				});
			} else {
				res.send("Could not join game");
			}
		});
	});

	// List un-started games created by others (for me to join)
	router.get("/games", (req, res) => {
		const username = req.session.name;
		if (!username) {
			return res.redirect("/");
		}

		db.getOpenGames(username)
			.then((gameData) => {
				let allGames = helpers.formatGameData(gameData);
				let gameTypes = helpers.getAllGamesName(allGames, "name");
				let gameFileNames = helpers.getAllGamesName(allGames, "file_name");
				const playerMin = gameData.reduce((acc, game) => {
					if (!Number.isInteger(acc[game.file_name])) {
						acc[game.file_name] = game.player_min;
					}
					return acc;
				}, {});
				res.render(`games`, {
					accountName: req.session.name,
					gameTypes: gameTypes,
					fileNames: gameFileNames,
					userGames: allGames,
					playerMin: playerMin,
				});
				return;
			})
			.catch((e) => res.send(e));
	});

	// List un-finished games current user joined or created
	router.get("/room", (req, res) => {
		const username = req.session.name;
		if (!username) {
			return res.redirect("/");
		}

		db.getMyGamesList(username)
			.then((gameData) => {
				let allGames = helpers.formatGameData(gameData);
				let gameTypes = helpers.getAllGamesName(allGames, "name");
				let gameFileNames = helpers.getAllGamesName(allGames, "file_name");
				res.render(`room`, {
					accountName: req.session.name,
					gameTypes: gameTypes,
					fileNames: gameFileNames,
					userGames: allGames,
				});
				return;
			})
			.catch((e) => res.send(e));
	});

	// Display top players
	router.get("/leaderboard", (req, res) => {
		const username = req.session.name;
		if (!username) {
			return res.redirect("/");
		}

		db.getLeaderBoardStat()
			.then((userScores) => {
				let gameTypes = helpers.getAllGamesName(userScores, "game_name");
				res.render(`leaderboard`, { accountName: req.session.name, gameTypes: gameTypes, userScores: userScores });
				return;
			})
			.catch((e) => res.send(e));
	});

	// List finished games I have played
	router.get("/archives", (req, res) => {
		const username = req.session.name;
		if (!username) {
			res.redirect("/");
		}
	});

	// To check somebody's playing records
	router.get("/archives/:username", (req, res) => {
		const username = req.session.name;
		if (!username) {
			res.redirect("/");
		} else {
			db.getMyCompletedGames(username)
				.then((allCompletedGames) => {
					const newCompletedGames = allCompletedGames.map((game) => ({
						...game,
						completed_at: helpers.formatGameDate(game.completed_at),
					}));
					let gameTypes = helpers.getAllGamesName(newCompletedGames, "name");
					res.render(`archives`, { accountName: username, gameTypes: gameTypes, completedGames: newCompletedGames });
					return;
				})
				.catch((e) => res.send(e));
		}
	});
};
