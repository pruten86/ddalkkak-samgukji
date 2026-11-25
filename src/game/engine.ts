import {
  ALL_CITY_IDS,
  BASE_FIRE_LOSS_RATE,
  BASE_MAX_FIRE_USES,
  BASE_RECRUIT_TROOPS,
  FACTIONS,
  INITIAL_CITIES,
  LUOYANG_DEFENSE_BONUS,
  LUOYANG_TURN_BONUS,
  MAX_AP,
  MIN_GARRISON_TROOPS,
  NEUTRAL_REPLENISH_TROOPS,
  NEUTRAL_TROOP_CAP,
  PLAYABLE_FACTIONS,
  SOUTHEAST_WIND_FIRE_BONUS,
  SOUTHEAST_WIND_MAX_FIRE_USES,
  getStartingCityForFaction,
} from './data';
import type {
  AchievementScoreBreakdown,
  BattleResult,
  CityId,
  CityState,
  FactionId,
  ForecastLevel,
  GameEventModalData,
  GamePhase,
  GameState,
  MarchRatio,
  PlayableFactionId,
  VictoryRank,
} from './types';

export type RngFn = () => number;

export function createInitialCities(): Record<CityId, CityState> {
  const cities = {} as Record<CityId, CityState>;
  for (const def of INITIAL_CITIES) {
    cities[def.id] = {
      id: def.id,
      name: def.name,
      x: def.x,
      y: def.y,
      owner: def.initialOwner,
      troops: def.initialTroops,
      adjacent: [...def.adjacent],
      isImperial: Boolean(def.isImperial),
    };
  }
  return cities;
}

export function cloneCities(cities: Record<CityId, CityState>): Record<CityId, CityState> {
  const next = {} as Record<CityId, CityState>;
  for (const id of ALL_CITY_IDS) {
    const c = cities[id];
    next[id] = {
      ...c,
      adjacent: [...c.adjacent],
    };
  }
  return next;
}

export function createInitialGameState(
  playerFaction: PlayableFactionId = 'shu',
  initialPhase: GamePhase = 'splash'
): GameState {
  const cities = createInitialCities();
  const startCity = getStartingCityForFaction(playerFaction);
  const factionInfo = FACTIONS[playerFaction];

  return {
    phase: initialPhase,
    playerFaction,
    turn: 1,
    ap: MAX_AP,
    maxAp: MAX_AP,
    turnMaxAp: MAX_AP,
    nextTurnBonusAp: 0,
    victoryApBonusActive: false,
    fireUsesThisTurn: 0,
    maxFireUsesThisTurn: BASE_MAX_FIRE_USES,
    fireBonusRateThisTurn: 0,
    cities,
    selectedCityId: startCity,
    commandMode: 'idle',
    marchRatio: 0.8,
    lubuSpawned: false,
    lubuDefeated: false,
    lubuTargetFaction: null,
    isAiTurn: false,
    activeAiFaction: null,
    pendingEvent: null,
    chronicle: [
      {
        id: 'init-1',
        turn: 1,
        text: `${factionInfo.name} 세력으로 천하통일의 대업을 시작했습니다.`,
        faction: playerFaction,
        highlight: 'normal',
      },
    ],
    stats: {
      battlesWon: 0,
      battlesFought: 0,
      firesUsed: 0,
      peakTerritories: 2,
    },
  };
}

export function getRecruitAmount(faction: FactionId): number {
  return Math.round(BASE_RECRUIT_TROOPS * FACTIONS[faction].recruitMult);
}

export function getAttackMultiplier(faction: FactionId): number {
  return FACTIONS[faction].attackMult;
}

export function getDefenseMultiplier(faction: FactionId, isImperial: boolean): number {
  return FACTIONS[faction].defenseMult + (isImperial ? LUOYANG_DEFENSE_BONUS : 0);
}

/**
 * Returns the AP cost of the next fire attack for the given faction.
 * Wu's first fire attack each turn (fireUsesThisTurn === 0) costs 0 AP; subsequent uses cost 1 AP.
 */
export function getFireApCost(faction: FactionId, fireUsesThisTurn: number): number {
  return faction === 'wu' && fireUsesThisTurn === 0 ? 0 : 1;
}

/**
 * Checks whether the faction can perform another fire attack this turn given remaining AP and uses.
 */
