import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CITIES, FACTIONS, ALL_CITY_IDS } from './data';
import {
  applyEndOfRoundGrowth,
  calculateAchievementScore,
  calculateVictoryRank,
  canUseFireAttack,
  checkLuBuAppearance,
  countTerritories,
  createInitialCities,
  createInitialGameState,
  executeFireAttack,
  executeMarchOrTransport,
  executeRecruit,
  formatEliminationRewardMessage,
  getCombatForecast,
  getDefenseMultiplier,
  getFireApCost,
  getFireDamageRange,
  getFireLossRate,
  getRecruitAmount,
  getSendTroops,
  hasDefeatedLuBu,
  isMajorEliminationReward,
  planAiAction,
  reserveVictoryBonusAp,
  resolveCombat,
  resolveNextPlayerTurnAp,
  rollFireOutcome,
  triggerThreeTurnEvent,
} from './engine';
import type { CityId } from './types';

test('15 cities data matches exact count, coordinates, and symmetric adjacency', () => {
  assert.equal(INITIAL_CITIES.length, 15);
  assert.equal(ALL_CITY_IDS.length, 15);

  const cities = createInitialCities();
  for (const id of ALL_CITY_IDS) {
    const city = cities[id];
    assert.ok(city, `City ${id} exists`);
    for (const adjId of city.adjacent) {
      assert.ok(
        cities[adjId].adjacent.includes(id),
        `Adjacency must be symmetric between ${id} and ${adjId}`
      );
    }
  }

  // Spot check key coordinates and starting setups
  assert.deepEqual([cities.chengdu.x, cities.chengdu.y, cities.chengdu.owner, cities.chengdu.troops], [150, 390, 'shu', 70]);
  assert.deepEqual([cities.xuchang.x, cities.xuchang.y, cities.xuchang.owner, cities.xuchang.troops], [490, 255, 'wei', 70]);
  assert.deepEqual([cities.jianye.x, cities.jianye.y, cities.jianye.owner, cities.jianye.troops], [665, 345, 'wu', 70]);
  assert.equal(cities.luoyang.isImperial, true);
  assert.equal(cities.changsha.y, 465);
  assert.equal(cities.kuaiji.y, 455);
});

test('faction traits apply properly to recruit, attack, defense, and Luoyang imperial bonus', () => {
  assert.equal(getRecruitAmount('shu'), 44); // 35 * 1.25 = 43.75 -> 44
  assert.equal(getRecruitAmount('wei'), 35);
  assert.equal(getRecruitAmount('wu'), 35);
  assert.equal(getRecruitAmount('lubu'), 40); // 35 * 1.15 = 40.25 -> 40

  assert.equal(FACTIONS.wei.attackMult, 1.15);
  assert.equal(FACTIONS.wu.defenseMult, 1.2);
  assert.equal(FACTIONS.lubu.attackMult, 1.35);
  assert.equal(FACTIONS.lubu.defenseMult, 1.1);

  // Luoyang adds +10% defense (Wu +20% + Luoyang +10% = +30%)
  assert.ok(Math.abs(getDefenseMultiplier('wu', false) - 1.2) < 1e-6);
  assert.ok(Math.abs(getDefenseMultiplier('wu', true) - 1.3) < 1e-6);
  assert.ok(Math.abs(getDefenseMultiplier('neutral', true) - 1.1) < 1e-6);

  const cities = createInitialCities();
  const rec = executeRecruit(cities, 'chengdu');
  assert.equal(rec.gained, 44);
  assert.equal(rec.cities.chengdu.troops, 114);
});

test('march enforces minimum 5 remaining troops and ratio toggles', () => {
  assert.equal(getSendTroops(5, 0.95), 0);
  assert.equal(getSendTroops(6, 0.5), 1); // 6 - 5 = 1 max
  assert.equal(getSendTroops(100, 0.5), 50);
  assert.equal(getSendTroops(100, 0.8), 80);
  assert.equal(getSendTroops(100, 0.95), 95);
  assert.equal(getSendTroops(20, 0.95), 15); // 20 - 5 = 15 max

  const cities = createInitialCities();
  const transport = executeMarchOrTransport(cities, 'chengdu', 'jiangling', 0.5);
  assert.ok(transport);
  assert.equal(transport.kind, 'transport');
  assert.equal(transport.sentTroops, 35);
  assert.equal(transport.cities.chengdu.troops, 35);
  assert.equal(transport.cities.jiangling.troops, 90);
});

