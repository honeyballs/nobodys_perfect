import express from "express";
import http from "http";
import socketio from "socket.io";
import Redis from "ioredis";
import uuid from "uuid/v1";
import QUESTIONS from './questions'
import questions from "./questions";
import conf from "./redis-config";


let app = express();
let server = http.Server(app);
let io = socketio(server);

let redis = new Redis({ host: conf.host, password: conf.password });
let sub = new Redis({ host: conf.host, password: conf.password });

const DELIMITER = ':'
const MIN_PLAYERCOUNT = 2
const STATE_PRE_GAME = 'PRE_GAME'
const STATE_SHOW_QUESTION = 'SHOW_QUESTION'
const STATE_VOTING = 'VOTING'
const STATE_REVEAL = 'REVEAL'
const STATE_FINISHED = 'FINISHED'

// Use the given port:
let port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("<h1>I'm working.</h1>");
});

// Subscribe to the redis messaging system
sub.subscribe('messages', (err, count) => {
    console.log(`Subscribed to ${count} channels.`);
})

// Receive messages
sub.on('message', (channel, message) => {
    console.log(`Received message "${message}" from channel "${channel}".`);
    // Implement actions

    if (message.startsWith('ROUND_START')) {
      let params = message.split(`${DELIMITER}`);
      //TODO: clear answers of players
      // Params are message, name, id, questionId. Maybe implement keys?
      io.to(params[1]).emit('round updated', {id: params[2], state: STATE_SHOW_QUESTION, question: QUESTIONS[Number(params[3])].question, answers: [QUESTIONS[Number(params[3])].answer]})
    }

    if (message.startsWith('PLAYERLIST')) {
      let params = message.split('|');
      // Params are name, playerlist as JSON
      io.to(params[1]).emit('playerlist', JSON.parse(params[2]));
    }

    if(message.startsWith('ANSWERLIST')) {
      let params = message.split(`|`)
      io.to(params[1]).emit('round updated', {answers: JSON.parse(params[2])})
    }

    if (message.startsWith('VOTING_START')) {
      let params = message.split(`${DELIMITER}`);
      io.to(params[1]).emit('round updated', {state: STATE_VOTING});
    }

    if(message.startsWith('VOTING_GET')) {
      let params = message.split('|');
      io.to(params[1]).emit('round updated', {votes: JSON.parse(params[2])});
    }

    if(message.startsWith('REVEAL_START')) {
      let params = message.split(`${DELIMITER}`)
      io.to(params[1]).emit('round updated', {state: STATE_REVEAL})
    }

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
        emitAllGames();
        redis.publish('messages', 'New game created');
    } else {
        io.emit("errorMsg", "A game with that name already exists.");
    }
  });

  socket.on("join game", async params => {
    console.log(`join game ${params.game} as ${params.player}`)
      socket.join(params.game);
      let result = await redis.hgetall(`game${DELIMITER}${params.game}`)
      if (result && result.state) {
        redis.sadd(`playerlist${DELIMITER}${params.game}`, `${params.player}`)
        await redis.hmset(`player${DELIMITER}${params.player}${DELIMITER}${params.game}`, 'name', params.player, 'score', 0, 'answer', '', 'vote', '', 'delta', 0)
        let count = await redis.hincrby(`game${DELIMITER}${params.game}`, "playercount", 1)
        if(count === MIN_PLAYERCOUNT) await startGame(params.game)
        emitPlayerlist(params.game)
        emitAllGames();
      } else {
        io.emit("errorMsg", `There is no game with the name "${name}"`);
      }
  });

  socket.on("leave game", async params => {
    console.log(`leave game ${params.game} as ${params.player}`)
    redis.del(`player${DELIMITER}${params.player}${DELIMITER}${params.game}`)
    redis.srem(`playerlist${DELIMITER}${params.game}`, `${params.player}`)
    emitAnswers(params.game)
    let count = await redis.hincrby(`game${DELIMITER}${params.game}`, "playercount", -1)
    emitPlayerlist(params.game)
    emitAllGames();
    socket.leave(params.game);
    io.emit("left", params.game);
  });

  socket.on("delete game", async name => {
    console.log("delete game: "+name)
    await redis.srem('games',name)
    await redis.del(`playerlist${DELIMITER}${name}`)
    await redis.del(`game:${name}`)
    resetAnswersForPlayerlist(name)

    emitAllGames()
  })

  socket.on("set answer", async params=>{
    //playername als id ausreichend?
    console.log(params.player+" answered: "+params.answer+" in "+params.game)
    await redis.hmset(`player${DELIMITER}${params.player}${DELIMITER}${params.game}`, 'answer', params.answer)
    let answers = await emitAnswers(params.game)
    let players = await getPlayerlist(params.game)
    if((answers.length-1) == players.length){
      startVote(params.game)
    }
  })

  socket.on("set vote", async params=>{
    //playername als id ausreichend?
    console.log(params.player+" voted: "+params.answer+" in "+params.game)
    await redis.hmset(`player${DELIMITER}${params.player}${DELIMITER}${params.game}`, 'vote', params.answer)
    let voting = await emitVoting(params.game)
    let players = await getPlayerlist(params.game)
    console.log(voting.sum+" of "+players.length+" votes")
    if(voting.sum == players.length){
      startReveal(params.game, voting)
    }
  })

  socket.on("gamestate", async params =>{
    console.log(params.player+" requested gamestate for "+params.game)
    socket.join(params.game)
    let round = await redis.hgetall(`game${DELIMITER}${params.game}`)
    let answers, voting, question;
    if(round.state != STATE_PRE_GAME){
      answers = await getAnswerlist(params.game)
      voting = await getVoting(params.game)
      question = QUESTIONS[round.question].question
    }
    let player = await redis.hmget(`player${DELIMITER}${params.player}${DELIMITER}${params.game}`, 'answer','voting')
    let playerlist = await getDetailedPlayerlist(params.game)
    if(round){
      round.question = question || ''
      round.answers = answers || []
      round.voting = voting || {}
    }
    //TODO: Auswertungsobjekt ergänzen
    socket.emit('gamestate', {
      round: round,
      answer: player[0],
      vote: player[1],
      players: playerlist,
    })
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
    startRound(name)
  }

  async function startRound(name){
    //TODO: answer und vote aus letzter Runde resetten
    let questionId = 0
    await redis.hmset(`game${DELIMITER}${name}`, 'roundid', 0, 'state', STATE_SHOW_QUESTION, 'question', questionId)
    redis.publish('messages', `ROUND_START${DELIMITER}${name}${DELIMITER}0${DELIMITER}${questionId}`);
  }

  async function startVote(name){
    await redis.hmset(`game${DELIMITER}${name}`, 'state', STATE_VOTING)
    redis.publish('messages', `VOTING_START${DELIMITER}${name}`)
  }

  async function startReveal(name, voting){
    await evaluate(name, voting)
    await redis.hmset(`game${DELIMITER}${name}`, 'state', STATE_REVEAL)
    redis.publish('messages', `REVEAL_START${DELIMITER}${name}`)
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

  async function emitPlayerlist(gamename){
    let playerlist = await getDetailedPlayerlist(gamename)
    redis.publish('messages', `PLAYERLIST|${gamename}|${JSON.stringify(playerlist)}`);
  }

  async function getDetailedPlayerlist(gamename){
    let result = await getPlayerlist(gamename)
    let playerlist = [];
    if(result && result.length > 0){
        let promises = result.map(playername => {
          return redis.hgetall(`player${DELIMITER}${playername}${DELIMITER}${gamename}`)
        });
        playerlist = await Promise.all(promises);
    }
    return playerlist
  }

  async function getPlayerlist(gamename){
    return redis.smembers(`playerlist${DELIMITER}${gamename}`)
  }

  async function emitAnswers(gamename){
    let result = await getAnswerlist(gamename)
    redis.publish('messages', `ANSWERLIST|${gamename}|${JSON.stringify(result)}`)
    return result
  }

  async function getAnswerlist(gamename){
    let playerlist = await getPlayerlist(gamename)
    let answers = []
    if (playerlist && playerlist.length > 0) {
      let promises = playerlist.map(name=>{
        return redis.hgetall(`player${DELIMITER}${name}${DELIMITER}${gamename}`)
      })
      let players = await Promise.all(promises)
      players.forEach(player=>{
        if(player.answer && player.answer.length) answers.push(player.answer)
      })
      // Load Game Hash to get question Id and add the right answer to the mix
      let qId = await redis.hget(`game${DELIMITER}${gamename}`, `question`);
      answers.push(questions[qId].answer);

      // Randomize the order of answers
      answers = answers.sort(() => Math.random() - 0.5);

    }

    return answers
  }

  async function resetAnswersForPlayerlist(gamename){
    let playerlist = await getPlayerlist(gamename)
    if (playerlist && playerlist.length > 0) {
      let promises = playerlist.map(name=>{
        return redis.del(`player${DELIMITER}${name}${DELIMITER}gamename`)
      })
      await Promise.all(promises)
    }
  }

  async function emitVoting(gamename){
    let result = await getVoting(gamename)
    redis.publish('messages', `VOTING_GET|${gamename}|${JSON.stringify(result)}`);
    return result
  }

  async function getVoting(gamename){
    let playerlist = await getPlayerlist(gamename)
    let voting = {
      sum: 0,
      answers: []
    }
    let result = await getAnswerlist(gamename)
    voting.answers = result.map((answer)=>{
      return {answer: answer, count: 0}
    })
    if (playerlist && playerlist.length > 0) {
      let promises = playerlist.map(name=>{
        return redis.hgetall(`player${DELIMITER}${name}${DELIMITER}${gamename}`)
      })
      let players = await Promise.all(promises)
      players.forEach(player=>{
        if(player.vote && player.vote.length){
          let match = -1
          voting.answers.forEach((a,i)=>{
            if(a.answer == player.vote) match = i
          })
          if(match != -1){
            voting.answers[match].count ++
            voting.sum ++
          }
        }
      })
    }
    return voting
  }

  async function evaluate(gamename){
    let playerlist = await getPlayerlist(gamename)

  }

});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
