export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function drawCard(deck) {
  if (!deck.length) {
    throw new Error('Deck is empty');
  }
  return deck.pop();
}

export function getCardValue(card) {
  if (card.rank === 1) return 11;
  if (card.rank >= 10) return 10;
  return card.rank;
}

export function getHandValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += getCardValue(card);
    if (card.rank === 1) aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, isSoft: aces > 0 };
}

export function isBlackjack(hand) {
  return hand.length === 2 && getHandValue(hand).total === 21;
}

export function compareHands(playerHand, dealerHand) {
  const playerTotal = getHandValue(playerHand).total;
  const dealerTotal = getHandValue(dealerHand).total;

  if (playerTotal > 21) return 'dealer';
  if (dealerTotal > 21) return 'player';
  if (playerTotal > dealerTotal) return 'player';
  if (dealerTotal > playerTotal) return 'dealer';
  return 'push';
}
