import { GameStation } from './GameStation.js';
import { PokerGame } from '../../games/pocker/rules/PokerGame.js';

export class PokerTable extends GameStation {
  constructor(scene, tableNode, chairNodes) {
    super(scene, tableNode, chairNodes, 'POKER');
    this.game = new PokerGame(scene, tableNode);
  }

  activate(chairIndex) {
    console.log(`[Poker] chaise ${chairIndex + 1}`);
    this.game.start();
  }

  deactivate() {
    this.game.stop();
  }
}