export function canUseFireAttack(
  faction: FactionId,
  ap: number,
  fireUsesThisTurn: number,
  maxFireUsesThisTurn: number
): boolean {
  if (fireUsesThisTurn >= maxFireUsesThisTurn) return false;
  return ap >= getFireApCost(faction, fireUsesThisTurn);
}

/**
 * Computes effective fire attack troop loss rate (0.30 base + bonus rate such as 0.10 Southeast Wind = 0.40) for all factions.
 */
export function getFireLossRate(_faction: FactionId, fireBonusRate = 0): number {
  const bonus = Math.max(0, fireBonusRate);
  return Math.min(0.8, Number((BASE_FIRE_LOSS_RATE + bonus).toFixed(2)));
}

export function getSendTroops(sourceTroops: number, ratio: MarchRatio): number {
  if (sourceTroops <= MIN_GARRISON_TROOPS) return 0;
  const maxSendable = sourceTroops - MIN_GARRISON_TROOPS;
  const desired = Math.floor(sourceTroops * ratio);
  return Math.max(1, Math.min(maxSendable, desired));
}

export function getExpectedPowerRatio(
  attackerFaction: FactionId,
  sendTroops: number,
  defenderCity: CityState
): number {
  if (sendTroops <= 0) return 0;
  const expectedAtk = sendTroops * getAttackMultiplier(attackerFaction);
  const expectedDef = Math.max(
    1,
    defenderCity.troops * getDefenseMultiplier(defenderCity.owner, defenderCity.isImperial)
  );
  return expectedAtk / expectedDef;
}

export function getCombatForecast(
  sourceCity: CityState,
  targetCity: CityState,
  ratio: MarchRatio
): ForecastLevel {
  const sendTroops = getSendTroops(sourceCity.troops, ratio);
  const powerRatio = getExpectedPowerRatio(sourceCity.owner, sendTroops, targetCity);
  if (powerRatio >= 1.15) return '우세';
  if (powerRatio >= 0.88) return '박빙';
  return '열세';
}

export function resolveCombat(
  fromId: CityId,
  attackerFaction: FactionId,
  sendTroops: number,
  defenderCity: CityState,
  rng: RngFn = Math.random
): BattleResult {
  const randomFactor = 0.95 + rng() * 0.1;
  const attackPower = sendTroops * getAttackMultiplier(attackerFaction) * randomFactor;
  const defensePower =
    defenderCity.troops * getDefenseMultiplier(defenderCity.owner, defenderCity.isImperial);

  const attackerWon = attackPower > defensePower;
  let remainingTroops: number;

  if (attackerWon) {
    const ratioLeft = (attackPower - defensePower) / Math.max(attackPower, 0.0001);
    remainingTroops = Math.max(1, Math.round(sendTroops * ratioLeft));
  } else {
    const ratioLeft = (defensePower - attackPower) / Math.max(defensePower, 0.0001);
    remainingTroops = Math.max(1, Math.round(defenderCity.troops * ratioLeft));
  }

  return {
    fromId,
    toId: defenderCity.id,
    attackerFaction,
    defenderFaction: defenderCity.owner,
    sentTroops: sendTroops,
    defenderInitialTroops: defenderCity.troops,
    attackPower,
    defensePower,
    attackerWon,
    remainingTroops,
  };
}

export function executeRecruit(
  cities: Record<CityId, CityState>,
  cityId: CityId
): { cities: Record<CityId, CityState>; gained: number } {
  const next = cloneCities(cities);
  const target = next[cityId];
  const gained = getRecruitAmount(target.owner);
  target.troops += gained;
  return { cities: next, gained };
}

export function executeMarchOrTransport(
  cities: Record<CityId, CityState>,
  fromId: CityId,
  toId: CityId,
  ratio: MarchRatio,
  rng: RngFn = Math.random
): {
  cities: Record<CityId, CityState>;
  kind: 'transport' | 'battle';
  sentTroops: number;
  battle?: BattleResult;
} | null {
  const source = cities[fromId];
  const target = cities[toId];
  if (!source || !target) return null;
  if (!source.adjacent.includes(toId)) return null;

  const sentTroops = getSendTroops(source.troops, ratio);
  if (sentTroops <= 0) return null;

  const next = cloneCities(cities);
  next[fromId].troops -= sentTroops;

  if (source.owner === target.owner) {
    next[toId].troops += sentTroops;
    return {
      cities: next,
      kind: 'transport',
      sentTroops,
    };
  }

  const battle = resolveCombat(fromId, source.owner, sentTroops, target, rng);

  if (battle.attackerWon) {
    next[toId].owner = source.owner;
    next[toId].troops = battle.remainingTroops;
  } else {
    next[toId].troops = battle.remainingTroops;
  }

  return {
    cities: next,
    kind: 'battle',
    sentTroops,
    battle,
  };
}

