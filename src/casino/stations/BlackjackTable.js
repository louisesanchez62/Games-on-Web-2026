import { GameStation } from './GameStation.js';
import { BlackjackGame } from '../../games/black-jack/rules/BlackjackGame.js';

export class BlackjackTable extends GameStation {
  constructor(scene, tableNode, chairNodes) {
    super(scene, tableNode, chairNodes, 'BLACKJACK');
    this.game = new BlackjackGame(scene, tableNode);
  }

  activate(chairIndex) {
    console.log(`[Blackjack] chaise ${chairIndex + 1}`);
    this.game.start();
  }

  deactivate() {
    this.game.stop();
  }
}