test('combat formula and forecast work deterministically', () => {
  const cities = createInitialCities();
  // Wei attacks neutral luoyang with 100 troops (expected atk 115 vs def 75*1.1=82.5 -> ratio ~1.39 => 우세)
  cities.xuchang.troops = 125;
  assert.equal(getCombatForecast(cities.xuchang, cities.luoyang, 0.8), '우세');

  // With rng() = 0.5 -> randomFactor = 1.0
  const result = resolveCombat('xuchang', 'wei', 100, cities.luoyang, () => 0.5);
  assert.equal(result.attackerWon, true);
  assert.ok(Math.abs(result.attackPower - 115) < 1e-6);
  assert.ok(Math.abs(result.defensePower - 82.5) < 1e-6);
  assert.equal(result.remainingTroops, Math.round(100 * ((115 - 82.5) / 115)));

  // Weak attack loses
  const loss = resolveCombat('xuchang', 'shu', 40, cities.luoyang, () => 0.5);
  assert.equal(loss.attackerWon, false);
  assert.ok(loss.remainingTroops >= 1 && loss.remainingTroops < 75);
});

test('Fire attack rolls minor (30%, -20%) / normal (70%, -30%) with no great fire on normal turns, and normal (70%, -40%) / great (30%, -55%) during Southeast Wind', () => {
  // Damage range helper
  assert.deepEqual(getFireDamageRange(0), { minRate: 0.2, maxRate: 0.3, minPct: 20, maxPct: 30 });
  assert.deepEqual(getFireDamageRange(0.1), { minRate: 0.4, maxRate: 0.55, minPct: 40, maxPct: 55 });

  // Normal turn exact boundary checks: [0, 0.30) minor 20%, [0.30, 1) normal 30% (great never triggers)
  assert.deepEqual(rollFireOutcome(0, () => 0.0), { grade: 'minor', lossRate: 0.2 });
  assert.deepEqual(rollFireOutcome(0, () => 0.2999), { grade: 'minor', lossRate: 0.2 });
  assert.deepEqual(rollFireOutcome(0, () => 0.3), { grade: 'normal', lossRate: 0.3 });
  assert.deepEqual(rollFireOutcome(0, () => 0.8), { grade: 'normal', lossRate: 0.3 });
  assert.deepEqual(rollFireOutcome(0, () => 0.9999), { grade: 'normal', lossRate: 0.3 });

  // Southeast Wind (+10%p): minor excluded (0%), [0, 0.70) normal 40%, [0.70, 1) great 55%
  assert.deepEqual(rollFireOutcome(0.1, () => 0.0), { grade: 'normal', lossRate: 0.4 });
  assert.deepEqual(rollFireOutcome(0.1, () => 0.01), { grade: 'normal', lossRate: 0.4 });
  assert.deepEqual(rollFireOutcome(0.1, () => 0.6999), { grade: 'normal', lossRate: 0.4 });
  assert.deepEqual(rollFireOutcome(0.1, () => 0.7), { grade: 'great', lossRate: 0.55 });
  assert.deepEqual(rollFireOutcome(0.1, () => 0.9999), { grade: 'great', lossRate: 0.55 });

  // executeFireAttack applies rolled grade & troop loss accurately (hanzhong = 50 troops)
  const cities = createInitialCities();

  const minorRes = executeFireAttack(cities, 'chengdu', 'hanzhong', 0, () => 0.1);
  assert.ok(minorRes);
  assert.equal(minorRes.grade, 'minor');
  assert.equal(minorRes.lossRate, 0.2);
  assert.equal(minorRes.troopsLost, 10); // round(50 * 0.20) = 10
  assert.equal(minorRes.cities.hanzhong.troops, 40);

  const normalRes = executeFireAttack(cities, 'chengdu', 'hanzhong', 0, () => 0.5);
  assert.ok(normalRes);
  assert.equal(normalRes.grade, 'normal');
  assert.equal(normalRes.lossRate, 0.3);
  assert.equal(normalRes.troopsLost, 15); // round(50 * 0.30) = 15
  assert.equal(normalRes.cities.hanzhong.troops, 35);

  // Even near 1.0 (0.999) on a normal turn, great fire never triggers — stays normal 30%
  const highNormalRes = executeFireAttack(cities, 'chengdu', 'hanzhong', 0, () => 0.999);
  assert.ok(highNormalRes);
  assert.equal(highNormalRes.grade, 'normal');
  assert.equal(highNormalRes.lossRate, 0.3);
  assert.equal(highNormalRes.troopsLost, 15);
  assert.equal(highNormalRes.cities.hanzhong.troops, 35);

  // Southeast Wind with rng near 0.0 -> never minor, yields normal 40%
  const windNormal = executeFireAttack(cities, 'chengdu', 'hanzhong', 0.1, () => 0.001);
  assert.ok(windNormal);
  assert.equal(windNormal.grade, 'normal');
  assert.equal(windNormal.lossRate, 0.4);
  assert.equal(windNormal.troopsLost, 20); // round(50 * 0.40) = 20
  assert.equal(windNormal.cities.hanzhong.troops, 30);

  // Southeast Wind with rng >= 0.7 -> great 55%
  const windGreat = executeFireAttack(cities, 'chengdu', 'hanzhong', 0.1, () => 0.75);
  assert.ok(windGreat);
  assert.equal(windGreat.grade, 'great');
  assert.equal(windGreat.lossRate, 0.55);
  assert.equal(windGreat.troopsLost, 28); // round(50 * 0.55) = 28
  assert.equal(windGreat.cities.hanzhong.troops, 22);

  // Cannot fire attack friendly city
  assert.equal(executeFireAttack(cities, 'chengdu', 'jiangling', 0, () => 0.5), null);
});