export function executeFireAttack(
  cities: Record<CityId, CityState>,
  fromId: CityId,
  toId: CityId,
  fireBonusRate = 0
): {
  cities: Record<CityId, CityState>;
  troopsLost: number;
  lossRate: number;
} | null {
  const source = cities[fromId];
  const target = cities[toId];
  if (!source || !target) return null;
  if (!source.adjacent.includes(toId)) return null;
  if (source.owner === target.owner) return null;

  const next = cloneCities(cities);
  const lossRate = getFireLossRate(source.owner, fireBonusRate);
  const rawLoss = Math.max(1, Math.round(target.troops * lossRate));
  const actualRemaining = Math.max(1, target.troops - rawLoss);
  const troopsLost = target.troops - actualRemaining;
  next[toId].troops = actualRemaining;

  return {
    cities: next,
    troopsLost,
    lossRate,
  };
}

export function countTerritories(cities: Record<CityId, CityState>): Record<FactionId, number> {
  const counts: Record<FactionId, number> = {
    shu: 0,
    wei: 0,
    wu: 0,
    neutral: 0,
    lubu: 0,
  };
  for (const id of ALL_CITY_IDS) {
    counts[cities[id].owner] += 1;
  }
  return counts;
}

export function countTotalTroops(cities: Record<CityId, CityState>, faction: FactionId): number {
  let total = 0;
  for (const id of ALL_CITY_IDS) {
    if (cities[id].owner === faction) {
      total += cities[id].troops;
    }
  }
  return total;
}

export function getOwnedCities(cities: Record<CityId, CityState>, faction: FactionId): CityState[] {
  return ALL_CITY_IDS.map((id) => cities[id]).filter((c) => c.owner === faction);
}

export function applyEndOfRoundGrowth(cities: Record<CityId, CityState>): {
  cities: Record<CityId, CityState>;
  luoyangBonusRecipient: FactionId | null;
} {
  const next = cloneCities(cities);
  let luoyangBonusRecipient: FactionId | null = null;

  for (const id of ALL_CITY_IDS) {
    const city = next[id];
    if (city.owner === 'neutral') {
      if (city.troops < NEUTRAL_TROOP_CAP) {
        city.troops = Math.min(NEUTRAL_TROOP_CAP, city.troops + NEUTRAL_REPLENISH_TROOPS);
      }
    }
    if (city.isImperial && city.owner !== 'neutral') {
      city.troops += LUOYANG_TURN_BONUS;
      luoyangBonusRecipient = city.owner;
    }
  }

  return { cities: next, luoyangBonusRecipient };
}

export interface LuBuTriggerResult {
  triggered: boolean;
  cities: Record<CityId, CityState>;
  betrayedCityId?: CityId;
  victimFaction?: PlayableFactionId;
  initialTroops?: number;
  eventModal?: GameEventModalData;
}

