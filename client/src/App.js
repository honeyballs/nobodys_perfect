import React, { Component } from 'react';
import './App.css';
import { BrowserRouter, Route, Switch } from 'react-router-dom'

import AppStore from './flux/AppStore'
import Lobby from './components/Lobby'
import Game from './components/Game'

let getState = () => {
    return {
        playername: AppStore.getState().playername,
        gamename: AppStore.getState().gamename,
        games: AppStore.getState().games,
        players: AppStore.getState().players,
        round: AppStore.getState().round,
        ownAnswer: AppStore.getState().ownAnswer,
        ownVote: AppStore.getState().ownVote,
    }
}

class App extends Component {

  constructor(props) {
       super(props);
       this.state = getState();
       this.props = props;
       this._onListen = this._onListen.bind(this);
   }

  componentDidMount() {
    AppStore.listen(this._onListen);
  }

  componentWillUnmount() {
    AppStore.unlisten(this._onListen);
  }

  _onListen() {
    this.setState(getState());
  }

  render() {
    return (
      <BrowserRouter>
        <div className="App">
          <header className="App-header">
            <h1 className="App-title">Nobody's perfect</h1>
          </header>
          <Switch>
            <Route path="/game/:name">
              <Game players={this.state.players} round={this.state.round} ownAnswer={this.state.ownAnswer} ownVote={this.state.ownVote}/>
            </Route>
            <Route exact path="/">
              <Lobby playername={this.state.playername} gamename={this.state.gamename} games={this.state.games}/>
            </Route>
          </Switch>
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
