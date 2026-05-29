import { cardId, rankValue } from '../rules/index.js';

const ACTION_RANGE_HINTS = [
  { pattern: /all[-_\s]?in|3bet|fourbet|reraise|surrelance/, rangePercent: 0.08 },
  { pattern: /raise|bet|relance|mise/, rangePercent: 0.18 },
  { pattern: /call|follow|suit|paye/, rangePercent: 0.55 },
  { pattern: /check|passive|parole/, rangePercent: 0.85 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function scoreStartingHand(holeCards) {
  if (holeCards.length !== 2) {
    throw new Error(`scoreStartingHand expects 2 cards, got ${holeCards.length}`);
  }

  const [left, right] = holeCards;
  const high = Math.max(rankValue(left.rank), rankValue(right.rank));
  const low = Math.min(rankValue(left.rank), rankValue(right.rank));
  const suited = left.suit === right.suit;
  const gap = high - low;
  const isPair = high === low;
  const isBroadway = high >= 10 && low >= 10;

  if (isPair) {
    return clamp(0.55 + (high / 14) * 0.42, 0, 1);
  }

  let score = 0.12;
  score += (high / 14) * 0.34;
  score += (low / 14) * 0.2;
  if (suited) score += 0.1;
  if (gap === 1) score += 0.09;
  else if (gap === 2) score += 0.05;
  else if (gap > 4) score -= 0.08;
  if (isBroadway) score += 0.08;
  if (high === 14) score += 0.06;

  return clamp(score, 0, 1);
}

export function inferOpponentRange(opponent = {}) {
  if (Number.isFinite(opponent.rangePercent)) {
    return clamp(opponent.rangePercent, 0.02, 1);
  }

  const actions = opponent.actions ?? opponent.history ?? [];
  let rangePercent = 1;

  for (const entry of actions) {
    const action = String(entry.action ?? entry).toLowerCase();
    for (const hint of ACTION_RANGE_HINTS) {
      if (hint.pattern.test(action)) {
        rangePercent = Math.min(rangePercent, hint.rangePercent);
        break;
      }
    }
  }

  if (opponent.profile === 'tight') rangePercent *= 0.75;
  if (opponent.profile === 'loose') rangePercent *= 1.25;
  if (opponent.profile === 'aggressive') rangePercent *= 0.85;

  return clamp(rangePercent, 0.02, 1);
}

export function listStartingHandCombos(deck) {
  const combos = [];
  for (let i = 0; i < deck.length - 1; i += 1) {
    for (let j = i + 1; j < deck.length; j += 1) {
      const cards = [deck[i], deck[j]];
      combos.push({
        cards,
        score: scoreStartingHand(cards),
      });
    }
  }
  return combos.sort((a, b) => b.score - a.score);
}

export function sampleHoleCardsFromRange(deck, rangePercent, rng = Math.random) {
  const combos = listStartingHandCombos(deck);
  if (!combos.length) {
    throw new Error('Cannot sample opponent hole cards from an empty deck');
  }

  const poolSize = Math.max(1, Math.ceil(combos.length * clamp(rangePercent, 0.02, 1)));
  const pool = combos.slice(0, poolSize);
  const totalWeight = pool.reduce((sum, combo) => sum + combo.score ** 3 + 0.01, 0);
  let cursor = rng() * totalWeight;

  for (const combo of pool) {
    cursor -= combo.score ** 3 + 0.01;
    if (cursor <= 0) {
      return combo.cards.map((card) => ({ ...card }));
    }
  }

  return pool[pool.length - 1].cards.map((card) => ({ ...card }));
}

export function removeSampledCards(deck, sampledCards) {
  const sampledIds = new Set(sampledCards.map(cardId));
  return deck.filter((card) => !sampledIds.has(cardId(card)));
}
