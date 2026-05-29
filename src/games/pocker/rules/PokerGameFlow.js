import { CardAssetLibrary } from '../../black-jack/rules/game/CardAssetLibrary.js';
import { decidePokerAction } from '../ia/ISMCTS.js';
import { ChipWallet } from '../../../economy/ChipWallet.js';
import { showGameOverOverlay } from '../../../ui/GameOverOverlay.js';
import { PokerUI } from './game/PokerUI.js';
import { PokerRound } from './PokerRound.js';

const HERO_ID = 'vous';
const MAX_OPPONENTS = 6;
const AI_DECISION_DELAY_MS = 220;
const AI_SIMULATIONS = 600;
const POKER_STARTING_STACK = 200;
const SMALL_BLIND = 5;
const BIG_BLIND = 10;
const AI_PROFILES = ['tight', 'aggressive', 'loose', 'standard', 'tight', 'aggressive'];

function clampOpponentCount(count) { return Math.max(1, Math.min(MAX_OPPONENTS, count)); }
function streetLabel(street) { return ({ preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' }[street] ?? street); }
function actionLabel(action) { return action.type === 'fold' ? 'se couche' : action.type === 'check' ? 'check' : action.type === 'call' ? `suit ${action.amount}` : action.type === 'raise' ? `relance a ${action.amount}` : action.type; }
function actionLogLabel(entry) { const amount = entry.amount ?? 0; if (entry.action === 'fold') return `${entry.playerId} se couche`; if (entry.action === 'check') return `${entry.playerId} check`; if (entry.action === 'call') return `${entry.playerId} suit ${amount} jetons`; if (entry.action === 'raise') return `${entry.playerId} relance ${amount} jetons`; if (entry.action === 'small-blind') return `${entry.playerId} mise SB ${amount} jetons`; if (entry.action === 'big-blind') return `${entry.playerId} mise BB ${amount} jetons`; return `${entry.playerId} ${entry.action} ${amount} jetons`; }

const HAND_LABELS = {
  'high-card': 'une carte haute',
  'pair': 'une paire',
  'two-pair': 'deux paires',
  'three-of-a-kind': 'un brelan',
  'straight': 'une suite',
  'flush': 'une couleur',
  'full-house': 'un full',
  'four-of-a-kind': 'un carre',
  'straight-flush': 'une quinte flush',
};

function winnerDisplayName(playerId) { return playerId === HERO_ID ? 'Vous' : playerId; }
function joinNames(names) { if (names.length <= 1) return names[0] ?? ''; if (names.length === 2) return `${names[0]} et ${names[1]}`; return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`; }
function winnerEvaluation(result) { if (!result?.evaluated?.length) return null; const winnerIds = new Set(result.winners.map((winner) => winner.id)); const match = result.evaluated.find((entry) => winnerIds.has(entry.player.id)); return match?.evaluation ?? null; }
function formatWinReason(result) { const evaluation = winnerEvaluation(result); if (!evaluation) return 'car les autres se couchent'; const label = HAND_LABELS[evaluation.name] ?? evaluation.name; return `avec ${label}`; }

export class PokerGameFlow {
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
    this.game.renderer.clear(); 
    this._showReadyState(); 
    this.setOpponentCount(2);
  }

  stop() { this.game._active = false; this._clearPending(); this.game.renderer.dispose(); if (this.game.ui) { this.game.ui.dispose(); this.game.ui = null; } }
  setOpponentCount(count) { this.game.opponentCount = clampOpponentCount(count); if (this.game.ui) { this.game.ui.setOpponentCount(this.game.opponentCount); this.game.ui.setSelectorEnabled(false); this.game.ui.setSelectorVisible(false); this.game.ui.setActionsVisible(true); this.game.ui.setStatus(`Main lancee contre ${this.game.opponentCount} IA`); } this.newRound(); }
  
  newRound() { 
    this._clearPending(); 
    if (ChipWallet.state.won) return this._showWonState(); 
    const playerIds = [HERO_ID, ...Array.from({ length: this.game.opponentCount }, (_, index) => `IA ${index + 1}`)]; 
    this.game.round = new PokerRound({ playerIds, startingStack: POKER_STARTING_STACK, smallBlind: SMALL_BLIND, bigBlind: BIG_BLIND }); 
    this.game.round.startNew(); 
    this._applyHeroStackDelta(POKER_STARTING_STACK); 
    this.game.ui.setSelectorEnabled(false); 
    this.game.ui.setSelectorVisible(false); 
    this.game.ui.setActionsVisible(true); 
    this.game.ui.setNewRoundEnabled(false); 
    this._syncView(); 
    this._driveAITurns(); 
  }

  playerAction(type) { this._heroAction((actions) => actions.find((candidate) => candidate.type === type)); }
  playerCallOrCheck() { this._heroAction((actions) => actions.find((candidate) => candidate.type === 'check') ?? actions.find((candidate) => candidate.type === 'call')); }
  playerRaise() { this._heroAction((actions) => actions.find((candidate) => candidate.type === 'raise')); }
  
  playerAllIn() { 
    if (!this._canHeroAct()) return; 
    const hero = this._getHero(); 
    if (!hero || hero.stack <= 0) return; 
    const heroBefore = hero.stack;
    const action = { type: 'raise', amount: Math.max(this.game.round.currentBet + this.game.round.minRaise, hero.stack + hero.bet) }; 
    this.game.round.playerAction(HERO_ID, action); 
    this._applyHeroStackDelta(heroBefore); 
    this._syncView('Vous TAPIS!'); 
    this._driveAITurns(); 
  }

_heroAction(selector) {
  if (!this._canHeroAct()) return;

  const heroBefore = this._getHeroStack();
  const action = selector(this.game.round.legalActions(HERO_ID));

  if (!action) return;

  this.game.round.playerAction(HERO_ID, action);
  this._applyHeroStackDelta(heroBefore);
  this._syncView(`Vous ${actionLabel(action)}`);
  this._driveAITurns();
}

_driveAITurns() {
  if (!this.game._active || !this.game.round) return;

  if (this.game.round.terminal) {
    return this._finishRound();
  }

  const current = this.game.round.currentPlayer;

  if (!current || current.id === HERO_ID) {
    return this._syncView();
  }

  this.game.ui.setActionButtons([]);
  this.game.ui.setStatus(`${current.id} reflechit...`);

  this.game._pendingTimeout = setTimeout(() => {
    this.game._pendingTimeout = null;

    const decision = decidePokerAction(
      this._buildAIContext(current)
    );

    const action = this._coerceLegalAction(
      current,
      decision.action
    );

    this.game.round.playerAction(current.id, action);

    this._syncView(
      `${current.id} ${actionLabel(action)}`
    );

    this._driveAITurns();
  }, AI_DECISION_DELAY_MS);
}

_finishRound() {
  if (!this.game.round || !this.game.ui) return;

  this.game.renderer.render({
    heroCards: this._getHero()?.holeCards ?? [],
    communityCards: this.game.round.communityCards,
    opponentHands: this._visibleOpponentHands(true)
  });

  const result = this.game.round.result();

  const winnerIds = result.winners.map(
    (player) => player.id
  );

  const heroWon = winnerIds.includes(
    HERO_ID
  );

  if (heroWon) {
    const winnerCount = Math.max(
      1,
      result.winners.length
    );

    const heroShare = Math.floor(
      this.game.round.pot /
        winnerCount
    );

    if (heroShare > 0) {
      ChipWallet.add(heroShare);
    }
  }

  if (ChipWallet.state.won) {
    return this._showWonState();
  }

  if (ChipWallet.state.gameOver) {
    return this._showGameOverState();
  }

  const winnerNames = joinNames(
    winnerIds.map(winnerDisplayName)
  );

  const verb = winnerIds.length > 1
    ? 'gagnent'
    : heroWon
      ? 'gagnez'
      : 'gagne';

  const reason = formatWinReason(
    result
  );

  this.game.ui.setTopBar(
    streetLabel(this.game.round.street),
    this.game.round.pot
  );

  this.game.ui.setStatus(
    `${winnerNames} ${verb} ${reason}`
  );

  this.game.ui.setNewRoundEnabled(true);
  this.game.ui.setActionButtons([]);
  this.game.ui.setSelectorVisible(false);
  this.game.ui.setActionsVisible(true);
}

_syncView(lastAction = '') {
  if (!this.game.round || !this.game.ui) return;

  const hero = this._getHero();

  this.game.renderer.render({
    heroCards: hero?.holeCards ?? [],
    communityCards: this.game.round.communityCards,
    opponentHands: this._visibleOpponentHands()
  });

  const toCall = hero
    ? Math.max(0, this.game.round.currentBet - hero.bet)
    : 0;

  const actions =
    this.game.round.currentPlayer?.id === HERO_ID &&
    !this.game.round.terminal
      ? this.game.round.legalActions(HERO_ID)
      : [];

  const actionLog = this.game.round.history
    .filter(
      (entry) =>
        entry.action !== 'small-blind' &&
        entry.action !== 'big-blind'
    )
    .slice(-4)
    .map(actionLogLabel)
    .join(' | ');

  this.game.ui.setStatus(
    lastAction ||
      `${streetLabel(this.game.round.street)} | Pot: ${this.game.round.pot} | A payer: ${toCall}`
  );

  this.game.ui.setInfo(
    actionLog
      ? `Actions: ${actionLog}`
      : 'Actions: en attente'
  );

  this.game.ui.setActionButtons(actions, toCall);
}

_buildAIContext(player) {
  return {
    heroId: player.id,
    heroHand: player.holeCards,
    communityCards: this.game.round.communityCards,
    pot: this.game.round.pot,
    toCall: Math.max(
      0,
      this.game.round.currentBet - player.bet
    ),
    minRaise: this.game.round.minRaise,
    heroStack: player.stack,

    opponents: this.game.round.players
      .filter(
        (candidate) =>
          candidate.id !== player.id &&
          !candidate.folded
      )
      .map((candidate) => ({
        id: candidate.id,
        profile:
          candidate.id === HERO_ID
            ? 'standard'
            : AI_PROFILES[
                (candidate.index - 1) %
                  AI_PROFILES.length
              ],

        actions: this.game.round.history.filter(
          (entry) =>
            entry.playerId === candidate.id
        ),

        folded: candidate.folded
      })),

    simulations: AI_SIMULATIONS,
    log: true
  };
}

_coerceLegalAction(player, action) {
  const legal = this.game.round.legalActions(
    player.id
  );

  const sameType = legal.find(
    (candidate) =>
      candidate.type === action.type
  );

  return sameType
    ? sameType.type === 'raise'
      ? {
          ...sameType,
          amount: action.amount
        }
      : sameType
    : legal.find(
        (candidate) =>
          candidate.type === 'check'
      ) ??
        legal.find(
          (candidate) =>
            candidate.type === 'call'
        ) ??
        legal.find(
          (candidate) =>
            candidate.type === 'fold'
        ) ?? {
          type: 'check',
          amount: 0
        };
}

_visibleOpponentHands(revealed = false) {
  return this.game.round.players
    .filter(
      (player) =>
        player.id !== HERO_ID
    )
    .map((player) => ({
      id: player.id,
      folded: player.folded,
      cards: player.holeCards,
      revealed
    }));
}

_getHero() {
  return this.game.round?.players.find(
    (player) =>
      player.id === HERO_ID
  );
}

_getHeroStack() {
  return (
    this._getHero()?.stack ??
    POKER_STARTING_STACK
  );
}

_applyHeroStackDelta(beforeStack) {
  const hero = this._getHero();

  if (!hero) return;

  const spent = Math.max(
    0,
    beforeStack - hero.stack
  );

  if (spent > 0) {
    ChipWallet.spend(spent);
  }
}

_canHeroAct() {
  return (
    this.game._active &&
    this.game.round &&
    !this.game.round.terminal &&
    this.game.round.currentPlayer?.id === HERO_ID
  );
}

_clearPending() {
  if (this.game._pendingTimeout) {
    clearTimeout(this.game._pendingTimeout);
    this.game._pendingTimeout = null;
  }
}

_bindUi() {
  if (this.game.ui) return;

  this.game.ui = new PokerUI(this.game.scene);

  this.game.ui.onOpponentCount((count) =>
    this.setOpponentCount(count)
  );

  this.game.ui.onNewRound(() =>
    this.newRound()
  );

  this.game.ui.onFold(() =>
    this.playerAction('fold')
  );

  this.game.ui.onCallOrCheck(() =>
    this.playerCallOrCheck()
  );

  this.game.ui.onRaise(() =>
    this.playerRaise()
  );

  this.game.ui.onAllIn(() =>
    this.playerAllIn()
  );
}

_showLoadingState() {
  this.game.ui.setStatus(
    'Chargement de la table de poker...'
  );

  this.game.ui.setInfo('');
  this.game.ui.setOpponentCount(
    this.game.opponentCount
  );

  this.game.ui.setSelectorVisible(false);
  this.game.ui.setActionsVisible(false);
  this.game.ui.setSelectorEnabled(false);
  this.game.ui.setNewRoundEnabled(false);
  this.game.ui.setActionButtons([]);
}

_showReadyState() {
  this.game.ui.setStatus(
    'Table de poker'
  );

  this.game.ui.setInfo(
    'Partie automatique contre 2 IA.'
  );

  this.game.ui.setSelectorEnabled(false);
  this.game.ui.setSelectorVisible(false);
}

_showWonState() {
  this.game.ui.setStatus(
    'VICTOIRE - Vous avez atteint 1000 jetons!'
  );

  this.game.ui.setActionButtons([]);
  this.game.ui.setNewRoundEnabled(false);
  this.game.ui.setActionsVisible(true);

  this.game._active = false;
}

_showGameOverState() {
  this.game.ui.setStatus(
    'GAME OVER - Vous avez perdu tous vos jetons!'
  );

  this.game.ui.setActionButtons([]);
  this.game.ui.setNewRoundEnabled(false);

  this.game._active = false;

  if (!this.game._gameOverShown) {
    this.game._gameOverShown = true;

    showGameOverOverlay(
      "Tu n'as plus d'argent ! Sors de mon casino."
    );
  }
}
}