export function checkLuBuAppearance(
  cities: Record<CityId, CityState>,
  turn: number,
  lubuAlreadySpawned: boolean,
  playerFaction: PlayableFactionId,
  rng: RngFn = Math.random
): LuBuTriggerResult {
  if (lubuAlreadySpawned || turn < 5) {
    return { triggered: false, cities };
  }

  const counts = countTerritories(cities);
  const majorStandings = PLAYABLE_FACTIONS.map((f) => ({
    faction: f,
    count: counts[f],
  })).sort((a, b) => b.count - a.count);

  const leader = majorStandings[0];
  const second = majorStandings[1];

  if (leader.count < 6 || leader.count > 11) {
    return { triggered: false, cities };
  }

  if (leader.count - second.count < 3) {
    return { triggered: false, cities };
  }

  const probability = leader.count >= 8 ? 1.0 : 0.65;
  if (rng() >= probability) {
    return { triggered: false, cities };
  }

  const leaderCities = getOwnedCities(cities, leader.faction);
  if (leaderCities.length === 0) {
    return { triggered: false, cities };
  }

  // Priority 1: Rear city with no adjacent enemies, lowest troops
  const rearCities = leaderCities.filter((city) =>
    city.adjacent.every((adjId) => cities[adjId].owner === leader.faction)
  );
  const candidatePool = rearCities.length > 0 ? rearCities : leaderCities;
  const betrayedCity = [...candidatePool].sort((a, b) => a.troops - b.troops)[0];

  const avgLeaderTroops =
    leaderCities.reduce((sum, c) => sum + c.troops, 0) / leaderCities.length;
  const initialTroops = Math.round(Math.max(95, avgLeaderTroops * 1.45));

  const next = cloneCities(cities);
  next[betrayedCity.id].owner = 'lubu';
  next[betrayedCity.id].troops = initialTroops;

  const victimIsPlayer = leader.faction === playerFaction;
  const leaderName = FACTIONS[leader.faction].name;

  const eventModal: GameEventModalData = victimIsPlayer
    ? {
        type: 'lubu_appearance',
        title: '여포의 반란! 천하무쌍 봉선 출현',
        subtitle: `후방 거점 「${betrayedCity.name}」 반란`,
        description: `아군의 파죽지세를 틈타 여포가 방심한 「${betrayedCity.name}」에서 반기를 들었습니다! 적토마와 방천화극을 앞세운 여포군이 곧바로 아군 인접 성지를 노립니다.`,
        effectSummary: `${betrayedCity.name} 여포군 독립 (병력 ${initialTroops}) · 무쌍 [공격 +35% / 방어 +10% / 징병 +15%]`,
        accentColor: FACTIONS.lubu.color,
        isLuBu: true,
        victimIsPlayer: true,
        targetCityId: betrayedCity.id,
      }
    : {
        type: 'lubu_appearance',
        title: '천하대란! 여포군 기습 독립',
        subtitle: `${leaderName} 휘하 「${betrayedCity.name}」 배신`,
        description: `선두를 독주하던 ${leaderName}의 허점을 노려 여포가 「${betrayedCity.name}」을(를) 탈취하고 독립 세력을 선포했습니다! 선두 세력의 후방이 크게 흔들립니다.`,
        effectSummary: `${betrayedCity.name} 여포군 독립 (병력 ${initialTroops}) · 여포군이 ${leaderName}을(를) 최우선 공격`,
        accentColor: FACTIONS.lubu.color,
        isLuBu: true,
        victimIsPlayer: false,
        targetCityId: betrayedCity.id,
      };

  return {
    triggered: true,
    cities: next,
    betrayedCityId: betrayedCity.id,
    victimFaction: leader.faction,
    initialTroops,
    eventModal,
  };
}

export interface RandomEventResult {
  cities: Record<CityId, CityState>;
  eventModal: GameEventModalData;
  bonusAp: number;
  maxFireUsesThisTurn: number;
  fireBonusRateThisTurn: number;
  targetCityId?: CityId;
}

