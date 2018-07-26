import React, { Component } from 'react';

import AppActions from '../flux/Actions';

class Lobby extends Component {


  render() {
    return (
      <div id="lobby">
        <div id="games-box">
          <input type="text" placeholder="Spielname" value={this.props.gamename || ""} onChange={(e)=>{AppActions.setGamename(e.target.value)}}/>
          <button onClick={AppActions.createGame}>anlegen</button>
          <button onClick={AppActions.joinGame}>beitreten</button>
        </div>
      </div>
    );
  }
}

export default Lobby;
