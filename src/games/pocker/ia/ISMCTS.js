import {
  compareEvaluations,
  createDeck,
  drawCard,
  evaluateBestHand,
  formatCards,
  removeCards,
} from '../rules/index.js';
import {
  inferOpponentRange,
  removeSampledCards,
  sampleHoleCardsFromRange,
  scoreStartingHand,
} from './OpponentRanges.js';

const DEFAULT_SIMULATIONS  = 5000;
const DEFAULT_EXPLORATION  = 1.35;
const TRAINING_LOG_SAMPLES = 5;

// Seuil de force de main en dessous duquel l'IA préfère check/fold à relancer
const WEAK_HAND_THRESHOLD  = 0.42;
// Seuil intermédiaire : l'IA peut suivre mais ne relance pas
const MEDIUM_HAND_THRESHOLD = 0.58;
// Quand personne n'a misé, l'IA check plus souvent sous ce seuil
const CHECK_PREFERENCE_THRESHOLD = 0.64;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function shuffleWithRng(deck, rng) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function normalizeContext(context) {
  return {
    heroId:        context.heroId        ?? 'hero',
    heroHand:      context.heroHand      ?? [],
    communityCards:context.communityCards ?? [],
    pot:           context.pot           ?? 0,
    toCall:        context.toCall        ?? 0,
    minRaise:      context.minRaise      ?? 20,
    heroStack:     context.heroStack     ?? 1000,
    opponents:     (context.opponents ?? []).filter((o) => !o.folded),
    deadCards:     context.deadCards     ?? [],
    simulations:   context.simulations   ?? DEFAULT_SIMULATIONS,
    exploration:   context.exploration   ?? DEFAULT_EXPLORATION,
    log:           context.log           ?? true,
    rng:           context.rng           ?? Math.random,
  };
}

export function legalPokerActions(context) {
  const c = normalizeContext(context);
  const actions = [];
  const callAmount = Math.min(c.toCall, c.heroStack);

  if (c.toCall > 0) {
    actions.push({ type: 'fold', amount: 0 });
    actions.push({ type: 'call', amount: callAmount });
  } else {
    actions.push({ type: 'check', amount: 0 });
  }

  if (c.heroStack > callAmount) {
    actions.push({
      type: 'raise',
      amount: Math.min(c.heroStack, callAmount + c.minRaise),
    });
  }

  return actions;
}

function completeCommunityCards(communityCards, deck) {
  const completed = communityCards.map((c) => ({ ...c }));
  while (completed.length < 5) completed.push(drawCard(deck));
  return completed;
}

function determinizeWorld(context) {
  const known = [...context.heroHand, ...context.communityCards, ...context.deadCards];
  let deck = shuffleWithRng(removeCards(createDeck(), known), context.rng);

  const opponents = [];
  for (const opp of context.opponents) {
    const rangePercent = inferOpponentRange(opp);
    const holeCards    = sampleHoleCardsFromRange(deck, rangePercent, context.rng);
    deck = removeSampledCards(deck, holeCards);
    opponents.push({ ...opp, rangePercent, holeCards });
  }

  return {
    opponents,
    communityCards: completeCommunityCards(context.communityCards, deck),
    remainingDeck:  deck,
  };
}

function madeHandStrength(holeCards, communityCards) {
  if (communityCards.length >= 3) {
    const visible = [...holeCards, ...communityCards];
    const cards   = visible.length >= 5 ? visible : [...visible, ...holeCards].slice(0, 5);
    const ev      = evaluateBestHand(cards);
    return clamp(ev.category / 8 + ((ev.tiebreakers[0] ?? 2) / 14) * 0.08, 0, 1);
  }
  return scoreStartingHand(holeCards);
}

function opponentContinues(opponent, action, context, world) {
  if (action.type !== 'raise') return true;
  const strength = madeHandStrength(opponent.holeCards, world.communityCards);
  const callCost = Math.max(context.minRaise, action.amount - context.toCall);
  const potOdds  = callCost / Math.max(1, context.pot + action.amount + callCost);
  let p = 0.08 + strength * 0.95 - potOdds * 0.45;
  if (opponent.profile === 'tight')      p -= 0.14;
  if (opponent.profile === 'loose')      p += 0.14;
  if (opponent.profile === 'aggressive') p += 0.08;
  return context.rng() < clamp(p, 0.05, 0.98);
}

function splitPotReward({ heroInvest, pot, heroWins, tiedPlayers }) {
  if (!heroWins) return -heroInvest;
  return pot / tiedPlayers - heroInvest;
}

function rolloutAction(action, context, world) {
  if (action.type === 'fold') return -context.toCall;

  const heroInvest = action.amount ?? 0;
  const continuing = [];
  for (const opp of world.opponents) {
    if (opponentContinues(opp, action, context, world)) continuing.push(opp);
  }

  if (!continuing.length) return context.pot;

  const oppInvest = action.type === 'raise' ? heroInvest : 0;
  const pot = context.pot + heroInvest + continuing.length * oppInvest;

  const heroEval = evaluateBestHand([...context.heroHand, ...world.communityCards]);
  const oppEvals = continuing.map((opp) => ({
    opp,
    evaluation: evaluateBestHand([...opp.holeCards, ...world.communityCards]),
  }));

  let best = heroEval;
  for (const e of oppEvals) {
    if (compareEvaluations(e.evaluation, best) > 0) best = e.evaluation;
  }

  const heroComp   = compareEvaluations(heroEval, best);
  const tiedOpps   = oppEvals.filter((e) => compareEvaluations(e.evaluation, best) === 0).length;
  const heroWins   = heroComp === 0;
  const tiedPlayers = tiedOpps + (heroWins ? 1 : 0);

  return splitPotReward({ heroInvest, pot, heroWins, tiedPlayers });
}

