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

  socket.on("create session", name => {
    console.log(name);
    // Check if a session with this name exists
    redis.exists(`sessionName:${name}`, (err, result) => {
        if (result === 0) {
            let sessionId = uuid();
            console.log(sessionId);
            redis.hmset(`session:${sessionId}`, "name", name);
            redis.sadd(`sessionName:${name}`, sessionId);
            socket.emit("created", sessionId);
            redis.publish('messages', 'New session created');
        } else {
            socket.emit("errorMsg", "A session with that name already exists.");
        }
    })
  });

  socket.on("join session", name => {
    console.log(name);
    redis.smembers(`sessionName:${name}`, (err, result) => {
      if (result && result.length > 0) {
        socket.emit("joined", result[0]);
      } else {
          socket.emit("errorMsg", `There is no session with the name "${name}"`);
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected.");
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
