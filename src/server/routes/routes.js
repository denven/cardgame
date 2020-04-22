const bcrypt = require('bcrypt');
const helpers = require('../../lib/helpers');

module.exports = function(router, db) {

  router.post('/login', (req, res) => {
    const {username, password} = req.body;
    db.getUserByName(username)
      .then(user => {
        if (bcrypt.compareSync(password, user.password)) {
          req.session.name = user.username;
          if (user.username === 'Chengwen') {
            res.cookie('jwt', user.username).json({username, password});
          } else {
            res
              .cookie('jwt', user.username)
              .redirect(`/room`);
          }
          return;
        } else {
          console.log("Bad username or password, cannot login!", username, password);
          return res.redirect("/");
        }
      })
      .catch(e => res.redirect(`/`));
  });

  router.post('/logout', (req, res) => {
    req.session.name = '';
    res.redirect(`/`);
  });

  // New user signup, insert to database
  router.post('/signup', (req, res) => {

    const newUser = req.body;
    db.getUserByName(newUser.username)
      .then(user => {
        if (!user) {
          newUser.password = bcrypt.hashSync(newUser.password, 12);
          db.addNewUser(newUser)
            .then(user => {
              req.session.name = user.username;
              res
                .cookie('jwt', user.username)
                .redirect(`/room`);
              return;
            })
            .catch(e => res.send(e));
        } else {
          console.log("User already exists, failed to create.");
          res.redirect(`/`);
        }
      })
      .catch(e => res.send(e));
  });

  router.get('/', (req, res) => {
    if (!req.session.name) {
      if (req.query["form"]) {
        res.render(`login`, {"loginType": req.query["form"], "accountName": req.session.name});
      } else {
        res.render(`login`, {"loginType": 'login', "accountName": req.session.name});
      }
    } else {
      res.redirect('/room');
    }
  });

  // Start Game: create a new game
  router.get("/games/new", (req, res) => {
    const username = req.session.name;
    if (!username) {
      return res.redirect('/');
    }
    
    res.render(`newgame`, {"accountName": req.session.name});
  });


  router.get("/login", (req, res) => {
    const username = req.session.name;
    if (!username) {
      res.render(`login`, {"loginType": 'login', "accountName": req.session.name});
    } else {
      res.redirect('/games');
    }
  });

  router.get("/signup", (req, res) => {
    const username = req.session.name;
    if (!username) {
      res.render(`login`, {"loginType": 'signup', "accountName": req.session.name});
    } else {
      res.redirect('/games');
    }
  });
  
  // List waiting games created by others (for me to join)
  router.get("/games", (req, res) => {
    const username = req.session.name;
    if (!username) {
      return res.redirect('/');
    }

    db.getOpenGames(username)
      .then(gameData => {
        let allGames = helpers.formatGameData(gameData);
        let gameTypes = helpers.getAllGamesName(allGames, 'name');
        let gameFileNames = helpers.getAllGamesName(allGames, 'file_name');
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
          playerMin: playerMin
        });
        return;
      })
      .catch(e => res.send(e));
  });

  // List un-finished games current user joined or created
  router.get("/room", (req, res) => {
    const username = req.session.name;
    if (!username) {
      return res.redirect('/');
    }
    
    db.getMyGamesList(username)
      .then(gameData => {
        let allGames = helpers.formatGameData(gameData);
        let gameTypes = helpers.getAllGamesName(allGames, 'name');
        let gameFileNames = helpers.getAllGamesName(allGames, 'file_name');
        res.render(`room`, {"accountName": req.session.name, "gameTypes": gameTypes, "fileNames": gameFileNames, "userGames": allGames});
        return;
      })
      .catch(e => res.send(e));
  });
  
  // Display top players
  router.get("/leaderboard", (req, res) => {
    const username = req.session.name;
    if (!username) {
      return res.redirect('/');
    }
    
    db.getLeaderBoardStat()
      .then(userScores => {
        let gameTypes = helpers.getAllGamesName(userScores, 'game_name');
        res.render(`leaderboard`, {"accountName": req.session.name, "gameTypes": gameTypes, "userScores": userScores});
        return;
      })
      .catch(e => res.send(e));
  });

  // List finished games I have played
  router.get('/archives', (req, res) => {
    const username = req.session.name;
    if (!username) {
      res.redirect('/');
    }
  });

  // To check somebody's playing records
  router.get('/archives/:username', (req, res) => {
    const username = req.session.name;
    if (!username) {
      res.redirect('/');
    } else {
      db.getMyCompletedGames(username)
        .then(allCompletedGames => {
          const newCompletedGames = allCompletedGames.map(game => ({
            ...game,
            completed_at: helpers.formatGameDate(game.completed_at)
          }));
          let gameTypes = helpers.getAllGamesName(newCompletedGames, 'name');
          res.render(`archives`, {"accountName": username, "gameTypes": gameTypes,"completedGames": newCompletedGames});
          return;
        })
        .catch(e => res.send(e));
    }
  });
};

