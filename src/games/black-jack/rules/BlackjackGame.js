import { BlackjackRound } from './game/BlackjackRound.js';
import { TableCardRenderer } from './game/TableCardRenderer.js';
import { BlackjackGameFlow } from './game/BlackjackGameFlow.js';

export class BlackjackGame {
  constructor(scene, tableNode) {
    this.scene = scene;
    this.tableNode = tableNode;
    this.ui = null;
    this.round = new BlackjackRound();
    this.renderer = new TableCardRenderer(scene, tableNode);
    this._active = false;
    this._state = 'idle';
    this._pendingTimeout = null;
    this._currentBet = 0;
    this._gameOverShown = false;
    this.flow = new BlackjackGameFlow(this);
  }

  start() { return this.flow.start(); }
  stop() { return this.flow.stop(); }
  _newRound() { return this.flow.newRound(); }
  _playerHit() { return this.flow.playerHit(); }
  _playerStand() { return this.flow.playerStand(); }
  
  _updateTotals() {
    if (this.ui && this.round) {
      const totals = this.round.totals();
      this.ui.setInfo(`Vous: ${totals.player} | Croupier: ${totals.dealer}`);
    }
  }
}