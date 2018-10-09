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
const SCORE_RIGHT_ANSWER = 3
const SCORE_ANSWER_VOTED = 1

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

    if (message.startsWith('ERROR')) {
      let msg = message.split(`|`);
      io.emit('errorMsg', msg[1]);
    }

    if (message.startsWith('GAMELIST')) {
      let params = message.split(`|`);
      io.emit("gamelist", JSON.parse(params[1]));
    }

    if (message.startsWith('ROUND_START')) {
      let params = message.split(`${DELIMITER}`);
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
      io.to(params[1]).emit('round updated', {voting: JSON.parse(params[2])});
    }

    if(message.startsWith('REVEAL_START')) {
      let params = message.split('|')
      io.to(params[1]).emit('round updated', {state: STATE_REVEAL, voting: JSON.parse(params[2])})
    }

    if (message.startsWith('GAME_FINISH')) {
      let params = message.split(`${DELIMITER}`);
      io.to(params[1]).emit('round updated', {state: STATE_FINISHED});
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
        redis.hmset(`game${DELIMITER}${name}`, "name", name, "playercount", 0, "state", STATE_PRE_GAME, "roundid", 0);
        redis.sadd(`games`, name);
        emitAllGames();
    } else {
      redis.publish('messages', `ERROR|A game with that name already exists.`)
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
        redis.publish('messages', `ERROR|There is no game with the name "${name}"`)
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
    console.log(params.player+" answered: "+params.answer+" in "+params.game)
    await redis.hmset(`player${DELIMITER}${params.player}${DELIMITER}${params.game}`, 'answer', params.answer)
    let answers = await emitAnswers(params.game)
    let players = await getPlayerlist(params.game)
    if((answers.length-1) == players.length){
      startVote(params.game)
    }
  })

  socket.on("set vote", async params=>{
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
    let player = await redis.hmget(`player${DELIMITER}${params.player}${DELIMITER}${params.game}`, 'answer','vote')
    let playerlist = await getDetailedPlayerlist(params.game)
    if(round){
      round.id = round.roundid
      round.question = question || ''
      round.answers = answers || []
      round.voting = voting || {}
    }
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

  async function startRound(name, roundId=0){
    console.log(`started round ${roundId} in ${name}`)
    await resetRoundData(name)
    let questionId = roundId || 0
    if(!QUESTIONS[questionId]){
      console.log(`game ${name} ended at round ${roundId}`)
      endGame(name)
      return
    }
    await redis.hmset(`game${DELIMITER}${name}`, 'state', STATE_SHOW_QUESTION, 'question', questionId)
    redis.publish('messages', `ROUND_START${DELIMITER}${name}${DELIMITER}${roundId}${DELIMITER}${questionId}`);
  }

  async function startVote(name){
    console.log(`start vote in ${name}`)
    await redis.hmset(`game${DELIMITER}${name}`, 'state', STATE_VOTING)
    redis.publish('messages', `VOTING_START${DELIMITER}${name}`)
  }

  async function startReveal(name, voting){
    console.log(`start reveal in ${name}`)
    let result = await evaluate(name, voting)
    await redis.hmset(`game${DELIMITER}${name}`, 'state', STATE_REVEAL)
    redis.publish('messages', `REVEAL_START|${name}|${JSON.stringify(result)}`)
    emitPlayerlist(name)
    setTimeout(async ()=>{
      let id = await nextRound(name)
      startRound(name, id)
    },10000)
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
    redis.publish('messages', `GAMELIST|${JSON.stringify(gamelist)}`)
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
    let round = await redis.hmget(`game${DELIMITER}${gamename}`, `question`, `state`)
    let correctAnswer
    if (round[1] === STATE_REVEAL) {
      correctAnswer = QUESTIONS[Number(round[0])].answer
    }
    let playerlist = await getPlayerlist(gamename)
    let voting = {
      sum: 0,
      answers: []
    }
    let result = await getAnswerlist(gamename)
    voting.answers = result.map((answer)=>{
      return {answer: answer, count: 0, correctAnswer: (answer === correctAnswer)}
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

  async function evaluate(gamename, voting){
    let playerlist = await getDetailedPlayerlist(gamename)
    let round = await redis.hgetall(`game${DELIMITER}${gamename}`)
    let promises = []
    let correctAnswer = QUESTIONS[Number(round.question)].answer
    playerlist.forEach(player=>{
      let deltaScore = 0
      //abgegebenen Vote auswerten:
      console.log(`compare ${player.vote} to ${correctAnswer}`)
      if(player.vote && player.vote.length && player.vote === correctAnswer){
        deltaScore += SCORE_RIGHT_ANSWER
        console.log(`${player.name} hat richtig geantwortet und nun ${Number(player.score) + deltaScore} Punkte (+${SCORE_RIGHT_ANSWER})`)
      }
      //erhaltene Votes auswerten:
      let answer = voting.answers.filter(a=>a.answer === player.answer)[0]
      if(answer && answer.count && answer.count != 0){
        deltaScore += (SCORE_ANSWER_VOTED * answer.count)
        console.log(`${player.name} hat ${answer.count} votings erhalten und nun ${Number(player.score) + deltaScore} Punkte (+${(SCORE_ANSWER_VOTED*answer.count)})`)
      }
      //neue score auf redis anwenden:
      if((Number(player.score) + deltaScore) != player.score) promises.push(redis.hmset(`player${DELIMITER}${player.name}${DELIMITER}${gamename}`, 'score', Number(player.score) + deltaScore, 'delta', deltaScore))
    })
    await Promise.all(promises)
    //korrekte Antwort setzen:
    voting.answers.map(answer=>{
      if(answer.answer === correctAnswer) answer.correctAnswer = true
      return answer
    })
    return voting
  }

  async function resetRoundData(gamename){
    let playerlist = await getPlayerlist(gamename)
    let promises = playerlist.map(player=>{
      return redis.hmset(`player${DELIMITER}${player}${DELIMITER}${gamename}`, 'answer', '', 'vote', '', 'delta', 0)
    })
    await Promise.all(promises)
  }

  async function nextRound(gamename){
    let roundId = await redis.hincrby(`game${DELIMITER}${gamename}`, "roundid", 1)
    return roundId
  }

  async function endGame(gamename){
    await redis.hmset(`game${DELIMITER}${gamename}`, 'state', STATE_FINISHED)
    redis.publish('messages', `GAME_FINISH${DELIMITER}${gamename}`)
  }

});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
