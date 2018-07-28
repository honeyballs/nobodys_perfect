import alt from './alt';

class AppActions {

    setGamename(name) {
        return name
    }

    createGame(){
      return true
    }

    joinGame(name){
      return name
    }

    setGames(games){
      return games
    }

    deleteGame(name){
      console.log("dispatch", name)
      return name
    }
}

export default alt.createActions(AppActions);