test('end of round growth grants +20 at Luoyang for non-neutral owner and small neutral replenish', () => {
  const cities = createInitialCities();
  cities.luoyang.owner = 'shu';
  cities.luoyang.troops = 50;
  cities.beiping.troops = 45;

  const { cities: next, luoyangBonusRecipient } = applyEndOfRoundGrowth(cities);
  assert.equal(luoyangBonusRecipient, 'shu');
  assert.equal(next.luoyang.troops, 70);
  assert.equal(next.beiping.troops, 49);
});

test('Lu Bu appearance respects turn >= 5, territory 6..11, lead >= 3, probability, and rear city priority', () => {
  const cities = createInitialCities();
  // Give Shu 7 cities including rear city chengdu (neighbors hanzhong & jiangling both Shu!)
  const shuCities: CityId[] = ['chengdu', 'hanzhong', 'jiangling', 'changan', 'xiangyang', 'changsha', 'luoyang'];
  for (const id of shuCities) {
    cities[id].owner = 'shu';
    cities[id].troops = 80;
  }
  // Make chengdu safe rear city with lowest troops (30), while changsha is frontline with 20
  cities.chengdu.troops = 30;
  cities.changsha.troops = 20;

  // Turn 4 -> must NOT trigger
  const t4 = checkLuBuAppearance(cities, 4, false, 'shu', () => 0.1);
  assert.equal(t4.triggered, false);

  // Turn 5 with 7 cities (lead 7 vs wei 2 = 5 >= 3): 65% prob -> rng 0.70 fails
  const t5Fail = checkLuBuAppearance(cities, 5, false, 'shu', () => 0.7);
  assert.equal(t5Fail.triggered, false);

  // Turn 5 with rng 0.60 succeeds, MUST pick rear city 'chengdu' over frontline 'changsha'!
  const t5Hit = checkLuBuAppearance(cities, 5, false, 'shu', () => 0.6);
  assert.equal(t5Hit.triggered, true);
  assert.equal(t5Hit.betrayedCityId, 'chengdu');
  assert.equal(t5Hit.cities.chengdu.owner, 'lubu');
  assert.equal(t5Hit.eventModal?.victimIsPlayer, true);

  // Verify initial troops = round(max(95, avg * 1.45))
  const avg = (30 + 20 + 80 * 5) / 7; // 450 / 7 = 64.2857 -> *1.45 = 93.21 -> max(95, ...) = 95
  assert.equal(t5Hit.initialTroops, Math.round(Math.max(95, avg * 1.45)));
  assert.equal(t5Hit.initialTroops, 95);

  // When leader has 8 cities -> 100% probability even at rng 0.99
  cities.ye.owner = 'shu';
  cities.ye.troops = 120;
  const t6Hundred = checkLuBuAppearance(cities, 6, false, 'wei', () => 0.99);
  assert.equal(t6Hundred.triggered, true);
  assert.equal(t6Hundred.eventModal?.victimIsPlayer, false);

  // Already spawned -> never triggers twice
  const twice = checkLuBuAppearance(cities, 7, true, 'shu', () => 0.0);
  assert.equal(twice.triggered, false);
});

