import React, { Component } from 'react';

import AppActions from '../flux/Actions';

class Lobby extends Component {

  constructor(props) {
     super(props);

     this.state = {
      filterName: "",
      filterNotRunning: false
     }
   }

  render() {
    return (
      <div id="lobby">
        <div id="games-box">
          <input type="text" placeholder="Spielname" value={this.props.gamename || ""} onChange={(e)=>{AppActions.setGamename(e.target.value)}}/>
          <button onClick={AppActions.createGame}>anlegen</button>
          <div id="games-filters">
            <span>Filtern nach: </span>
            <div><input placeholder="Name" value={this.state.filterName || ""} onChange={(e)=>{this.setState({filterName: e.target.value})}} /></div>
            <div><label for="not-running-check">Noch nicht gestartet</label><input id="not-running-check" type="checkbox" checked={this.state.filterNotRunning} onChange={(e)=>{this.setState({filterNotRunning: e.target.checked})}} /></div>

          </div>
          <ul>
            {this.props.games.filter(game=>{
              if(this.state.filterName.length && !game.name.includes(this.state.filterName)) return false
              if(this.state.filterNotRunning && !game.state == 'PRE_GAME') return false
              return true
            }).map(game=>
              <li>
                {game.name} | {game.playercount} Spieler | {game.state}
                <button onClick={()=>{AppActions.joinGame(game.name)}}>beitreten</button>
                <button onClick={()=>{AppActions.deleteGame(game.name)}}>delete</button>
              </li>)}
          </ul>
        </div>
      </div>
    );
  }
}

export default Lobby;
