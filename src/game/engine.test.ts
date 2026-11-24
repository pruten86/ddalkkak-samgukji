import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CITIES, FACTIONS, ALL_CITY_IDS } from './data';
import {
  applyEndOfRoundGrowth,
  calculateAchievementScore,
  calculateVictoryRank,
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
  getRecruitAmount,
  getSendTroops,
  hasDefeatedLuBu,
  isMajorEliminationReward,
  planAiAction,
  reserveVictoryBonusAp,
  resolveCombat,
  resolveNextPlayerTurnAp,
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

  // Luoyang adds +10% defense
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

test('fire attack reduces enemy troops by 35% (or 50% with southeast wind)', () => {
  const cities = createInitialCities();
  const res = executeFireAttack(cities, 'chengdu', 'hanzhong', false);
  assert.ok(res);
  assert.equal(res.troopsLost, 18); // round(50 * 0.35) = 18
  assert.equal(res.cities.hanzhong.troops, 32);

  const enhanced = executeFireAttack(cities, 'chengdu', 'hanzhong', true);
  assert.ok(enhanced);
  assert.equal(enhanced.troopsLost, 25);
  assert.equal(enhanced.cities.hanzhong.troops, 25);

  // Cannot fire attack friendly city
  assert.equal(executeFireAttack(cities, 'chengdu', 'jiangling', false), null);
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

  assert.equal(calculateVictoryRank(20).rank, 'S');
  assert.equal(calculateVictoryRank(21).rank, 'A');
  assert.equal(calculateVictoryRank(30).rank, 'A');
  assert.equal(calculateVictoryRank(31).rank, 'B');
  assert.equal(calculateVictoryRank(40).rank, 'B');
  assert.equal(calculateVictoryRank(41).rank, 'C');
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

