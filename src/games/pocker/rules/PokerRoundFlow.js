import { createDeck, drawCard, shuffleDeck, showdown, getStreetForCommunity } from './index.js';

export class PokerRoundFlow {
  constructor(round) { this.round = round; }

  startNew() {
    const round = this.round;
    round.deck = shuffleDeck(createDeck());
    round.communityCards = [];
    round.pot = 0;
    round.currentBet = 0;
    round.minRaise = round.bigBlind;
    round.street = 'preflop';
    round.history = [];
    round.terminal = false;
    round.players = round.playerIds.map((id, index) => ({ id, index, stack: round.startingStack, holeCards: [], bet: 0, committed: 0, folded: false, acted: false }));
    
    for (let i = 0; i < 2; i += 1) {
      for (const player of round.players) player.holeCards.push(drawCard(round.deck));
    }
    
    const smallBlindIndex = round._nextPlayerIndex(round.dealerIndex);
    const bigBlindIndex = round._nextPlayerIndex(smallBlindIndex);
    round._postBlind(round.players[smallBlindIndex], round.smallBlind, 'small-blind');
    round._postBlind(round.players[bigBlindIndex], round.bigBlind, 'big-blind');
    round.currentPlayerIndex = round._nextPlayerIndex(bigBlindIndex);
    return round.snapshot();
  }

  legalActions(playerId = this.round.currentPlayer.id) {
    const round = this.round;
    const player = round._playerById(playerId);
    if (!player || player.folded || round.terminal) return [];
    const toCall = Math.max(0, round.currentBet - player.bet);
    const actions = toCall > 0 ? [{ type: 'fold' }, { type: 'call', amount: Math.min(toCall, player.stack) }] : [{ type: 'check', amount: 0 }];
    if (player.stack > toCall) actions.push({ type: 'raise', amount: Math.min(player.stack + player.bet, round.currentBet + round.minRaise) });
    return actions;
  }

  playerAction(playerId, action) {
    const round = this.round;
    const player = round._playerById(playerId);
    if (!player || player.folded || round.terminal) return round.snapshot();
    const normalized = typeof action === 'string' ? { type: action } : action;
    const toCall = Math.max(0, round.currentBet - player.bet);
    if (normalized.type === 'fold') player.folded = true;
    else if (normalized.type === 'check' && toCall > 0) throw new Error(`${playerId} cannot check while facing a bet`);
    else if (normalized.type === 'call') round._commit(player, Math.min(toCall, player.stack));
    else if (normalized.type === 'raise') {
      const targetBet = Math.max(normalized.amount ?? round.currentBet + round.minRaise, round.currentBet + round.minRaise);
      const previousBet = round.currentBet;
      round._commit(player, Math.min(player.stack, targetBet - player.bet));
      round.currentBet = Math.max(round.currentBet, player.bet);
      round.minRaise = Math.max(round.bigBlind, round.currentBet - previousBet);
      for (const other of round.players) if (other !== player && !other.folded) other.acted = false;
    }
    player.acted = true;
    round.history.push({ playerId, street: round.street, action: normalized.type, amount: normalized.amount ?? 0, pot: round.pot });
    round._advanceAfterAction();
    return round.snapshot();
  }

  advanceStreet() {
    const round = this.round;
    if (round.terminal) return round.snapshot();
    if (round.communityCards.length < 3) { round._burn(); round.communityCards.push(drawCard(round.deck), drawCard(round.deck), drawCard(round.deck)); }
    else if (round.communityCards.length < 5) { round._burn(); round.communityCards.push(drawCard(round.deck)); }
    else { round.street = 'showdown'; round.terminal = true; return round.snapshot(); }
    round.street = getStreetForCommunity(round.communityCards);
    round.currentBet = 0;
    round.minRaise = round.bigBlind;
    for (const player of round.players) { player.bet = 0; player.acted = player.folded || player.stack === 0; }
    round.currentPlayerIndex = round._nextActiveIndex(round.dealerIndex);
    return round.snapshot();
  }

  result() { return this.round.activePlayers.length === 1 ? { winners: this.round.activePlayers, evaluated: [] } : showdown(this.round.players, this.round.communityCards); }
}