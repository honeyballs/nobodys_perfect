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

socket.on("errorMsg", function (msg) {
    console.log(msg);
})

class AppStore {
  constructor() {
    this.gamename = false
    this.games = []

    this.bindListeners({
      setGamename: AppActions.SET_GAMENAME,
      createGame: AppActions.CREATE_GAME,
      joinGame: AppActions.JOIN_GAME,
      setGames: AppActions.SET_GAMES,
      deleteGame: AppActions.DELETE_GAME,
    })
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

  joinGame(){
    socket.emit("join game", this.gamename)
    this.setGamename(false)
  }

  deleteGame(name){
    socket.emit("delete game", name)
  }

}



export default alt.createStore(AppStore);
