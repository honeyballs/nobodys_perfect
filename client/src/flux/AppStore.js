import alt from './alt'
import AppActions from './Actions'
import socketIOClient from "socket.io-client";

var socket = socketIOClient("http://localhost:3000");


// Handle socket events
socket.on("gamelist", function(games) {
  console.log(games);
  AppActions.setGames(games)
});

socket.on("created", function(id) {
  console.log(id);
});

socket.on("joined", function(id) {
  console.log(id);
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

}



export default alt.createStore(AppStore);
