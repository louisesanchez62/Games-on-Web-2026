import { CardAssetLibrary } from './CardAssetLibrary.js';
import { BlackjackUI } from './BlackjackUI.js';
import { decideDealerAction } from '../../ai/DealerMonteCarloAI.js';
import { ChipWallet, BLACKJACK_BET } from '../../../../economy/ChipWallet.js';
import { showGameOverOverlay } from '../../../../ui/GameOverOverlay.js';

const DEALER_DECISION_DELAY_MS = 250;

export class BlackjackGameFlow {
  constructor(game) { 
    this.game = game; 
  }

  async start() { 
    this.game._active = true; 
    this._bindUi(); 
    this._showLoadingState(); 
    await CardAssetLibrary.load(this.game.scene); 
    if (!this.game._active) return; 
    this.game.renderer.ensureRoot(); 
    this.game.renderer.setLayout(CardAssetLibrary.getLayout()); 
    this.newRound(); 
  }

  stop() { 
    this.game._active = false; 
    this._clearPending(); 
    this.game.renderer.dispose(); 
    if (this.game.ui) { 
      this.game.ui.dispose(); 
      this.game.ui = null; 
    } 
  }

  newRound() { 
    if (ChipWallet.state.won) return this._showWonState(); 
    if (!ChipWallet.canSpend(BLACKJACK_BET)) return this._showNotEnoughState(); 
    
    this.game._currentBet = ChipWallet.spend(BLACKJACK_BET); 
    this._clearPending(); 
    this.game._state = 'player'; 
    this.game.round.startNew(); 
    this.game.renderer.clear(); 
    
    this._dealToPlayer(); 
    this._dealToDealer(); 
    this._dealToPlayer(); 
    this._dealToDealer(); 
    this._syncTable(); 
    
    if (this.game.round.player.isNatural || this.game.round.dealer.isNatural) {
      return this._finishRound('Blackjack'); 
    }
    
    this.game.ui.setStatus('Votre tour'); 
    this.game.ui.setActionEnabled(true); 
    this.game.ui.showDealButton(false); 
  }

  playerHit() { 
    if (!this.game._active || this.game._state !== 'player') return; 
    this._dealToPlayer(); 
    this._syncTable(); 
    if (this.game.round.player.total > 21) return this._finishRound('Vous avez depasse 21'); 
    if (this.game.round.player.total === 21) this.startDealerTurn(); 
  }

  playerStand() { 
    if (!this.game._active || this.game._state !== 'player') return; 
    this.startDealerTurn(); 
  }

  startDealerTurn() { 
    this.game._state = 'dealer'; 
    this.game.ui.setActionEnabled(false); 
    this.game.ui.setStatus('Croupier calcule...'); 
    this._clearPending(); 
    this.game._pendingTimeout = setTimeout(() => this._dealerDecision(), DEALER_DECISION_DELAY_MS); 
  }

  _dealerDecision() {
    if (!this.game._active || this.game._state !== 'dealer') return; 
    
    const stats = decideDealerAction({ 
      dealerHand: this.game.round.dealer.cards, 
      playerHand: this.game.round.player.cards, 
      remainingDeck: this.game.round.deck 
    }); 
    
    this.game.ui.setStatus(`Croupier: ${stats.action === 'hit' ? 'Tirer' : 'Rester'} (tirer ${stats.hit.wins}/${stats.simulations}, rester ${stats.stand.wins}/${stats.simulations})`); 
    
    if (stats.action === 'hit') { 
      this._dealToDealer(); 
      this._syncTable(); 
      return this.game.round.dealer.total > 21 ? this._finishRound('Le croupier depasse 21') : this.startDealerTurn(); 
    } 
    this._finishRound('Le croupier reste');
  }

  _finishRound(reason) {
    this.game._state = 'roundOver';
    this.game.ui.setActionEnabled(false); 
    const result = this.game.round.result(); 
    let outcome = 'Egalite'; 
    
    if (result === 'player') { 
      outcome = 'Vous gagnez!'; 
      ChipWallet.add(this.game._currentBet + 100); 
    } else if (result === 'dealer') {
      outcome = 'Le croupier gagne'; 
    } else { 
      outcome = 'Egalite - Vous recevez votre mise'; 
      ChipWallet.add(this.game._currentBet); 
    } 
    
    this.game.ui.setStatus(`${outcome} - ${reason}`); 
    this._updateTotals(); 
    
    if (ChipWallet.state.won) return this._showWonState(); 
    if (ChipWallet.state.gameOver) return this._showGameOverState(); 
    
    this.game.ui.showDealButton(true); 
  }

  _syncTable() { 
    this.game.renderer.renderHands(this.game.round.player.cards, this.game.round.dealer.cards); 
    this._updateTotals(); 
  }

  _updateTotals() {
    const totals = this.game.round.totals();
    this.game.ui.setInfo(`Vous: ${totals.player} | Croupier: ${totals.dealer}`);
  }
  
  _dealToPlayer() { return this.game.round.dealTo(this.game.round.player); }
  _dealToDealer() { return this.game.round.dealTo(this.game.round.dealer); }
  
  _clearPending() { 
    if (this.game._pendingTimeout) { 
      clearTimeout(this.game._pendingTimeout); 
      this.game._pendingTimeout = null; 
    } 
  }

  _bindUi() { 
    if (this.game.ui) return; 
    this.game.ui = new BlackjackUI(this.game.scene); 
    
    // Liaison essentielle entre l'interface utilisateur et le flux de jeu
    this.game.ui.onHit(() => this.playerHit());
    this.game.ui.onStand(() => this.playerStand());
    this.game.ui.onDeal(() => this.newRound());
  }

  _showLoadingState() { 
    this.game.ui.setStatus('Chargement des cartes...'); 
    this.game.ui.setInfo(''); 
    this.game.ui.setActionEnabled(false); 
    this.game.ui.showDealButton(false); 
  }

  _showWonState() { 
    this.game.ui.setStatus('VICTOIRE - Vous avez atteint 1000 jetons!'); 
    this.game.ui.setActionEnabled(false); 
    this.game.ui.showDealButton(false); 
    this.game._active = false; 
  }

  _showNotEnoughState() { 
    this.game.ui.setStatus('Pas assez de jetons pour jouer!'); 
    this.game.ui.setActionEnabled(false); 
  }

  _showGameOverState() { 
    this.game.ui.setStatus('GAME OVER - Vous n\'avez plus de jetons!'); 
    this.game.ui.setActionEnabled(false); 
    this.game._active = false; 
    if (!this.game._gameOverShown) { 
      this.game._gameOverShown = true; 
      showGameOverOverlay("Tu n'as plus d'argent ! Sors de mon casino."); 
    } 
  }
}