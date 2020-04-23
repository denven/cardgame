const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,    //my db needs a password
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE
});

const getAllUsers = () => {
  return pool.query(`
    SELECT username FROM users;
  `)
    .then(res => res.rows);
};

// query for user login
const getUserByName = (name) => {
  return pool.query(`
    SELECT username, password
    FROM users
    WHERE username = $1 ;`, [name])
    .then((res) => {
      // console.log("test login in db", res.rows[0]);
      return res.rows[0] || null;
    })
    .catch(err => console.error('query error', err.stack));

};

// query for 'My Games' Page
const getMyGamesList = (name) => {

  return pool.query(`
      select games.id, games.uuid, game_types.name, game_types.file_name, 
        games.created_at, games.started_at, games.game_state 
          FROM games
          JOIN game_types ON games.game_type_id = game_types.id
          JOIN user_games ON games.id = user_games.game_id
          JOIN users ON users.id = user_games.user_id
          WHERE users.username = $1 AND games.completed_at is null AND games.deleted_at is null;
      `, [name])
    .then((res) => {
      return res.rows || null;
    })
    .catch(err => console.error('query error', err.stack));
};


// query for 'Leaderooard' Page
const getLeaderBoardStat = () => {

  return pool.query(`
      select users.username, games.game_type_id, game_types.name as game_name, game_types.file_name, 
            count(users.username) as wins, sum(round(1/winners_num::numeric, 2)) as score 
      from winners 
      join games on game_id = games.id 
      join users on users.id = user_id 
      join game_types on game_types.id = games.game_type_id 
      group by user_id, games.game_type_id, game_types.name, game_types.file_name, users.username 
      order by games.game_type_id, score desc;
      `)
    .then((res) => {
      return res.rows || null;
    })
    .catch(err => console.error('query error', err.stack));
};

// query for 'Join Games' Page:
// 1. game not started   2. game not deleted  3. game is not mine
const getOpenGames = (name) => {

  return pool.query(`
  select user_games.game_id, games.uuid, game_types.name, game_types.file_name, game_types.player_min, games.created_at, games.started_at, users.username, games.game_state 
      from users 
      join user_games on users.id = user_games.user_id 
      join games on games.id = user_games.game_id 
      join game_types on game_types.id = games.game_type_id
      where user_games.game_id in (
        select games.id 
        from games 
        join user_games ON games.id = user_games.game_id 
        join users on users.id = user_games.user_id 
        where users.username <> $1 and games.started_at is null and games.deleted_at is null)
      order by game_types.name desc;
      `, [name])
    .then((res) => {
      return res.rows || null;
    })
    .catch(err => console.error('query error', err.stack));
};


// query for archives: my own games and their results
const getMyCompletedGames = (name) => {

  return pool.query(`
    select mygames.game_id, mygames.name, mygames.type_id, mygames.completed_at, mygames.players, array_agg(users.username) as winners
    from (
          select user_games.game_id, game_types.id as type_id, game_types.name, games.completed_at, array_agg(users.username) as players
          from users 
          join user_games on users.id = user_games.user_id 
          join games on games.id = user_games.game_id 
          join game_types on game_types.id = games.game_type_id
            where user_games.game_id in (
            select games.id 
            from games 
            join user_games ON games.id = user_games.game_id 
            join users on users.id = user_games.user_id join winners on games.id = winners.game_id
            where users.username= $1 and games.completed_at is not null)
          group by user_games.game_id, game_types.id, game_types.name, games.completed_at order by completed_at desc
        ) 
    as mygames join winners on mygames.game_id = winners.game_id 
    join users on users.id = winners.user_id 
    group by mygames.game_id,  mygames.type_id, mygames.name, mygames.completed_at, mygames.players 
    order by mygames.type_id, completed_at desc;
    `, [name])
    .then((res) => {
      return res.rows || null;
    })
    .catch(err => console.error('query error', err.stack));
};


// insert a row into users table when a new user sign up
const addNewUser = (user) => {

  return pool.query(`
    INSERT INTO users(username, password) 
    VALUES($1, $2) RETURNING *
    `, [user.username, user.password])
    .then((res) => res.rows[0] || null)
    .catch(err => console.error('query error', err.stack));

};

// games user has joined or created
const getUserGames = (user) => {
  return pool.query(`
    SELECT game_type, creator_id
    FROM games
    JOIN user_games
    JOIN users ON users.id = games.user_id
    WHERE users.name = user.username
    VALUES($1, $2) RETURNING *
    `, [user.username, user.password])
    .then((res) => res.rows[0] || null)
    .catch(err => console.error('query error', err.stack));
};
  
const getGame = gameUuid => {
  return pool.query(`
    SELECT id, uuid, game_type_id, creator_id, created_at, started_at, completed_at, deleted_at, game_state
      FROM games
      WHERE uuid = $1
  `, [gameUuid])
    .then(game => game.rows[0]);
};