export function triggerThreeTurnEvent(
  cities: Record<CityId, CityState>,
  playerFaction: PlayableFactionId,
  rng: RngFn = Math.random
): RandomEventResult {
  const roll = Math.floor(rng() * 5);
  const next = cloneCities(cities);

  if (roll === 0) {
    // 풍년: All non-neutral cities gain +14 troops
    for (const id of ALL_CITY_IDS) {
      if (next[id].owner !== 'neutral') {
        next[id].troops += 14;
      }
    }
    return {
      cities: next,
      bonusAp: 0,
      maxFireUsesThisTurn: BASE_MAX_FIRE_USES,
      fireBonusRateThisTurn: 0,
      eventModal: {
        type: 'harvest',
        title: '중원 대풍년',
        subtitle: '3턴 주기 돌발 사건',
        description: '황하와 장강 유역에 유례없는 풍년이 들어 군량이 가득 쌓였습니다. 각 세력의 병력이 대거 충원됩니다.',
        effectSummary: '위·촉·오(및 여포) 모든 성지 병력 +14',
        accentColor: '#2e7d4f',
      },
    };
  }

  if (roll === 1) {
    // 적벽의 동남풍: AP +1, maxFireUsesThisTurn = 2, fireBonusRateThisTurn = +0.10 (40% for all factions)
    const enhancedPct = Math.round(
      getFireLossRate(playerFaction, SOUTHEAST_WIND_FIRE_BONUS) * 100
    );
    return {
      cities: next,
      bonusAp: 1,
      maxFireUsesThisTurn: SOUTHEAST_WIND_MAX_FIRE_USES,
      fireBonusRateThisTurn: SOUTHEAST_WIND_FIRE_BONUS,
      eventModal: {
        type: 'southeast_wind',
        title: '적벽의 동남풍',
        subtitle: '3턴 주기 돌발 사건',
        description:
          '순풍이 불어옵니다! 이번 턴 행동력 +1, 화공 2회 사용 가능, 화공 피해량 +10% 증가!',
        effectSummary:
          playerFaction === 'wu'
            ? `행동력 +1 · 화공 2회 (1타 0 AP / 2타 1 AP) · 화공 피해 ${enhancedPct}%`
            : `행동력 +1 · 화공 2회 (회당 1 AP) · 화공 피해 ${enhancedPct}%`,
        accentColor: '#b5382a',
      },
    };
  }

  if (roll === 2) {
    // 역병: Highest troop city across non-neutral (or any) loses 22% troops
    const populated = ALL_CITY_IDS.map((id) => next[id]).sort((a, b) => b.troops - a.troops);
    const hitCity = populated[0];
    const lost = Math.max(5, Math.round(hitCity.troops * 0.22));
    hitCity.troops = Math.max(10, hitCity.troops - lost);
    return {
      cities: next,
      bonusAp: 0,
      maxFireUsesThisTurn: BASE_MAX_FIRE_USES,
      fireBonusRateThisTurn: 0,
      targetCityId: hitCity.id,
      eventModal: {
        type: 'plague',
        title: '전선 역병 창궐',
        subtitle: `「${hitCity.name}」 일대 전염병 확산`,
        description: `대군이 밀집한 「${hitCity.name}」(${FACTIONS[hitCity.owner].shortName})에 역병이 돌아 많은 병사가 쓰러졌습니다.`,
        effectSummary: `${hitCity.name} 병력 -${lost} 손실`,
        accentColor: '#6c584c',
        targetCityId: hitCity.id,
      },
    };
  }

  if (roll === 3) {
    // 재야 명장 투항: Player's frontline city (or first owned city) gains +35 troops
    const playerCities = getOwnedCities(next, playerFaction);
    const frontline = playerCities.filter((c) =>
      c.adjacent.some((adjId) => next[adjId].owner !== playerFaction)
    );
    const chosen = (frontline.length > 0 ? frontline : playerCities).sort(
      (a, b) => a.troops - b.troops
    )[0];

    if (chosen) {
      chosen.troops += 35;
      return {
        cities: next,
        bonusAp: 0,
        maxFireUsesThisTurn: BASE_MAX_FIRE_USES,
        fireBonusRateThisTurn: 0,
        targetCityId: chosen.id,
        eventModal: {
          type: 'renowned_general',
          title: '재야 명장의 투항',
          subtitle: `「${chosen.name}」 정예병 합류`,
          description: `난세를 평정할 영웅을 찾던 재야의 명장이 정예 의용군을 이끌고 「${chosen.name}」 성문을 두드렸습니다.`,
          effectSummary: `아군 「${chosen.name}」 병력 +35 합류`,
          accentColor: FACTIONS[playerFaction].color,
          targetCityId: chosen.id,
        },
      };
    }
  }

  // 군벌 내분: Strongest enemy faction loses 20% troops in its strongest city
  const enemyCities = ALL_CITY_IDS.map((id) => next[id])
    .filter((c) => c.owner !== playerFaction && c.owner !== 'neutral')
    .sort((a, b) => b.troops - a.troops);
  const target = enemyCities[0] ?? ALL_CITY_IDS.map((id) => next[id]).sort((a, b) => b.troops - a.troops)[0];
  const lost = Math.max(8, Math.round(target.troops * 0.2));
  target.troops = Math.max(10, target.troops - lost);

  return {
    cities: next,
    bonusAp: 0,
    maxFireUsesThisTurn: BASE_MAX_FIRE_USES,
    fireBonusRateThisTurn: 0,
    targetCityId: target.id,
    eventModal: {
      type: 'warlord_infighting',
      title: '적진 군벌 내분',
      subtitle: `${FACTIONS[target.owner].name} 내부 갈등`,
      description: `전리품 분배를 둘러싸고 ${FACTIONS[target.owner].name} 진영의 「${target.name}」 수비대 내부에서 내분이 벌어졌습니다.`,
      effectSummary: `${target.name}(${FACTIONS[target.owner].shortName}) 병력 -${lost}`,
      accentColor: '#8d5b1f',
      targetCityId: target.id,
    },
  };
}

