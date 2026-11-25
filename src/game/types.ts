export type PlayableFactionId = 'shu' | 'wei' | 'wu';
export type FactionId = PlayableFactionId | 'neutral' | 'lubu';

export type CityId =
  | 'beiping'
  | 'ye'
  | 'changan'
  | 'luoyang'
  | 'xuchang'
  | 'xiapi'
  | 'hanzhong'
  | 'chengdu'
  | 'xiangyang'
  | 'jiangling'
  | 'hefei'
  | 'jianye'
  | 'chaisang'
  | 'changsha'
  | 'kuaiji';

export type CommandMode = 'idle' | 'march' | 'fire';
export type MarchRatio = 0.5 | 0.8 | 0.95;
export type ForecastLevel = '우세' | '박빙' | '열세';
export type GamePhase = 'splash' | 'lobby' | 'playing' | 'victory' | 'defeat';
export type VictoryRank = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E';

export interface AchievementScoreBreakdown {
  baseScore: number;
  lubuBonus: number;
  troopBonus: number;
  totalScore: number;
}

export interface FactionConfig {
  id: FactionId;
  name: string;
  shortName: string;
  ruler: string;
  color: string;
  darkColor: string;
  softBg: string;
  traitName: string;
  traitSummary: string;
  attackMult: number;
  defenseMult: number;
  recruitMult: number;
  startSummary?: string;
}

export interface CityDefinition {
  id: CityId;
  name: string;
  x: number;
  y: number;
  initialOwner: FactionId;
  initialTroops: number;
  adjacent: CityId[];
  isImperial?: boolean;
}

export interface CityState {
  id: CityId;
  name: string;
  x: number;
  y: number;
  owner: FactionId;
  troops: number;
  adjacent: CityId[];
  isImperial: boolean;
}

export interface BattleResult {
  fromId: CityId;
  toId: CityId;
  attackerFaction: FactionId;
  defenderFaction: FactionId;
  sentTroops: number;
  defenderInitialTroops: number;
  attackPower: number;
  defensePower: number;
  attackerWon: boolean;
  remainingTroops: number;
}

export interface MarchArrowEffect {
  id: string;
  fromId: CityId;
  toId: CityId;
  faction: FactionId;
  troops: number;
  kind: 'attack' | 'transport';
}

export interface CityBurstEffect {
  id: string;
  cityId: CityId;
  kind: 'fire' | 'clash' | 'recruit' | 'capture' | 'lubu';
  label: string;
  color: string;
}

export type RandomEventType =
  | 'harvest'
  | 'southeast_wind'
  | 'plague'
  | 'renowned_general'
  | 'warlord_infighting'
  | 'lubu_appearance';

export interface GameEventModalData {
  type: RandomEventType;
  title: string;
  subtitle: string;
  description: string;
  effectSummary: string;
  accentColor: string;
  isLuBu?: boolean;
  victimIsPlayer?: boolean;
  targetCityId?: CityId;
}

export interface ChronicleEntry {
  id: string;
  turn: number;
  text: string;
  faction?: FactionId;
  highlight?: 'battle' | 'event' | 'lubu' | 'normal';
}

export interface GameStats {
  battlesWon: number;
  battlesFought: number;
  firesUsed: number;
  peakTerritories: number;
}

export interface GameState {
  phase: GamePhase;
  playerFaction: PlayableFactionId;
  turn: number;
  ap: number;
  maxAp: number;
  turnMaxAp: number;
  nextTurnBonusAp: number;
  victoryApBonusActive: boolean;
  fireUsesThisTurn: number;
  maxFireUsesThisTurn: number;
  fireBonusRateThisTurn: number;
  cities: Record<CityId, CityState>;
  selectedCityId: CityId | null;
  commandMode: CommandMode;
  marchRatio: MarchRatio;
  lubuSpawned: boolean;
  lubuDefeated: boolean;
  lubuTargetFaction: PlayableFactionId | null;
  isAiTurn: boolean;
  activeAiFaction: FactionId | null;
  pendingEvent: GameEventModalData | null;
  chronicle: ChronicleEntry[];
  stats: GameStats;
}
