import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import "../styles/lobby.css";

import AppActions from "../flux/Actions";

class Lobby extends Component {
  constructor(props) {
    super(props);

    this.state = {
      filterName: "",
      filterNotRunning: false
    };
  }

  joinGame(name) {
    AppActions.joinGame(name);
    //not a final solution for async:
    setTimeout(() => {
      this.props.history.push(
        `/game/${name}?playername=${this.props.playername}`
      );
    }, 200);
  }

  render() {
    return (
      <div id="lobby">
        <div id="create">
          <div id="username">
            <h2>Enter your username</h2>
            <input
              type="text"
              value={this.props.playername}
              onChange={e => {
                AppActions.setPlayername(e.target.value);
              }}
            />
          </div>
          <div id="create-game">
            <h2>Create a game</h2>
            <input
              type="text"
              placeholder="Name"
              value={this.props.gamename || ""}
              onChange={e => {
                AppActions.setGamename(e.target.value);
              }}
            />
            <button onClick={AppActions.createGame}>Create</button>
            <button
              onClick={() => {
                AppActions.flushAll();
              }}
            >
              Flush redis
            </button>
          </div>
        </div>
        <div id="join">
          <h2>Join an existing game</h2>
          <span id="filter-text">Search...</span>
          <div>
            <input
              placeholder="Name"
              value={this.state.filterName || ""}
              onChange={e => {
                this.setState({ filterName: e.target.value });
              }}
            />
          </div>
          <div>
            <label for="not-running-check">Not running</label>
            <input
              id="not-running-check"
              type="checkbox"
              checked={this.state.filterNotRunning}
              onChange={e => {
                this.setState({ filterNotRunning: e.target.checked });
              }}
            />
          </div>
          <h3>Games</h3>
          <table>
          <tr>
              <td>Name</td>
              <td>Players</td>
              <td>State</td>
              <td>Actions</td>
          </tr>
            {this.props.games
              .filter(game => {
                if (
                  this.state.filterName.length &&
                  !game.name.includes(this.state.filterName)
                )
                  return false;
                if (this.state.filterNotRunning && game.state !== "PRE_GAME")
                  return false;
                return true;
              })
              .map(game => (
                <tr>
                  <td>{game.name}</td>
                  <td>{game.playercount} Player</td>
                  <td>{game.state}</td>
                  <td>
                    <button
                      onClick={() => {
                        this.joinGame(game.name);
                      }}
                    >
                      Join
                    </button>
                    <button
                      onClick={() => {
                        AppActions.deleteGame(game.name);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </table>
        </div>
      </div>
    );
  }
}

export default withRouter(Lobby);
