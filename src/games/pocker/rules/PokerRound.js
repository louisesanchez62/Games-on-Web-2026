import { drawCard, getStreetForCommunity, showdown } from './index.js';
import { PokerRoundFlow } from './PokerRoundFlow.js';

export class PokerRound {
  constructor({ playerIds = ['hero', 'opponentA', 'opponentB'], startingStack = 1000, smallBlind = 10, bigBlind = 20, dealerIndex = 0 } = {}) {
    this.playerIds = playerIds;
    this.startingStack = startingStack;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.dealerIndex = dealerIndex;
    this.players = [];
    this.communityCards = [];
    this.deck = [];
    this.pot = 0;
    this.currentBet = 0;
    this.minRaise = bigBlind;
    this.currentPlayerIndex = 0;
    this.street = 'preflop';
    this.history = [];
    this.terminal = false;
    this.flow = new PokerRoundFlow(this);
  }

  startNew() { return this.flow.startNew(); }
  legalActions(playerId = this.currentPlayer.id) { return this.flow.legalActions(playerId); }
  playerAction(playerId, action) { return this.flow.playerAction(playerId, action); }
  advanceStreet() { return this.flow.advanceStreet(); }
  result() { return this.flow.result(); }
  
  snapshot() { return { players: this.players.map((player) => ({ ...player, holeCards: player.holeCards.map((card) => ({ ...card })) })), communityCards: this.communityCards.map((card) => ({ ...card })), pot: this.pot, currentBet: this.currentBet, minRaise: this.minRaise, currentPlayerIndex: this.currentPlayerIndex, street: this.street, history: this.history.map((entry) => ({ ...entry })), terminal: this.terminal }; }
  get currentPlayer() { return this.players[this.currentPlayerIndex]; }
  get activePlayers() { return this.players.filter((player) => !player.folded); }

  _advanceAfterAction() { if (this.activePlayers.length <= 1) { this.terminal = true; return; } if (this._bettingRoundComplete()) return this.advanceStreet(); this.currentPlayerIndex = this._nextActiveIndex(this.currentPlayerIndex); }
  _bettingRoundComplete() { return this.players.filter((player) => !player.folded).every((player) => player.stack === 0 || (player.acted && player.bet === this.currentBet)); }
  _postBlind(player, amount, action) { this._commit(player, Math.min(amount, player.stack)); this.currentBet = Math.max(this.currentBet, player.bet); this.history.push({ playerId: player.id, street: this.street, action, amount, pot: this.pot }); }
  _commit(player, amount) { const paid = Math.max(0, Math.min(amount, player.stack)); player.stack -= paid; player.bet += paid; player.committed += paid; this.pot += paid; return paid; }
  _burn() { drawCard(this.deck); }
  _nextPlayerIndex(index) { return (index + 1) % this.players.length; }
  _nextActiveIndex(index) { let next = this._nextPlayerIndex(index); for (let checked = 0; checked < this.players.length; checked += 1) { if (!this.players[next].folded && this.players[next].stack > 0) return next; next = this._nextPlayerIndex(next); } return index; }
  _playerById(playerId) { return this.players.find((player) => player.id === playerId); }
}