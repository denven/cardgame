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

// TEMPLATING
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// MIDDLEWARE
app.use(cookieSession({
  name: 'session',
  secret: process.env.COOKIE_SECRET
}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, '../public')));

// APP ROUTES
const appRoutes = require('./routes/routes');
const expRoutes = express.Router();
const database = require('./db/index');
appRoutes(expRoutes, database);
app.use('/', expRoutes);

app.get('/login/:username', (req, res) => {
  req.session.user_id = req.params.id;
  res
    .cookie('jwt', req.params.username)
    .redirect('/');
});

app.get('/games', (req, res) => {
  res.render('games');
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
        game_state: data.game_state,
        users: data.users,
        uuid: data.uuid
      });
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
  console.log('a user connected');
  console.log('handshake query', socket.handshake.query.token);
  
  socket.join(socket.handshake.query.uuid, () => {
    console.log('joined' + socket.handshake.query.uuid);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('gsp-button', () => {
    console.log('received message from', socket.handshake.query.uuid);
    io.to(socket.handshake.query.uuid).emit('gsp-button', 'we heard the click');
  });
});

// START SERVER
http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});