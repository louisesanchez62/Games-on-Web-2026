import {
  createDeck,
  shuffleDeck,
  drawCard,
  compareHands,
} from '../index.js';
import { Hand } from './Hand.js';

export class BlackjackRound {
  constructor() {
    this.deck = [];
    this.player = new Hand('player');
    this.dealer = new Hand('dealer');
  }

  startNew() {
    this.deck = shuffleDeck(createDeck());
    this.player.reset();
    this.dealer.reset();
  }

  dealTo(hand) {
    const card = drawCard(this.deck);
    hand.add(card);
    return card;
  }

  totals() {
    return {
      player: this.player.total,
      dealer: this.dealer.total,
    };
  }

  result() {
    return compareHands(this.player.cards, this.dealer.cards);
  }
}
