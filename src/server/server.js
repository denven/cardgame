const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 8080;
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const path = require('path');
require('dotenv').config();
const db = require('./db/index');
const goofspiel = require('../games/goofspiel');

// TEMPLATING
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// MIDDLEWARE
app.use(cookieSession({
  name: 'session',
  secret: process.env.COOKIE_SECRET
}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// APP ROUTES
const appRoutes = require('./routes/routes');
const expRoutes = express.Router();
const database = require('./db/index');
appRoutes(expRoutes, database);
app.use('/', expRoutes);

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
          
          const newGameState = {...game.game_state};
          
          newGameState.history[newGameState.history.length - 1][username] = card;
          
          if (!Object.values(newGameState.history[newGameState.history.length - 1]).includes(null)) {
            const playerNames = Object.keys(newGameState.players);
            newGameState.history.push({
              [playerNames[0]]: null,
              [playerNames[1]]: null
            });
          }
          
          let newCards = [...newGameState.players[username].cards].filter(oldCard => oldCard !== card);
          newGameState.players[username].cards = newCards;
          
          const winners = goofspiel.getWinners(newGameState);
          
          if (winners.length > 0) {
            db.updateGameAndCreateWinner(uuid, newGameState, winners)
              .then(newGame => {
                io.to(uuid).emit('hydrate-state', {
                  gameState: newGame.game_state
                });
              });
          } else {
            db.updateGameState(uuid, newGameState)
              .then(newGame => {
                io.to(uuid).emit('hydrate-state', {
                  gameState: newGame.game_state
                });
              });
          }
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