function selectNode(nodes, totalVisits, exploration) {
  const unvisited = nodes.find((n) => n.visits === 0);
  if (unvisited) return unvisited;
  return nodes.reduce((best, node) => {
    const avg = node.totalReward / node.visits;
    const ucb = avg + exploration * Math.sqrt(Math.log(totalVisits) / node.visits);
    if (!best || ucb > best.ucb) return { node, ucb };
    return best;
  }, null).node;
}

function logTraining(context, nodes, samples, decision, handStrength) {
  if (!context.log) return;
  console.groupCollapsed(
    `[Poker IA] IS-MCTS: ${context.simulations} mondes simulés, décision=${decision.type}`
  );
  console.log('Main IA:', formatCards(context.heroHand));
  console.log('Force main:', handStrength.toFixed(2));
  console.log('Board:', context.communityCards.length ? formatCards(context.communityCards) : 'preflop');
  console.log('Pot:', context.pot, '| À payer:', context.toCall, '| Relance min:', context.minRaise);
  console.table(nodes.map((n) => ({
    action:          n.action.type,
    montant:         n.action.amount ?? 0,
    visites:         n.visits,
    rewardMoyen:     Number((n.totalReward / Math.max(1, n.visits)).toFixed(2)),
    issuesPositives: n.positiveOutcomes,
    tauxPositif:     `${((n.positiveOutcomes / Math.max(1, n.visits)) * 100).toFixed(1)}%`,
  })));
  console.log('Exemples de déterminations:', samples);
  console.groupEnd();
}

export function decidePokerAction(rawContext) {
  const context = normalizeContext(rawContext);
  if (context.heroHand.length !== 2) {
    throw new Error('decidePokerAction expects exactly 2 hero cards');
  }

  // ── Force de main pour guider la décision ──────────────────────────
  const handStrength = scoreStartingHand(context.heroHand);
  const isPreflop    = context.communityCards.length === 0;

  const actions = legalPokerActions(context);
  const nodes = actions.map((action) => ({
    action,
    visits: 0,
    totalReward: 0,
    positiveOutcomes: 0,
  }));
  const samples = [];

  for (let i = 1; i <= context.simulations; i += 1) {
    const node   = selectNode(nodes, i, context.exploration);
    const world  = determinizeWorld(context);
    const reward = rolloutAction(node.action, context, world);
    node.visits         += 1;
    node.totalReward    += reward;
    if (reward > 0) node.positiveOutcomes += 1;
    if (samples.length < TRAINING_LOG_SAMPLES) {
      samples.push({
        simulation:  i,
        actionTestée: node.action.type,
        board:       formatCards(world.communityCards),
        opponents:   world.opponents.map((o) => ({
          id:    o.id,
          range: `${Math.round(o.rangePercent * 100)}%`,
          cards: formatCards(o.holeCards),
        })),
        reward: Number(reward.toFixed(2)),
      });
    }
  }

  let bestNode = nodes.reduce((best, node) => {
    const avg     = node.totalReward / Math.max(1, node.visits);
    const bestAvg = best.totalReward / Math.max(1, best.visits);
    return avg > bestAvg ? node : best;
  }, nodes[0]);

  // ── Correction comportementale : main faible → préférer check/call ──
  if (bestNode.action.type === 'raise') {
    const shouldDowngrade =
      (isPreflop  && handStrength < WEAK_HAND_THRESHOLD) ||
      (!isPreflop && handStrength < WEAK_HAND_THRESHOLD * 0.8);

    const couldCall =
      (isPreflop  && handStrength < MEDIUM_HAND_THRESHOLD) ||
      (!isPreflop && handStrength < MEDIUM_HAND_THRESHOLD * 0.85);

    const shouldCheck =
      context.toCall === 0 &&
      ((isPreflop  && handStrength < CHECK_PREFERENCE_THRESHOLD) ||
       (!isPreflop && handStrength < CHECK_PREFERENCE_THRESHOLD * 0.9));

    if (shouldDowngrade) {
      // Main vraiment faible → check ou fold
      const checkNode = nodes.find((n) => n.action.type === 'check');
      const foldNode  = nodes.find((n) => n.action.type === 'fold');
      bestNode = checkNode ?? foldNode ?? bestNode;
      if (context.log) {
        console.log(
          `[Poker IA] Main faible (${handStrength.toFixed(2)}) → override raise → ${bestNode.action.type}`
        );
      }
    } else if (shouldCheck) {
      const checkNode = nodes.find((n) => n.action.type === 'check');
      if (checkNode) {
        bestNode = checkNode;
        if (context.log) {
          console.log(
            `[Poker IA] Main moyenne (${handStrength.toFixed(2)}) → override raise → check`
          );
        }
      }
    } else if (couldCall && context.toCall > 0) {
      // Main moyenne face à une mise → appeler plutôt que relancer
      const callNode = nodes.find((n) => n.action.type === 'call');
      if (callNode) {
        bestNode = callNode;
        if (context.log) {
          console.log(
            `[Poker IA] Main moyenne (${handStrength.toFixed(2)}) → override raise → call`
          );
        }
      }
    }
  }

  const decision = {
    action: bestNode.action,
    actions: nodes.map((n) => ({
      ...n.action,
      visits:          n.visits,
      averageReward:   n.totalReward / Math.max(1, n.visits),
      positiveOutcomes: n.positiveOutcomes,
    })),
    simulations: context.simulations,
    handStrength,
  };

  logTraining(context, nodes, samples, bestNode.action, handStrength);
  return decision;
}