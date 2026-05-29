import { compareHands, getHandValue } from '../rules/index.js';

const DEFAULT_SIMULATIONS = 10000;
const TRAINING_LOG_SAMPLES = 5;
const TRAINING_LOGS_ENABLED = true;

const SUIT_LABELS = {
  clubs: 'C',
  diamonds: 'D',
  hearts: 'H',
  spades: 'S',
};

function formatCard(card) {
  const rank =
    card.rank === 1 ? 'A' :
    card.rank === 11 ? 'J' :
    card.rank === 12 ? 'Q' :
    card.rank === 13 ? 'K' :
    String(card.rank);
  return `${rank}${SUIT_LABELS[card.suit] ?? '?'}`;
}

function formatHand(hand) {
  return `${hand.map(formatCard).join(' ')} (${getHandValue(hand).total})`;
}

function drawRandomCard(deck) {
  const index = Math.floor(Math.random() * deck.length);
  return deck.splice(index, 1)[0];
}

function playDealerToEnd(dealerHand, deck) {
  while (getHandValue(dealerHand).total < 17 && deck.length > 0) {
    dealerHand.push(drawRandomCard(deck));
  }
}

function simulateAction(action, dealerHand, playerHand, remainingDeck, simulations) {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  const samples = [];

  for (let i = 0; i < simulations; i += 1) {
    const deck = remainingDeck.slice();
    const dealerSim = dealerHand.map((card) => ({ ...card }));

    if (action === 'hit') {
      if (deck.length === 0) {
        losses += 1;
        continue;
      }
      dealerSim.push(drawRandomCard(deck));
      if (getHandValue(dealerSim).total <= 21) {
        playDealerToEnd(dealerSim, deck);
      }
    }

    const result = compareHands(playerHand, dealerSim);
    if (result === 'dealer') wins += 1;
    else if (result === 'player') losses += 1;
    else pushes += 1;

    if (samples.length < TRAINING_LOG_SAMPLES) {
      samples.push({
        simulation: i + 1,
        action,
        dealer: formatHand(dealerSim),
        player: formatHand(playerHand),
        result,
      });
    }
  }

  return { wins, losses, pushes, samples };
}

function logTrainingDecision({ dealerHand, playerHand, remainingDeck, simulations, hit, stand, action }) {
  if (!TRAINING_LOGS_ENABLED) return;

  const rows = [
    {
      action: 'hit',
      wins: hit.wins,
      losses: hit.losses,
      pushes: hit.pushes,
      winRate: `${((hit.wins / simulations) * 100).toFixed(1)}%`,
    },
    {
      action: 'stand',
      wins: stand.wins,
      losses: stand.losses,
      pushes: stand.pushes,
      winRate: `${((stand.wins / simulations) * 100).toFixed(1)}%`,
    },
  ];

  console.groupCollapsed(
    `[Blackjack IA] Entrainement: ${simulations * 2} parties simulees, decision=${action}`
  );
  console.log('Main croupier:', formatHand(dealerHand));
  console.log('Main joueur:', formatHand(playerHand));
  console.log('Cartes inconnues restantes:', remainingDeck.length);
  console.table(rows);
  console.log('Exemples tirer:', hit.samples);
  console.log('Exemples rester:', stand.samples);
  console.groupEnd();
}

export function decideDealerAction({
  dealerHand,
  playerHand,
  remainingDeck,
  simulations = DEFAULT_SIMULATIONS,
}) {
  const hit = simulateAction('hit', dealerHand, playerHand, remainingDeck, simulations);
  const stand = simulateAction('stand', dealerHand, playerHand, remainingDeck, simulations);
  const action = hit.wins >= stand.wins ? 'hit' : 'stand';

  logTrainingDecision({ dealerHand, playerHand, remainingDeck, simulations, hit, stand, action });

  return { action, hit, stand, simulations };
}
