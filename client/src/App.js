import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import { BrowserRouter, Route, Switch } from 'react-router-dom'

import AppStore from './flux/AppStore'
import Lobby from './components/Lobby'
import Game from './components/Game'



let getState = () => {
    return {
        gamename: AppStore.getState().gamename,
        games: AppStore.getState().games,
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
            <img src={logo} className="App-logo" alt="logo" />
            <h1 className="App-title">Nobodys perfect</h1>
          </header>
          <Switch>
            <Route path="/game/:name">
              <Game />
            </Route>
            <Route exact path="/">
              <Lobby gamename={this.state.gamename} games={this.state.games}/>
            </Route>
          </Switch>
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
