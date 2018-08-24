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
       answerSubmitted: false,
     }

     const query = parse(this.props.location.search.substr(1))
     if(query.playername) AppActions.setPlayername(query.playername)

     AppActions.setGamename(props.match.params.name)
     AppActions.getRound(props.match.params.name)

    AppActions.getPlayerInfo({playername: query.playername, game: props.match.params.name});
  
     //TODO verhindern dass durch page refresh ein nutzer mehrere antworten abschicken kann
   }

   componentWillReceiveProps(nextProps) {
     if(nextProps.round.state == 'VOTING' && this.state.round.state != 'VOTING') this.votingStarted()
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
     this.setState({answerSubmitted: true})
   }

   votingStarted(){
     this.setState({answerSubmitted: false})
   }

   submitVote(vote){
     AppActions.submitVote(vote)
     this.setState({answerSubmitted: true})
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
            <div>
              <div className="question">
                <h3>Runde {this.state.round.id}</h3>
                <span>{this.state.round.question}</span>
              </div>
              <div id="chat-bar">
                <input type="text" onChange={(e)=>{this.setAnswer(e)}} value={this.state.answer}/>
                <button disabled={this.state.answerSubmitted} onClick={()=>{this.submitAnswer()}}>Absenden</button>
              </div>
            </div>
          )}

          {this.state.round.state == 'VOTING' && (
            <div>
              <div className="question">
                <h3>Runde {this.state.round.id}</h3>
                <span>{this.state.round.question}</span>
              </div>
              <div className="voting">
                {this.state.round.answers.map((answer,i)=>
                  <div>
                    <input checked={answer === this.props.vote}  disabled={this.props.vote} type="radio" name="voting" id="voting-check-{i}" onChange={(e)=>{this.submitVote(answer)}}/>
                    <label for="voting-check-{i}">{answer}</label>
                  </div>
                )}
              </div>
            </div>
          )}
          {this.state.round.state == 'REVEAL' && (
            <div>
              <div className="question">
                <h3>Runde {this.state.round.id}</h3>
                <span>{this.state.round.question}</span>
              </div>
              <div className="reveal">
                Auswertung
              </div>
            </div>
          )}
        </div>
        <div id="player-list">
          {this.state.round.state == 'SHOW_QUESTION' && (
            <span>({this.state.round.answers.length}/{this.state.players.length} Spielern haben geantwortet)</span>
          )}
          {this.state.players.map(player=>
            <div>
              <span>{player.name}</span> - <span>{player.score}</span>
            </div>
          )}
        </div>
        <button onClick={()=>{this.leaveGame()}}>Spiel verlassen</button>
      </div>
    );
  }

}

export default withRouter(Game);