const getGameAndGameType = gameUuid => {
  return pool.query(`
    SELECT games.id, uuid, game_type_id, creator_id, created_at, started_at, 
          completed_at, deleted_at, game_state, game_types.name as game_name, 
          game_types.file_name, game_types.player_min, game_types.player_max
      FROM games
      JOIN game_types ON games.game_type_id = game_types.id
      WHERE uuid = $1
  `, [gameUuid])
    .then(games => games.rows[0]);
};

const getGameUsers = gameUuid => {
  return pool.query(`
    SELECT users.id, username
      FROM users
      JOIN user_games ON users.id = user_games.user_id
      JOIN games ON games.id = user_games.game_id
      WHERE games.uuid = $1
  `, [gameUuid])
    .then(users => users.rows);
};

const getGameData = gameUuid => {
  return Promise.all([getGameAndGameType(gameUuid), getGameUsers(gameUuid)])
    .then(([gameAndType, users]) => ({
      ...gameAndType,
      users
    }));
};

const updateGameState = (gameUuid, game_state) => {
  return pool.query(`
    UPDATE games
      SET game_state = $1
      WHERE games.uuid = $2
      RETURNING id, uuid, game_type_id, creator_id, created_at, started_at, completed_at, deleted_at, game_state
  `, [game_state, gameUuid])
    .then(game => game.rows[0]);
};

const updateGameAndCreateWinner = (gameUuid, game_state, winnerUsernamesArray) => {
  const winnersLength = winnerUsernamesArray.length;
  const psqlVarsStart = 3;
  
  const winnersInsertValues = winnerUsernamesArray.map((winner, index) => {
    return `((SELECT id FROM users WHERE username = $${psqlVarsStart + index}), (SELECT id FROM updated_game), ${winnersLength})`;
  }).join(', ');
  
  return pool.query(`
    WITH updated_game AS (  
      UPDATE games
        SET game_state = $1, completed_at = NOW()
        WHERE games.uuid = $2
        RETURNING id, uuid, game_type_id, creator_id, created_at, started_at, completed_at, deleted_at, game_state
    ) INSERT INTO winners (user_id, game_id, winners_num)
      VALUES ${winnersInsertValues}
        RETURNING (SELECT game_state FROM updated_game)
  `, [game_state, gameUuid, ...winnerUsernamesArray])
    .then(game => game.rows[0]);
};

// Shuffle the common pile on table
const shuffle = array => {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const suit = [1,2,3,4,5,6,7,8,9,10,11,12,13];

const createGameState = playerOneUsername => {
  return {
    cards: shuffle([...suit]),
    history: [{
      [playerOneUsername]: null
    }],
    players: {
      [playerOneUsername]: {
        cards: [...suit],
        order: 1
      }
    }
  };
};

const addPlayerToGameState = (currentGameState, username) => {
  const newGameState = {...currentGameState};
  newGameState.history[0][username] = null;
  newGameState.players[username] = {
    cards: [...suit],
    order: Object.keys(currentGameState.players).length + 1
  };
  return newGameState;
};

const addNewGame = (game_file_name, username) => {
  return pool.query(`
    WITH new_game AS (
      INSERT INTO games (game_type_id, creator_id, game_state)
        VALUES ((SELECT id FROM game_types WHERE file_name = $1),
          (SELECT id FROM users WHERE username = $2), $3)
          RETURNING games.id, games.uuid
    ) INSERT INTO user_games (user_id, game_id)
      VALUES ((SELECT id FROM users WHERE username = $2), (SELECT id FROM new_game))
        RETURNING (SELECT uuid FROM new_game)
  `, [game_file_name, username, createGameState(username)])
    .then(res => res.rows[0]);
};

const addUserToGame = (gameUuid, game_state, username, gameStartBool) => {
  return pool.query(`
    WITH updated_game AS (
      UPDATE games
        SET game_state = $1${gameStartBool ? ', started_at = NOW()' : ''}
        WHERE games.uuid = $2
        RETURNING id, uuid
    ) INSERT INTO user_games (user_id, game_id)
      VALUES ((SELECT id FROM users WHERE username = $3), (SELECT id FROM updated_game))
        RETURNING (SELECT uuid FROM updated_game)
  `, [addPlayerToGameState(game_state, username), gameUuid, username])
    .then(game => game.rows[0]);
};

const getGameCreator = (uuid) => {
  return pool.query(`
    SELECT username FROM users JOIN games ON users.id = games.creator_id 
    WHERE uuid = $1
  `, [uuid])
    .then(data => data.rows[0]);
};

module.exports = {
  getAllUsers,
  getGameData,
  getUserByName,
  getGameCreator,
  getUserGames,
  getMyGamesList,
  getOpenGames,
  getLeaderBoardStat,
  getMyCompletedGames,
  getGame,
  addNewUser,
  addNewGame,
  addUserToGame,
  updateGameState,
  updateGameAndCreateWinner
};
