import express from "express";
import http from "http";
import socketio from "socket.io";
import Redis from "ioredis";
import uuid from "uuid/v1";

let app = express();
let server = http.Server(app);
let io = socketio(server);

let redis = new Redis({ host: '192.168.99.100', password: "passwort" });
let sub = new Redis({ host: '192.168.99.100', password: "passwort" });

const DELIMITER = ':'
const MIN_PLAYERCOUNT = 4
const STATE_PRE_GAME = 'PRE_GAME'
const STATE_RUNNING = 'RUNNING'
const STATE_FINISHED = 'FINISHED'

// Use the given port:
let port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("<h1>I'm working.</h1>");
});

// Subscribe to the messaging system
sub.subscribe('messages', (err, count) => {
    console.log(`Subscribed to ${count} channels.`);
})

// Receive messages
sub.on('message', (channel, message) => {
    console.log(`Received message "${message}" from channel "${channel}".`);
    // Implement actions
})

io.on("connection", socket => {
  console.log("A user connected.");

  emitAllGames()

  socket.on("create game", async name => {
    console.log("create game: "+name)
    // Check if a game with this name exists
    let result = await redis.exists(`game:${name}`)
    if (result === 0) {
        redis.hmset(`game${DELIMITER}${name}`, "name", name, "playercount", 0, "state", STATE_PRE_GAME);
        redis.sadd(`games`, name);
        io.emit("created", name);
        emitAllGames()
        redis.publish('messages', 'New game created');
    } else {
        io.emit("errorMsg", "A game with that name already exists.");
    }
  });

  socket.on("join game", async params => {
    console.log(`join game ${params.game} as ${params.player}`)
      let result = await redis.hgetall(`game${DELIMITER}${params.game}`)
      if (result && result.state) {
        redis.sadd(`playerlist${DELIMITER}${params.game}`, `${params.player}`)
        let count = await redis.hincrby(`game${DELIMITER}${params.game}`, "playercount", 1)
        if(count == MIN_PLAYERCOUNT) await startGame(params.game)
        emitPlayerslist(params.game)
        emitAllGames()
        io.emit("joined", params.game);
      } else {
        io.emit("errorMsg", `There is no game with the name "${name}"`);
      }
  });

  socket.on("leave game", async params => {
    console.log(`leave game ${params.game} as ${params.player}`)
    redis.srem(`playerlist${DELIMITER}${params.game}`, `${params.player}`)
    let count = await redis.hincrby(`game${DELIMITER}${params.game}`, "playercount", -1)
    emitPlayerslist(params.game)
    emitAllGames()
    io.emit("left", params.game);
  });

  socket.on("delete game", async name => {
    console.log("delete game: "+name)
    await redis.srem('games',name)
    await redis.del(`playerlist${DELIMITER}${name}`)
    await redis.del(`game:${name}`)

    emitAllGames()
  })

  socket.on("disconnect", () => {
    console.log("A user disconnected.");
  });

  socket.on("flush all", () => {
    console.log("flush all");
    redis.flushall()
    emitAllGames()
  });

  async function startGame(name){
    console.log("start game :"+name)
    await redis.hmset(`game${DELIMITER}${name}`, 'state', STATE_RUNNING)
    //TODO: only to room
    io.emit("game started")
  }

  async function emitAllGames(){
    let result = await redis.smembers(`games`)
    let gamelist = []
    if (result && result.length > 0) {
      let promises = result.map(name=>{
        return redis.hgetall(`game${DELIMITER}${name}`)
      })
      gamelist = await Promise.all(promises)
    }
    io.emit("gamelist", gamelist);
  }

  async function emitPlayerslist(gamename){
    let result = await getPlayerlist(gamename)
    let playerlist = []
    if(result && result.length > 0){
      playerlist = result.map(p=>{
        return {name: p, score: 0}
      })
    }
    //TODO: only to room
    io.emit('playerlist', playerlist)
  }

  async function getPlayerlist(gamename){
    return redis.smembers(`playerlist${DELIMITER}${gamename}`)
  }

});



server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
