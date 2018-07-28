import React, { Component } from 'react';
import { withRouter } from 'react-router-dom'

import AppActions from '../flux/Actions';

class Lobby extends Component {

  constructor(props) {
     super(props);

     this.state = {
      filterName: "",
      filterNotRunning: false
     }
   }

   joinGame(name){
     AppActions.joinGame(name)
     //not a final solution for async:
     setTimeout(()=>{
       this.props.history.push(`/game/${name}`)
     },200)
   }

  render() {
    return (
      <div id="lobby">
        <div id="games-box">
          <input type="text" value={this.props.playername} onChange={(e)=>{AppActions.setPlayername(e.target.value)}}/>
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
                <button onClick={()=>{this.joinGame(game.name)}}>beitreten</button>
                <button onClick={()=>{AppActions.deleteGame(game.name)}}>delete</button>
              </li>)}
          </ul>
        </div>
      </div>
    );
  }
}

export default withRouter(Lobby);
