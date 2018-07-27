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

  socket.on("create game", name => {
    console.log("create game: "+name)
    // Check if a game with this name exists
    redis.exists(`game:${name}`, (err, result) => {
        if (result === 0) {
            redis.hmset(`game:${name}`, "playercount", 0, "state", "PRE_GAME");
            redis.sadd(`games`, name);
            socket.emit("created", name);
            emitAllGames()
            redis.publish('messages', 'New game created');
        } else {
            socket.emit("errorMsg", "A game with that name already exists.");
        }
    })
  });

  socket.on("join game", name => {
    console.log("join game: "+name)
    redis.smembers(`game:${name}`, (err, result) => {
      if (result && result.length > 0) {
        socket.emit("joined", result[0]);
      } else {
          socket.emit("errorMsg", `There is no game with the name "${name}"`);
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected.");
  });

  function emitAllGames(){
    redis.smembers(`games`, (err, result) => {
      let gamelist = []
      if (result && result.length > 0) {
        gamelist = result
      }
      socket.emit("gamelist", gamelist);
    });
  }

});



server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
