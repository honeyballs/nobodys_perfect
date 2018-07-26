import alt from './alt'
import AppActions from './Actions'
import socketIOClient from "socket.io-client";

var socket = socketIOClient("http://localhost:3000");


// Handle socket events
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

    this.bindListeners({
      setGamename: AppActions.SET_GAMENAME,
      createGame: AppActions.CREATE_GAME,
      joinGame: AppActions.JOIN_GAME,
    })
  }

  setGamename(value){
    this.gamename = value
  }

  createGame(){
    socket.emit("create session", this.gamename)
    this.setGamename(false)
  }

  joinGame(){
    socket.emit("join session", this.gamename)
    this.setGamename(false)
  }

}



export default alt.createStore(AppStore);