test('Lu Bu AI targets betrayed leader aggressively at >= 0.9 power ratio', () => {
  const cities = createInitialCities();
  cities.chengdu.owner = 'lubu';
  cities.chengdu.troops = 80; // sends 64 * 1.35 = 86.4 atk
  cities.hanzhong.owner = 'shu';
  cities.hanzhong.troops = 92; // 86.4 / 92 = 0.939 >= 0.90!
  cities.jiangling.owner = 'neutral';
  cities.jiangling.troops = 30; // easy neutral, but Shu is betrayed target!

  const plan = planAiAction(cities, 'lubu', 'shu');
  assert.ok(plan);
  assert.equal(plan.type, 'attack');
  if (plan.type === 'attack') {
    assert.equal(plan.toId, 'hanzhong');
  }
});

test('3-turn random events produce valid states and victory ranks match exact cutoffs', () => {
  const cities = createInitialCities();
  for (let i = 0; i < 5; i++) {
    const res = triggerThreeTurnEvent(cities, 'shu', () => i / 5 + 0.01);
    assert.ok(res.eventModal.title.length > 0);
    assert.equal(Object.keys(countTerritories(res.cities)).length, 5);
  }

  assert.equal(calculateVictoryRank(1).rank, 'SS');
  assert.equal(calculateVictoryRank(15).rank, 'SS');
  assert.equal(calculateVictoryRank(16).rank, 'S');
  assert.equal(calculateVictoryRank(20).rank, 'S');
  assert.equal(calculateVictoryRank(21).rank, 'A');
  assert.equal(calculateVictoryRank(25).rank, 'A');
  assert.equal(calculateVictoryRank(26).rank, 'B');
  assert.equal(calculateVictoryRank(30).rank, 'B');
  assert.equal(calculateVictoryRank(31).rank, 'C');
  assert.equal(calculateVictoryRank(35).rank, 'C');
  assert.equal(calculateVictoryRank(36).rank, 'D');
  assert.equal(calculateVictoryRank(40).rank, 'D');
  assert.equal(calculateVictoryRank(41).rank, 'E');
  assert.equal(calculateVictoryRank(60).rank, 'E');
});

test('achievement score formula calculates base, Lu Bu bonus, troop bonus, floor, and 15000 cap', () => {
  // Standard S-rank unification with Lu Bu defeated
  const s1 = calculateAchievementScore(15, 820, true);
  assert.equal(s1.baseScore, 7750); // 10000 - 15*150
  assert.equal(s1.lubuBonus, 1500);
  assert.equal(s1.troopBonus, 820);
  assert.equal(s1.totalScore, 10070);

  // Without Lu Bu defeated, troop bonus capped at 1500
  const s2 = calculateAchievementScore(20, 2400, false);
  assert.equal(s2.baseScore, 7000);
  assert.equal(s2.lubuBonus, 0);
  assert.equal(s2.troopBonus, 1500);
  assert.equal(s2.totalScore, 8500);

  // Very high turns hits 500 base floor
  const s3 = calculateAchievementScore(80, 120, false);
  assert.equal(s3.baseScore, 500);
  assert.equal(s3.totalScore, 620);

  // Theoretical maximum cannot exceed 15000
  const sMax = calculateAchievementScore(0, 9999, true);
  assert.equal(sMax.baseScore, 10000);
  assert.equal(sMax.lubuBonus, 1500);
  assert.equal(sMax.troopBonus, 1500);
  assert.equal(sMax.totalScore, 13000);
});

