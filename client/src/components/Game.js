import React, { Component } from 'react';
import { withRouter } from 'react-router-dom'
import { parse } from 'qs'

import AppActions from '../flux/Actions';

import '../styles/game.css'

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

     // Load all data already on the backend, important in case of refresh
     AppActions.getGameState({game: props.match.params.name, player: query.playername});

     //TODO verhindern dass durch page refresh ein nutzer mehrere antworten abschicken kann
   }

   componentWillReceiveProps(nextProps) {
     if(nextProps.round.state === 'VOTING' && this.state.round.state !== 'VOTING') this.votingStarted()
     this.setState({
       players: nextProps.players,
       round: nextProps.round,
       answer: nextProps.ownAnswer,
       answerSubmitted: nextProps.ownAnswer.length > 0
     });
   }

   setAnswer(e){
     this.setState({answer: e.target.value});
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
          {this.state.round.state === 'PRE_GAME' && (
            <span>...warten auf Spieler</span>
          )}

          {this.state.round.state === 'SHOW_QUESTION' && (
            <div id="question-container">
              <h2>Runde {Number(this.state.round.id)+1}</h2>
                <p id="question-text">{this.state.round.question}</p>
              <div id="chat-bar">
                <input type="text" onChange={(e)=>{this.setAnswer(e)}} value={this.state.answer} placeholder="Your answer"/>
                <button disabled={this.state.answerSubmitted} onClick={()=>{this.submitAnswer()}}>Absenden</button>
                <p>({this.state.round.answers.length-1}/{this.state.players.length} Spielern haben geantwortet)</p>
              </div>
            </div>
          )}

          {this.state.round.state === 'VOTING' && (
            <div>
              <div className="question">
                <h2>Runde {this.state.round.id}</h2>
                <span>{this.state.round.question}</span>
              </div>
              <div className="voting">
                {this.state.round.answers.map((answer,i)=>
                  <div key={i}>
                    <input checked={answer === this.props.ownVote}  disabled={this.props.ownVote} type="radio" name="voting" id={'voting-check-'+i} onChange={(e)=>{this.submitVote(answer)}}/>
                    <label>{answer}</label>
                  </div>
                )}
              </div>
            </div>
          )}
          {this.state.round.state === 'REVEAL' && (
            <div>
              <div className="question">
                <h2>Runde {this.state.round.id}</h2>
                <span>{this.state.round.question}</span>
              </div>
              <div className="reveal">
              {this.state.round.voting.answers.map((answer,i)=>
                <div className="answer-div" key={i}>
                  <p className={answer.correctAnswer && "right-answer"}>{answer.answer}</p>
                  <p className="answer-count">{answer.count}</p>
                </div>
              )}
              </div>
            </div>
          )}
          {this.state.round.state === 'FINISHED' && (
            <div>
              <span>
                Dieses Spiel ist beendet
              </span>
              <div>
              TODO: Endstand anzeigen
              </div>
            </div>
          )}
          <button id="leave-button" onClick={()=>{this.leaveGame()}}>Spiel verlassen</button>
        </div>
        <div id="player-list">
          <h2>All players</h2>
          {this.state.players.map(player=>
            <div id="player-div" key={player.name}>
              <p>{player.name}</p>
              <p id="score-text">Score: {player.score} {this.state.round.state === 'REVEAL' && `(+${player.delta})`}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

}

export default withRouter(Game);
