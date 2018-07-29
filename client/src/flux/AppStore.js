import alt from './alt'
import AppActions from './Actions'
import socketIOClient from "socket.io-client";

var socket = socketIOClient("http://localhost:3000");


// Handle socket events
socket.on("gamelist", function(games) {
  console.log("set gamelist: "+games);
  AppActions.setGames(games)
});

socket.on("created", function(game) {
  console.log("created game: "+game);
});

socket.on("joined", function(game) {
  console.log("joined game: "+game);
});

socket.on("playerlist", function(players) {
  console.log("set playerlist: "+players);
  AppActions.setPlayers(players)
});

socket.on("game state change", function(state) {
  console.log("game state changed: "+state);
  AppActions.setGamestate(state)
});

socket.on("errorMsg", function (msg) {
    console.log(msg);
})

class AppStore {
  constructor() {
    this.playername = 'unknown'
    this.gamename = false
    this.games = []
    this.players = []
    this.gamestate = 'PRE_GAME'

    this.bindListeners({
      setPlayername: AppActions.SET_PLAYERNAME,
      setGamename: AppActions.SET_GAMENAME,
      createGame: AppActions.CREATE_GAME,
      joinGame: AppActions.JOIN_GAME,
      leaveGame: AppActions.LEAVE_GAME,
      setGames: AppActions.SET_GAMES,
      deleteGame: AppActions.DELETE_GAME,
      setPlayers: AppActions.SET_PLAYERS,
      setGamestate: AppActions.SET_GAMESTATE,
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
    socket.emit("leave game", {game: this.gamename, player: this.playername})
  }

  deleteGame(name){
    socket.emit("delete game", name)
  }

  setPlayers(players){
    this.players = players
  }

  setGamestate(state){
    this.gamestate = state
  }

  flushAll(){
    socket.emit("flush all")
  }

}



export default alt.createStore(AppStore);
