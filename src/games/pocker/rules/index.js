export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export const HAND_CATEGORIES = [
  'high-card',
  'pair',
  'two-pair',
  'three-of-a-kind',
  'straight',
  'flush',
  'full-house',
  'four-of-a-kind',
  'straight-flush',
];

export const STREETS = ['preflop', 'flop', 'turn', 'river', 'showdown'];

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
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

export function cardId(card) {
  return `${card.suit}:${card.rank}`;
}

export function sameCard(a, b) {
  return a.suit === b.suit && a.rank === b.rank;
}

export function removeCards(deck, cardsToRemove) {
  const blocked = new Set(cardsToRemove.map(cardId));
  return deck.filter((card) => !blocked.has(cardId(card)));
}

export function rankValue(rank) {
  return rank === 1 ? 14 : rank;
}

function rankLabel(rank) {
  if (rank === 14 || rank === 1) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}

export function formatCard(card) {
  return `${rankLabel(rankValue(card.rank))}${card.suit[0].toUpperCase()}`;
}

export function formatCards(cards) {
  return cards.map(formatCard).join(' ');
}

function compareRankLists(a, b) {
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left !== right) return left - right;
  }
  return 0;
}

function findStraightHigh(ranks) {
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);

  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    if (unique[i - 1] - unique[i] === 1) {
      run += 1;
      if (run >= 5) return unique[i - 4];
    } else {
      run = 1;
    }
  }

  return 0;
}

export function evaluateFiveCards(cards) {
  if (cards.length !== 5) {
    throw new Error(`evaluateFiveCards expects 5 cards, got ${cards.length}`);
  }

  const ranks = cards.map((card) => rankValue(card.rank)).sort((a, b) => b - a);
  const counts = new Map();
  for (const rank of ranks) {
    counts.set(rank, (counts.get(rank) ?? 0) + 1);
  }

  const groups = [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  const isFlush = cards.every((card) => card.suit === cards[0].suit);
  const straightHigh = findStraightHigh(ranks);

  let category = 0;
  let tiebreakers = ranks;

  if (isFlush && straightHigh) {
    category = 8;
    tiebreakers = [straightHigh];
  } else if (groups[0].count === 4) {
    category = 7;
    tiebreakers = [groups[0].rank, ...groups.filter((group) => group.count !== 4).map((group) => group.rank)];
  } else if (groups[0].count === 3 && groups[1]?.count === 2) {
    category = 6;
    tiebreakers = [groups[0].rank, groups[1].rank];
  } else if (isFlush) {
    category = 5;
    tiebreakers = ranks;
  } else if (straightHigh) {
    category = 4;
    tiebreakers = [straightHigh];
  } else if (groups[0].count === 3) {
    category = 3;
    tiebreakers = [
      groups[0].rank,
      ...groups.filter((group) => group.count === 1).map((group) => group.rank).sort((a, b) => b - a),
    ];
  } else if (groups[0].count === 2 && groups[1]?.count === 2) {
    category = 2;
    const pairs = groups.filter((group) => group.count === 2).map((group) => group.rank).sort((a, b) => b - a);
    const kicker = groups.find((group) => group.count === 1)?.rank ?? 0;
    tiebreakers = [...pairs, kicker];
  } else if (groups[0].count === 2) {
    category = 1;
    tiebreakers = [
      groups[0].rank,
      ...groups.filter((group) => group.count === 1).map((group) => group.rank).sort((a, b) => b - a),
    ];
  }

  return {
    category,
    name: HAND_CATEGORIES[category],
    tiebreakers,
    cards,
  };
}

function fiveCardCombinations(cards) {
  const combos = [];
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            combos.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
          }
        }
      }
    }
  }
  return combos;
}

export function compareEvaluations(a, b) {
  if (a.category !== b.category) return a.category - b.category;
  return compareRankLists(a.tiebreakers, b.tiebreakers);
}

export function evaluateBestHand(cards) {
  if (cards.length < 5) {
    throw new Error(`evaluateBestHand expects at least 5 cards, got ${cards.length}`);
  }

  let best = null;
  for (const combo of fiveCardCombinations(cards)) {
    const evaluation = evaluateFiveCards(combo);
    if (!best || compareEvaluations(evaluation, best) > 0) {
      best = evaluation;
    }
  }
  return best;
}

export function compareHoldemHands(leftHoleCards, rightHoleCards, communityCards) {
  const left = evaluateBestHand([...leftHoleCards, ...communityCards]);
  const right = evaluateBestHand([...rightHoleCards, ...communityCards]);
  return compareEvaluations(left, right);
}

export function showdown(players, communityCards) {
  const activePlayers = players.filter((player) => !player.folded);
  const evaluated = activePlayers.map((player) => ({
    player,
    evaluation: evaluateBestHand([...player.holeCards, ...communityCards]),
  }));

  let best = null;
  for (const entry of evaluated) {
    if (!best || compareEvaluations(entry.evaluation, best.evaluation) > 0) {
      best = entry;
    }
  }

  const winners = evaluated
    .filter((entry) => compareEvaluations(entry.evaluation, best.evaluation) === 0)
    .map((entry) => entry.player);

  return { winners, evaluated };
}

export function getStreetForCommunity(communityCards) {
  if (communityCards.length < 3) return 'preflop';
  if (communityCards.length === 3) return 'flop';
  if (communityCards.length === 4) return 'turn';
  if (communityCards.length === 5) return 'river';
  return 'showdown';
}
