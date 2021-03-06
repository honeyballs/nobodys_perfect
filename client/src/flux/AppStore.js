import alt from './alt'
import AppActions from './Actions'
import socketIOClient from "socket.io-client";

var socket = socketIOClient("http://192.168.99.100:3000", {
  transports:  ['websocket']
});


// Handle socket events
socket.on("gamelist", function(games) {
  console.log("set gamelist: "+games);
  AppActions.setGames(games)
});

socket.on("playerlist", function(players) {
  console.log("set playerlist: "+players);
  AppActions.setPlayers(players)
});

socket.on("round updated", function(round){
  console.log("round updated: "+round)
  AppActions.setRound(round)
})

socket.on("round", function(round){
  console.log("current round: "+round)
  AppActions.setRound(round)
})

socket.on("playerinfo", function (playerinfo) {
  console.log({playerinfo});
  AppActions.setPlayerInfo(playerinfo);
});

socket.on("answerlist", function(answers){
  console.log("set answerlist: "+answers)
  AppActions.setAnswers(answers)
})

socket.on("gamestate", function(gamestate) {
  console.log("gamestate: " + gamestate)
  AppActions.setGameState(gamestate);
})

socket.on("errorMsg", function (msg) {
    console.log(msg);
})

class AppStore {
  constructor() {
    this.playername = 'unknown'
    this.ownAnswer = ''
    this.ownVote = ''
    this.gamename = false
    this.games = []
    this.players = []
    this.round= {
      id: -1,
      state: 'PRE_GAME',
      question: "",
      answers: [],
      voting: {}
    }

    this.bindListeners({
      setPlayername: AppActions.SET_PLAYERNAME,
      setGamename: AppActions.SET_GAMENAME,
      createGame: AppActions.CREATE_GAME,
      joinGame: AppActions.JOIN_GAME,
      leaveGame: AppActions.LEAVE_GAME,
      setGames: AppActions.SET_GAMES,
      deleteGame: AppActions.DELETE_GAME,
      setPlayers: AppActions.SET_PLAYERS,
      setRound: AppActions.SET_ROUND,
      getRound: AppActions.GET_ROUND,
      setAnswers: AppActions.SET_ANSWERS,
      submitAnswer: AppActions.SUBMIT_ANSWER,
      submitVote: AppActions.SUBMIT_VOTE,
      getGameState: AppActions.GET_GAME_STATE,
      setGameState: AppActions.SET_GAME_STATE,
      flushAll: AppActions.FLUSH_ALL,
    })
  }

  setPlayername(value){
    this.playername = value
  }

  setGamename(value){
    this.gamename = value
  }

  setGames(games){
    this.games = games
  }

  createGame(){
    socket.emit("create game", this.gamename)
    this.setGamename(false)
  }

  joinGame(name){
    let target = name || this.gamename
    socket.emit("join game", {game: target, player: this.playername})
    this.setGamename(false)
  }

  leaveGame(){
    console.log("LEAVE "+this.gamename)
    this.ownAnswer = '';
    this.ownVote = '';
    this.round = {
      id: -1,
      state: 'PRE_GAME',
      question: "",
      answers: [],
      voting: {}
    };
    this.players = [];
    socket.emit("leave game", {game: this.gamename, player: this.playername})
    this.gamename = false;
  }

  deleteGame(name){
    socket.emit("delete game", name)
  }

  setPlayers(players){
    this.players = players
  }

  setRound(round){
    console.log("set round", round)
    if(round.state === 'SHOW_QUESTION' && this.round.state === 'REVEAL'){
      this.ownAnswer = ''
      this.ownVote = ''
    }
    this.round = {...this.round, ...round}
  }
  getRound(gamename){
    let target = gamename || this.gamename
    socket.emit('get round',{game: target})
  }

  setAnswers(answers){
    this.round = {...this.round, answers}
  }

  submitAnswer(answer){
    console.log("submit answer: "+answer)
    this.ownAnswer = answer;
    socket.emit('set answer', {game: this.gamename, player:this.playername,  answer: answer})
  }

  submitVote(vote){
    console.log("submit vote: "+vote)
    this.ownVote = vote;
    socket.emit('set vote', {game: this.gamename, player:this.playername,  answer: vote})
  }

  getGameState(reqObj) {
    console.log("getGameState: " + reqObj);
    socket.emit('gamestate', reqObj);
  }

  setGameState(gameState) {
    this.round = gameState.round;
    this.ownAnswer = gameState.answer;
    this.ownVote = gameState.vote;
    this.players = gameState.players;
  }

  flushAll(){
    socket.emit("flush all")
  }

}

export default alt.createStore(AppStore);
