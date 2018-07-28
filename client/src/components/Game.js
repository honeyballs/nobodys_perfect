import React, { Component } from 'react';
import { withRouter } from 'react-router-dom'

import AppActions from '../flux/Actions';

class Game extends Component {

  constructor(props) {
     super(props);

     this.state = {
       gamename: props.match.params.name
     }
   }

  render() {
    return (
      <div id="game">
        game {this.state.gamename}
      </div>
    );
  }

}

export default withRouter(Game);
