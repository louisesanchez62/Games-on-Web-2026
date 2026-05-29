import { PokerCardRenderer } from './game/PokerCardRenderer.js';
import { PokerGameFlow } from './PokerGameFlow.js';

export class PokerGame {
  constructor(scene, tableNode) {
    this.scene = scene;
    this.tableNode = tableNode;
    this.ui = null;
    this.renderer = new PokerCardRenderer(scene);
    this.round = null;
    this.opponentCount = 2;
    this._active = false;
    this._pendingTimeout = null;
    this._gameOverShown = false;
    this.flow = new PokerGameFlow(this);
  }

  start() { return this.flow.start(); }
  stop() { return this.flow.stop(); }
  _setOpponentCount(count) { return this.flow.setOpponentCount(count); }
  _newRound() { return this.flow.newRound(); }
  _playerAction(type) { return this.flow.playerAction(type); }
  _playerCallOrCheck() { return this.flow.playerCallOrCheck(); }
  _playerRaise() { return this.flow.playerRaise(); }
  _playerAllIn() { return this.flow.playerAllIn(); }
}