export type AiActionPlan =
  | {
      type: 'attack';
      fromId: CityId;
      toId: CityId;
      ratio: MarchRatio;
    }
  | {
      type: 'transport';
      fromId: CityId;
      toId: CityId;
      ratio: MarchRatio;
    }
  | {
      type: 'recruit';
      cityId: CityId;
    };

export function planAiAction(
  cities: Record<CityId, CityState>,
  aiFaction: FactionId,
  lubuTargetFaction: PlayableFactionId | null
): AiActionPlan | null {
  const owned = getOwnedCities(cities, aiFaction);
  if (owned.length === 0) return null;

  const isLuBu = aiFaction === 'lubu';
  const minPowerRatio = isLuBu ? 0.9 : 1.12;
  const marchRatio: MarchRatio = isLuBu ? 0.8 : 0.8;

  let bestAttack: { fromId: CityId; toId: CityId; score: number } | null = null;

  for (const city of owned) {
    if (city.troops <= 18) continue;
    const sendTroops = getSendTroops(city.troops, marchRatio);
    if (sendTroops <= 0) continue;

    for (const adjId of city.adjacent) {
      const target = cities[adjId];
      if (target.owner === aiFaction) continue;

      const powerRatio = getExpectedPowerRatio(aiFaction, sendTroops, target);
      if (powerRatio < minPowerRatio) continue;

      let score = powerRatio;
      if (target.isImperial) score += 0.45;
      if (target.owner === 'neutral') score += 0.12;
      if (isLuBu && lubuTargetFaction && target.owner === lubuTargetFaction) {
        score += 3.0; // Lu Bu relentlessly prioritizes the betrayed leader!
      }

      if (!bestAttack || score > bestAttack.score) {
        bestAttack = { fromId: city.id, toId: target.id, score };
      }
    }
  }

  if (bestAttack) {
    return {
      type: 'attack',
      fromId: bestAttack.fromId,
      toId: bestAttack.toId,
      ratio: marchRatio,
    };
  }

  // Try reinforcing frontline from a safe rear city with surplus troops
  for (const city of owned) {
    const isRear = city.adjacent.every((adjId) => cities[adjId].owner === aiFaction);
    if (!isRear || city.troops < 42) continue;

    const frontlineNeighbor = city.adjacent
      .map((adjId) => cities[adjId])
      .filter((n) => n.owner === aiFaction && n.adjacent.some((x) => cities[x].owner !== aiFaction))
      .sort((a, b) => a.troops - b.troops)[0];

    if (frontlineNeighbor) {
      return {
        type: 'transport',
        fromId: city.id,
        toId: frontlineNeighbor.id,
        ratio: 0.8,
      };
    }
  }

  // Otherwise recruit at the frontline city with fewest troops (or lowest troop city)
  const frontlineCities = owned.filter((c) =>
    c.adjacent.some((adjId) => cities[adjId].owner !== aiFaction)
  );
  const recruitTarget = (frontlineCities.length > 0 ? frontlineCities : owned).sort(
    (a, b) => a.troops - b.troops
  )[0];

  return {
    type: 'recruit',
    cityId: recruitTarget.id,
  };
}

