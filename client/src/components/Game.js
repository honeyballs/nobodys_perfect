import React, { Component } from 'react';
import { withRouter } from 'react-router-dom'
import { parse } from 'qs'

import AppActions from '../flux/Actions';

class Game extends Component {

  constructor(props) {
     super(props);

     this.state = {
       gamename: props.match.params.name,
       players: props.players,
       round: props.round,
       answer: "",
     }

     const query = parse(this.props.location.search.substr(1))
     if(query.playername) AppActions.setPlayername(query.playername)

     AppActions.setGamename(props.match.params.name)
     AppActions.getRound(props.match.params.name)
   }

   componentWillReceiveProps(nextProps) {
     this.setState({
       players: nextProps.players,
       round: nextProps.round,
     });
   }

   setAnswer(e){
     this.setState({answer: e.target.value})
   }

   submitAnswer(){
     //TODO: Validate input value
     AppActions.submitAnswer(this.state.answer)
   }

   leaveGame(){
     AppActions.leaveGame()
     this.props.history.push(`/`)
   }

  render() {
    return (
      <div id="game">
        <div id="game-pane">
          {this.state.round.state == 'PRE_GAME' && (
            <span>...warten auf Spieler</span>
          )}

          {this.state.round.state == 'SHOW_QUESTION' && (
            <div className="question">
              <h3>Runde {this.state.round.id}</h3>
              <span>{this.state.round.question}</span>
            </div>
          )}
        </div>
        <div id="player-list">
          {this.state.players.map(player=>
            <div>
              <span>{player.name}</span> - <span>{player.score}</span>
            </div>
          )}
        </div>
        <div id="chat-bar">
          <input type="text" onChange={(e)=>{this.setAnswer(e)}} value={this.state.answer}/>
          <button onClick={()=>{this.submitAnswer()}}>Absenden</button>
        </div>
        <button onClick={()=>{this.leaveGame()}}>Spiel verlassen</button>
      </div>
    );
  }

}

export default withRouter(Game);
