import { hideVictoryOverlay, showVictoryOverlay } from '../ui/VictoryOverlay.js';

const STARTING_CHIPS = 200;
const TARGET_CHIPS = 1000;

class ChipWalletStore {
  constructor() {
    this.chips = STARTING_CHIPS;
    this.maxChips = TARGET_CHIPS;
    this.listeners = new Set();
    this._victoryShown = false;
  }

  get state() {
    return {
      chips: this.chips,
      maxChips: this.maxChips,
      gameOver: this.chips <= 0,
      won: this.chips >= TARGET_CHIPS,
    };
  }

  canSpend(amount) {
    return this.chips >= amount;
  }

  spend(amount) {
    const paid = Math.max(0, Math.min(amount, this.chips));
    this.chips -= paid;
    this._emit();
    return paid;
  }

  add(amount) {
    this.chips = Math.min(TARGET_CHIPS, this.chips + Math.max(0, amount));
    this._emit();
  }

  setChips(amount) {
    this.chips = Math.max(0, Math.min(TARGET_CHIPS, Math.round(amount)));
    this._emit();
  }

  reset() {
    this.chips = STARTING_CHIPS;
    this.maxChips = TARGET_CHIPS;
    this._victoryShown = false;
    hideVictoryOverlay();
    this._emit();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  _emit() {
    const state = this.state;
    if (state.won && !this._victoryShown) {
      this._victoryShown = true;
      showVictoryOverlay();
    } else if (!state.won) {
      this._victoryShown = false;
      hideVictoryOverlay();
    }
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

export const ChipWallet = new ChipWalletStore();
export const BLACKJACK_BET = 50;