test('hasDefeatedLuBu returns true only if Lu Bu spawned and now owns 0 cities', () => {
  const cities = createInitialCities();
  // Never spawned -> false even though lubu owns 0 cities
  assert.equal(hasDefeatedLuBu(false, cities), false);

  // Spawned and still holds a city -> false
  cities.chengdu.owner = 'lubu';
  assert.equal(hasDefeatedLuBu(true, cities), false);

  // Spawned and wiped out -> true!
  cities.chengdu.owner = 'shu';
  assert.equal(hasDefeatedLuBu(true, cities), true);
});

test('eliminating Lu Bu or a rival major lord grants 3 AP next turn, then returns to 2 AP on the following turn', () => {
  const initial = createInitialGameState('shu', 'playing');
  assert.equal(initial.maxAp, 2);
  assert.equal(initial.turnMaxAp, 2);
  assert.equal(initial.nextTurnBonusAp, 0);
  assert.equal(initial.victoryApBonusActive, false);

  // Case A: Player (shu) captures Lu Bu's last city (hanzhong)
  const citiesLuBu = createInitialCities();
  citiesLuBu.chengdu.owner = 'shu';
  citiesLuBu.chengdu.troops = 140;
  citiesLuBu.hanzhong.owner = 'lubu';
  citiesLuBu.hanzhong.troops = 20;

  const resLuBu = executeMarchOrTransport(citiesLuBu, 'chengdu', 'hanzhong', 0.8, () => 0.5);
  assert.ok(resLuBu?.battle?.attackerWon);
  const lubuEliminated = isMajorEliminationReward(
    'shu',
    resLuBu.battle.defenderFaction,
    'shu',
    resLuBu.cities
  );
  assert.equal(lubuEliminated, true);
  assert.ok(formatEliminationRewardMessage('lubu').includes('다음 턴 행동력 +1'));

  const reservedAfterLuBu = reserveVictoryBonusAp(initial.nextTurnBonusAp, lubuEliminated);
  assert.equal(reservedAfterLuBu, 1);

  // Next turn -> AP becomes 3 (turnMaxAp = 3), nextTurnBonusAp resets to 0
  const nextTurnAfterLuBu = resolveNextPlayerTurnAp(initial.maxAp, reservedAfterLuBu, 0);
  assert.equal(nextTurnAfterLuBu.turnMaxAp, 3);
  assert.equal(nextTurnAfterLuBu.ap, 3);
  assert.equal(nextTurnAfterLuBu.nextTurnBonusAp, 0);
  assert.equal(nextTurnAfterLuBu.victoryApBonusActive, true);

  // Following turn (no new elimination) -> AP returns to 2 (turnMaxAp = 2)
  const followingTurn = resolveNextPlayerTurnAp(initial.maxAp, nextTurnAfterLuBu.nextTurnBonusAp, 0);
  assert.equal(followingTurn.turnMaxAp, 2);
  assert.equal(followingTurn.ap, 2);
  assert.equal(followingTurn.nextTurnBonusAp, 0);
  assert.equal(followingTurn.victoryApBonusActive, false);

  // Case B: Player (shu) eliminates rival major lord Wei's last remaining city (xuchang)
  const citiesWei = createInitialCities();
  citiesWei.xiapi.owner = 'shu'; // Leave Wei with only xuchang
  citiesWei.xiangyang.owner = 'shu';
  citiesWei.xiangyang.troops = 150;
  citiesWei.xuchang.owner = 'wei';
  citiesWei.xuchang.troops = 20;

  const resWei = executeMarchOrTransport(citiesWei, 'xiangyang', 'xuchang', 0.8, () => 0.5);
  assert.ok(resWei?.battle?.attackerWon);
  const weiEliminated = isMajorEliminationReward(
    'shu',
    resWei.battle.defenderFaction,
    'shu',
    resWei.cities
  );
  assert.equal(weiEliminated, true);
  assert.equal(formatEliminationRewardMessage('wei'), '🏆 조조(위) 멸망! 다음 턴 행동력 +1 획득!');

  // Even if two major factions fall in the same turn, bonus stays capped at +1 (total 3)
  const doubleReserved = reserveVictoryBonusAp(reservedAfterLuBu, weiEliminated);
  assert.equal(doubleReserved, 1);
  const turnWithSoutheastWind = resolveNextPlayerTurnAp(initial.maxAp, doubleReserved, 1);
  assert.equal(turnWithSoutheastWind.turnMaxAp, 3);
  assert.equal(turnWithSoutheastWind.ap, 4); // 3 base+victory + 1 southeast wind
  assert.equal(turnWithSoutheastWind.victoryApBonusActive, true);

  // Exclusions: neutral capture or AI eliminating another AI must NOT trigger reward
  const citiesNeutral = createInitialCities();
  for (const id of ALL_CITY_IDS) {
    if (citiesNeutral[id].owner === 'neutral') citiesNeutral[id].owner = 'shu';
  }
  assert.equal(isMajorEliminationReward('shu', 'neutral', 'shu', citiesNeutral), false);
  assert.equal(isMajorEliminationReward('wu', 'wei', 'shu', resWei.cities), false);
});

