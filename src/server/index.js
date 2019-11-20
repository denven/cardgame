const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 8080;
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const path = require('path');
require('dotenv').config()
const db = require('./db/index');

// TEMPLATING
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// MIDDLEWARE
app.use(cookieSession({
  name: 'session',
  secret: process.env.COOKIE_SECRET
}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')));

// PAGE ROUTES
app.get('/', (req, res) => {
  res.render('index');
});

//TODO do front end validation to ensure user name is 6 characters or less
app.get('/login/:username', (req, res) => {
  req.session.name = req.params.username;
  res
    .cookie('jwt', req.params.username)
    .redirect('/');
});

app.get('/games', (req, res) => {
  res.render('games');
});

app.get('/games/new', (req, res) => {
  res.render('games_new');
});

app.get('/games/:uuid', (req, res) => {
  db.getGameData(req.params.uuid)
    .then(data => {
      if (!data.created_at || data.completed_at || data.deleted_at) {
        return res.redirect('/games');
      }
      // TODO validate user
        // If not started, proceed regardless of user. If started but not a player, redirect to /games

      res.render('game', {
        file_name: data.file_name,
        users: data.users,
        uuid: data.uuid
      });
    });
});

app.post('/games', (req, res) => {
  db.addNewGame(req.body.game_type, req.session.name)
    .then(game => {
      res.json({ uuid: game.uuid });
    });
});

app.put('/games/:uuid', (req, res) => {
  db.getGameData(req.params.uuid)
    .then(game => {
      const withinPlayerMax = game.users.length <= game.player_max;
      const notPlayer = !game.users.find(user => user.username === req.session.name);
      if (!game.started_at && !game.deleted_at && withinPlayerMax && notPlayer) {
        const startGame = (game.users.length + 1) === game.player_max;
        db.addUserToGame(req.params.uuid, game.game_state, req.session.name, startGame)
          .then(game => {
            res.json({ uuid: game.uuid });
          });
      } else {
        res.send('Could not join game'); 
      }
    });
});

// TODO: Delete this route when done
app.get('/users', (req, res) => {
  db.getAllUsers()
    .then(users => {
      res.send(users);
    });
});

// SOCKET LOGIC

// TODO: Authenticate the handshake before allowing a connection
  // We can also validate the game on handshake before making a connection
  // Once we know the connection is validated, then we can trust the handshake data
io.on('connection', (socket) => {
  const uuid = socket.handshake.query.uuid;
  const username = socket.handshake.query.token;

  console.log('a user connected');
  // console.log('handshake query', socket.handshake.query.token);
  
  socket.join(uuid, () => {
    db.getGame(uuid)
      .then(game => {
        io.to(uuid).emit('hydrate-state', {
          gameState: game.game_state
        });
      })
      .catch(err => console.log(err));
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('gsp-move', ({card}) => {
    db.getGame(uuid)
      .then(game => {
        //TODO split up this logic
        const { history, players } = game.game_state;
        if (players[username].cards.includes(card)
          && history[history.length - 1][username] === null) {
          
          const newGameState = {...game.game_state}
          
          newGameState.history[newGameState.history.length - 1][username] = card;
          
          if (!Object.values(newGameState.history[newGameState.history.length - 1]).includes(null)) {
            const playerNames = Object.keys(newGameState.players);
            newGameState.history.push({
              [playerNames[0]]: null,
              [playerNames[1]]: null
            })
          }
          
          let newCards = [...newGameState.players[username].cards].filter(oldCard => oldCard !== card);
          newGameState.players[username].cards = newCards;
          
          db.updateGameState(uuid, newGameState)
            .then(newGame => {
              io.to(uuid).emit('hydrate-state', {
                gameState: newGame.game_state
              });
            });
        } else {
          socket.emit('hydrate-state', {
            gameState: game.game_state
          });
        }
      });
  });
});

// START SERVER
http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});