export function calculateVictoryRank(turns: number): {
  rank: VictoryRank;
  title: string;
  comment: string;
} {
  if (turns <= 15) {
    return {
      rank: 'SS',
      title: '전설의 신군',
      comment: '신화적인 지략과 전광석화 같은 결단력으로 순식간에 중원을 평정했습니다!',
    };
  }
  if (turns <= 20) {
    return {
      rank: 'S',
      title: '천하무적 패왕',
      comment: '압도적인 용병술과 기세로 삼국의 패권을 손에 쥐었습니다!',
    };
  }
  if (turns <= 25) {
    return {
      rank: 'A',
      title: '난세의 영웅',
      comment: '탁월한 전략과 균형 잡힌 운영으로 천하를 호령했습니다.',
    };
  }
  if (turns <= 30) {
    return {
      rank: 'B',
      title: '지략의 패자',
      comment: '치밀한 공방과 기민한 판단으로 중원의 주인이 되었습니다.',
    };
  }
  if (turns <= 35) {
    return {
      rank: 'C',
      title: '불굴의 명장',
      comment: '수많은 격전을 돌파하며 끝내 천하를 하나로 아울렀습니다.',
    };
  }
  if (turns <= 40) {
    return {
      rank: 'D',
      title: '노련한 제후',
      comment: '끈질긴 항전과 노련한 수성 끝에 대업을 완수했습니다.',
    };
  }
  return {
    rank: 'E',
    title: '백전노장',
    comment: '길고 험난한 대장정 끝에 마침내 태평성대를 열었습니다.',
  };
}

export function checkOutcome(
  cities: Record<CityId, CityState>,
  playerFaction: PlayableFactionId
): 'victory' | 'defeat' | null {
  const counts = countTerritories(cities);
  if (counts[playerFaction] === ALL_CITY_IDS.length) return 'victory';
  if (counts[playerFaction] === 0) return 'defeat';
  return null;
}

export function hasDefeatedLuBu(
  lubuSpawned: boolean,
  cities: Record<CityId, CityState>
): boolean {
  if (!lubuSpawned) return false;
  return countTerritories(cities).lubu === 0;
}

/**
 * Checks whether capturing a city eliminated Lu Bu or a rival playable lord (wei/shu/wu).
 * Excludes neutral cities and AI-on-AI eliminations.
 */
export function isMajorEliminationReward(
  attackerFaction: FactionId,
  defenderFaction: FactionId,
  playerFaction: PlayableFactionId,
  citiesAfterBattle: Record<CityId, CityState>
): boolean {
  if (attackerFaction !== playerFaction) return false;
  if (defenderFaction === 'neutral' || defenderFaction === playerFaction) return false;
  return countTerritories(citiesAfterBattle)[defenderFaction] === 0;
}

/**
 * Reserves +1 next-turn AP bonus on elimination (capped at +1 even if 2 factions fall in one turn).
 */
export function reserveVictoryBonusAp(
  currentNextTurnBonusAp: number,
  eliminatedMajorFaction: boolean
): number {
  if (eliminatedMajorFaction) return 1;
  return currentNextTurnBonusAp > 0 ? 1 : 0;
}

/**
 * Computes AP values for the start of the next player turn and resets nextTurnBonusAp to 0.
 * Any event bonus AP (e.g. Southeast Wind) stacks on top of turnMaxAp.
 */
export function resolveNextPlayerTurnAp(
  baseMaxAp: number,
  nextTurnBonusAp: number,
  eventBonusAp = 0
): {
  turnMaxAp: number;
  ap: number;
  nextTurnBonusAp: number;
  victoryApBonusActive: boolean;
} {
  const appliedVictoryBonus = nextTurnBonusAp > 0 ? 1 : 0;
  const turnMaxAp = baseMaxAp + appliedVictoryBonus;
  const ap = turnMaxAp + Math.max(0, eventBonusAp);
  return {
    turnMaxAp,
    ap,
    nextTurnBonusAp: 0,
    victoryApBonusActive: appliedVictoryBonus > 0,
  };
}

export function formatEliminationRewardMessage(eliminatedFaction: FactionId): string {
  if (eliminatedFaction === 'lubu') {
    return '🏆 여포군 토벌 완료! 승전의 기세로 다음 턴 행동력 +1 (3회 행동)';
  }
  const f = FACTIONS[eliminatedFaction];
  return `🏆 ${f.ruler}(${f.shortName}) 멸망! 다음 턴 행동력 +1 획득!`;
}

export function calculateAchievementScore(
  turns: number,
  totalTroops: number,
  lubuDefeated: boolean
): AchievementScoreBreakdown {
  const baseScore = Math.max(500, 10000 - turns * 150);
  const lubuBonus = lubuDefeated ? 1500 : 0;
  const troopBonus = Math.min(1500, Math.max(0, Math.round(totalTroops)));
  const totalScore = Math.min(15000, baseScore + lubuBonus + troopBonus);
  return {
    baseScore,
    lubuBonus,
    troopBonus,
    totalScore,
  };
}