test('Wu [수성] passive: +20% defense (+30% at Luoyang), 0 AP first fire (even at 0 AP), 1-use cap, and AI Wu never uses fire', () => {
  const initial = createInitialGameState('wu', 'playing');
  assert.equal(FACTIONS.wu.traitName, '수성');
  assert.equal(FACTIONS.wu.traitSummary, '방어 +20% · 화공 0 AP');
  assert.equal(FACTIONS.wu.defenseMult, 1.2);
  assert.ok(Math.abs(getDefenseMultiplier('wu', false) - 1.2) < 1e-6);
  assert.ok(Math.abs(getDefenseMultiplier('wu', true) - 1.3) < 1e-6);
  assert.equal(initial.fireUsesThisTurn, 0);
  assert.equal(initial.maxFireUsesThisTurn, 1);
  assert.equal(initial.fireBonusRateThisTurn, 0);

  // First fire for Wu costs 0 AP and is allowed even when AP is 0
  assert.equal(getFireApCost('wu', 0), 0);
  assert.equal(canUseFireAttack('wu', 0, 0, 1), true);
  // Non-Wu cannot fire at 0 AP
  assert.equal(getFireApCost('shu', 0), 1);
  assert.equal(canUseFireAttack('shu', 0, 0, 1), false);
  assert.equal(canUseFireAttack('wei', 0, 0, 1), false);

  // Execute Wu's 0 AP fire attack with deterministic RNG:
  // minor (< 0.30) -> 20%, and even near 1.0 (0.999) -> normal 30% (never great on normal turn)
  const cities = createInitialCities();
  cities.hefei.owner = 'wei';
  cities.hefei.troops = 100;
  const wuMinorRes = executeFireAttack(cities, 'jianye', 'hefei', 0, () => 0.29);
  assert.ok(wuMinorRes);
  assert.equal(wuMinorRes.grade, 'minor');
  assert.ok(Math.abs(wuMinorRes.lossRate - 0.2) < 1e-6);
  assert.equal(wuMinorRes.troopsLost, 20);
  assert.equal(wuMinorRes.cities.hefei.troops, 80);

  const fireRes = executeFireAttack(cities, 'jianye', 'hefei', 0, () => 0.999);
  assert.ok(fireRes);
  assert.equal(fireRes.grade, 'normal');
  assert.ok(Math.abs(fireRes.lossRate - 0.3) < 1e-6);
  assert.equal(fireRes.troopsLost, 30);
  assert.equal(fireRes.cities.hefei.troops, 70);

  // AP remains unchanged (0 AP cost), and 2nd fire is blocked on a normal turn (maxFireUsesThisTurn = 1)
  const apAfterFirst = 0 - getFireApCost('wu', 0);
  assert.equal(apAfterFirst, 0);
  assert.equal(canUseFireAttack('wu', 2, 1, 1), false);

  // AI-controlled Wu never plans a fire attack (only attack / transport / recruit)
  const aiPlan = planAiAction(cities, 'wu', null);
  assert.ok(aiPlan);
  assert.ok(['attack', 'transport', 'recruit'].includes(aiPlan.type));
});

