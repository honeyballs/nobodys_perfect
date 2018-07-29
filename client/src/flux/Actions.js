import alt from './alt';

class AppActions {

    setPlayername(name){return name}

    setGamename(name) {return name}

    createGame(){return true}

    joinGame(name){return name}

    leaveGame(){return true}

    setGames(games){return games}

    deleteGame(name){return name}

    setPlayers(players){return players}

    setRound(round){return round}

    getRound(gamename){return gamename}


    flushAll(){return true}
}

export default alt.createActions(AppActions);
