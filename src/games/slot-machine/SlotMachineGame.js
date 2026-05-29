import { ChipWallet } from '../../economy/ChipWallet.js';
import { showGameOverOverlay } from '../../ui/GameOverOverlay.js';
import { SlotMachineUI } from './SlotMachineUI.js';

const SPIN_COST      = 20;
const JACKPOT_PAYOUT = 500;   // Triple 7
const TRIPLE_PAYOUT  = 60;    // Trois symboles identiques (hors 7)
const PAIR_PAYOUT    = 25;    // Deux symboles identiques

const JACKPOT_CHANCE = 0.12;  // 12 % → trois 7
const TRIPLE_CHANCE  = 0.45;  // 45 % → trois identiques non-7
const PAIR_CHANCE    = 0.25;  // 25 % → deux identiques (petite mise)

const SEVEN = '7️⃣';
const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '🔔', '💎'];

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

export class SlotMachineGame {
  constructor(scene, machineNode) {
    this.scene = scene;
    this.machineNode = machineNode;
    this.ui = null;
    this._gameOverShown = false;
    this._totalSpins = 0;
    this._totalWins  = 0;
  }

  start() {
    if (!this.ui) {
      this.ui = new SlotMachineUI(this.scene, SPIN_COST);
      this.ui.onSpin(() => this._spin());
    }
    this.ui.setStatus(`Misez ${SPIN_COST} jetons — Bonne chance !`);
    this.ui.setReels('🎰 | 🎰 | 🎰');
  }

  stop() {
    if (this.ui) {
      this.ui.dispose();
      this.ui = null;
    }
  }

  _spin() {
    if (!this.ui) return;
    if (!ChipWallet.canSpend(SPIN_COST)) {
      this.ui.setStatus('Pas assez de jetons !');
      return;
    }

    ChipWallet.spend(SPIN_COST);
    this._totalSpins++;

    const roll = Math.random();
    let reels, status, payout = 0;

    if (roll < JACKPOT_CHANCE) {
      // ══ JACKPOT : trois 7 ══
      reels  = [SEVEN, SEVEN, SEVEN];
      payout = JACKPOT_PAYOUT;
      status = `🏆 JACKPOT !!! +${payout} jetons !`;
      this._totalWins++;
    } else if (roll < JACKPOT_CHANCE + TRIPLE_CHANCE) {
      // ══ Triple identique (non-7) ══
      const sym = randomSymbol();
      reels  = [sym, sym, sym];
      payout = TRIPLE_PAYOUT;
      status = `🎉 Triple ${sym} ! +${payout} jetons`;
      this._totalWins++;
    } else if (roll < JACKPOT_CHANCE + TRIPLE_CHANCE + PAIR_CHANCE) {
      // ══ Paire ══
      const sym = randomSymbol();
      let third;
      do { third = randomSymbol(); } while (third === sym);
      // Place la paire au hasard dans les 3 rouleaux
      const pos = Math.floor(Math.random() * 3);
      reels = [randomSymbol(), randomSymbol(), randomSymbol()];
      reels[pos] = sym;
      reels[(pos + 1) % 3] = sym;
      reels[2] = third; // garantit pas triple
      payout = PAIR_PAYOUT;
      status = `✨ Paire ! +${payout} jetons`;
      this._totalWins++;
    } else {
      // ══ Perdu ══
      reels = [randomSymbol(), randomSymbol(), randomSymbol()];
      // S'assurer pas de triple accidentel
      while (reels[0] === reels[1] && reels[1] === reels[2]) {
        reels[2] = randomSymbol();
      }
      status = 'Pas de chance… Retente ta chance !';
    }

    if (payout > 0) ChipWallet.add(payout);

    this.ui.setReels(reels.join('  |  '));
    this.ui.setStatus(status);

    // Log d'apprentissage
    console.log(
      `[Slot Training] Spin #${this._totalSpins} | Roll: ${roll.toFixed(3)} | Résultat: ${reels.join('-')} | +${payout} | Taux victoire: ${((this._totalWins / this._totalSpins) * 100).toFixed(1)}%`
    );

    if (ChipWallet.state.gameOver && !this._gameOverShown) {
      this._gameOverShown = true;
      showGameOverOverlay("Tu n'as plus d'argent ! Sors de mon casino.");
    }
  }
}