test('Southeast Wind event grants +1 AP, 2 fire uses (Wu: 1st 0 AP / 2nd 1 AP), excludes minor, and boosts fire to 40%/55%', () => {
  const cities = createInitialCities();
  cities.hefei.owner = 'wei';
  cities.hefei.troops = 100;
  cities.xiapi.owner = 'wei';
  cities.xiapi.troops = 100;

  // roll = floor(0.25 * 5) = 1 -> southeast_wind
  const evWu = triggerThreeTurnEvent(cities, 'wu', () => 0.25);
  assert.equal(evWu.eventModal.type, 'southeast_wind');
  assert.equal(
    evWu.eventModal.description,
    '순풍이 불어옵니다! 이번 턴 행동력 +1, 화공 2회 사용 가능! 소규모 판정이 제외되어 성공(-40%) 또는 대화재(-55%)가 발동합니다!'
  );
  assert.ok(evWu.eventModal.effectSummary.includes('-40~55%'));
  assert.equal(evWu.bonusAp, 1);
  assert.equal(evWu.maxFireUsesThisTurn, 2);
  assert.ok(Math.abs(evWu.fireBonusRateThisTurn - 0.1) < 1e-6);

  // AP roll includes +1 bonus AP from Southeast Wind (2 base + 1 event = 3 AP)
  const apTurn = resolveNextPlayerTurnAp(2, 0, evWu.bonusAp);
  assert.equal(apTurn.ap, 3);

  // All factions share the exact 40~55% damage range during Southeast Wind
  const windRange = getFireDamageRange(evWu.fireBonusRateThisTurn);
  assert.equal(windRange.minPct, 40);
  assert.equal(windRange.maxPct, 55);
  assert.ok(Math.abs(windRange.minRate - 0.4) < 1e-6);
  assert.ok(Math.abs(windRange.maxRate - 0.55) < 1e-6);

  // Wu 1st shot: 0 AP cost, works even if AP=0; even roll=0.0 never triggers minor -> normal 40%
  assert.equal(getFireApCost('wu', 0), 0);
  assert.equal(canUseFireAttack('wu', 0, 0, evWu.maxFireUsesThisTurn), true);
  const wuShot1 = executeFireAttack(cities, 'jianye', 'hefei', evWu.fireBonusRateThisTurn, () => 0.0);
  assert.ok(wuShot1);
  assert.equal(wuShot1.grade, 'normal');
  assert.ok(Math.abs(wuShot1.lossRate - 0.4) < 1e-6);
  assert.equal(wuShot1.troopsLost, 40);
  assert.equal(wuShot1.cities.hefei.troops, 60);

  let wuAp = apTurn.ap - getFireApCost('wu', 0);
  assert.equal(wuAp, 3); // 1st shot was free

  // Wu 2nd shot: 1 AP cost, blocked if AP=0, allowed if AP>=1; roll=0.85 -> great 55%
  assert.equal(getFireApCost('wu', 1), 1);
  assert.equal(canUseFireAttack('wu', 0, 1, evWu.maxFireUsesThisTurn), false);
  assert.equal(canUseFireAttack('wu', wuAp, 1, evWu.maxFireUsesThisTurn), true);
  const wuShot2 = executeFireAttack(
    wuShot1.cities,
    'jianye',
    'xiapi',
    evWu.fireBonusRateThisTurn,
    () => 0.85
  );
  assert.ok(wuShot2);
  assert.equal(wuShot2.grade, 'great');
  assert.ok(Math.abs(wuShot2.lossRate - 0.55) < 1e-6);
  assert.equal(wuShot2.troopsLost, 55);
  assert.equal(wuShot2.cities.xiapi.troops, 45);

  wuAp -= getFireApCost('wu', 1);
  assert.equal(wuAp, 2); // 2nd shot spent 1 AP

  // 3rd shot blocked (max 2 uses)
  assert.equal(canUseFireAttack('wu', wuAp, 2, evWu.maxFireUsesThisTurn), false);

  // Shu/Wei pay 1 AP on both 1st and 2nd fire shots during Southeast Wind
  assert.equal(getFireApCost('wei', 0), 1);
  assert.equal(getFireApCost('wei', 1), 1);
  assert.equal(canUseFireAttack('wei', 2, 0, evWu.maxFireUsesThisTurn), true);
  assert.equal(canUseFireAttack('wei', 1, 1, evWu.maxFireUsesThisTurn), true);
  assert.equal(canUseFireAttack('wei', 1, 2, evWu.maxFireUsesThisTurn), false);
});




