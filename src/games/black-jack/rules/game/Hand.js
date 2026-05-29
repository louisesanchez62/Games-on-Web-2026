import { getHandValue, isBlackjack } from '../index.js';

export class Hand {
  constructor(label) {
    this.label = label;
    this.cards = [];
  }

  reset() {
    this.cards = [];
  }

  add(card) {
    this.cards.push(card);
    return card;
  }

  get total() {
    return getHandValue(this.cards).total;
  }

  get isNatural() {
    return isBlackjack(this.cards);
  }
}
