import type {
  CityDefinition,
  CityId,
  FactionConfig,
  FactionId,
  PlayableFactionId,
  VictoryRank,
} from './types';

export const PLAYABLE_FACTIONS: PlayableFactionId[] = ['shu', 'wei', 'wu'];
export const ALL_CITY_IDS: CityId[] = [
  'beiping',
  'ye',
  'changan',
  'luoyang',
  'xuchang',
  'xiapi',
  'hanzhong',
  'chengdu',
  'xiangyang',
  'jiangling',
  'hefei',
  'jianye',
  'chaisang',
  'changsha',
  'kuaiji',
];

export const FACTIONS: Record<FactionId, FactionConfig> = {
  shu: {
    id: 'shu',
    name: '촉 (유비)',
    shortName: '촉',
    ruler: '유비',
    color: '#2e7d4f',
    darkColor: '#1f5737',
    softBg: '#e4f1e9',
    traitName: '인덕',
    traitSummary: '징병량 +25%',
    attackMult: 1.0,
    defenseMult: 1.0,
    recruitMult: 1.25,
    startSummary: '성도(70) · 강릉(55)',
  },
  wei: {
    id: 'wei',
    name: '위 (조조)',
    shortName: '위',
    ruler: '조조',
    color: '#255a8a',
    darkColor: '#193e61',
    softBg: '#e3edf6',
    traitName: '패도',
    traitSummary: '공격력 +15%',
    attackMult: 1.15,
    defenseMult: 1.0,
    recruitMult: 1.0,
    startSummary: '허창(70) · 하비(55)',
  },
  wu: {
    id: 'wu',
    name: '오 (손권)',
    shortName: '오',
    ruler: '손권',
    color: '#b5382a',
    darkColor: '#81251b',
    softBg: '#f8e6e4',
    traitName: '수성',
    traitSummary: '방어 +20% · 화공 0 AP',
    attackMult: 1.0,
    defenseMult: 1.2,
    recruitMult: 1.0,
    startSummary: '건업(70) · 시상(55)',
  },
  neutral: {
    id: 'neutral',
    name: '군웅',
    shortName: '군웅',
    ruler: '군웅',
    color: '#73685c',
    darkColor: '#4f473e',
    softBg: '#ece8e2',
    traitName: '할거',
    traitSummary: '턴당 소량 보충',
    attackMult: 1.0,
    defenseMult: 1.0,
    recruitMult: 1.0,
  },
  lubu: {
    id: 'lubu',
    name: '여포군',
    shortName: '여포',
    ruler: '여포',
    color: '#581c5c',
    darkColor: '#3a113d',
    softBg: '#efe3f0',
    traitName: '무쌍',
    traitSummary: '공격 +35% · 방어 +10% · 징병 +15%',
    attackMult: 1.35,
    defenseMult: 1.1,
    recruitMult: 1.15,
  },
};

export const INITIAL_CITIES: CityDefinition[] = [
  {
    id: 'beiping',
    name: '북평',
    x: 655,
    y: 70,
    initialOwner: 'neutral',
    initialTroops: 45,
    adjacent: ['ye'],
  },
  {
    id: 'ye',
    name: '업',
    x: 535,
    y: 130,
    initialOwner: 'neutral',
    initialTroops: 60,
    adjacent: ['beiping', 'luoyang', 'xuchang', 'xiapi'],
  },
  {
    id: 'changan',
    name: '장안',
    x: 265,
    y: 210,
    initialOwner: 'neutral',
    initialTroops: 55,
    adjacent: ['luoyang', 'hanzhong'],
  },
  {
    id: 'luoyang',
    name: '낙양',
    x: 390,
    y: 215,
    initialOwner: 'neutral',
    initialTroops: 75,
    adjacent: ['changan', 'ye', 'xuchang', 'xiangyang'],
    isImperial: true,
  },
  {
    id: 'xuchang',
    name: '허창',
    x: 490,
    y: 255,
    initialOwner: 'wei',
    initialTroops: 70,
    adjacent: ['ye', 'luoyang', 'xiapi', 'hefei', 'xiangyang'],
  },
  {
    id: 'xiapi',
    name: '하비',
    x: 635,
    y: 225,
    initialOwner: 'wei',
    initialTroops: 55,
    adjacent: ['ye', 'xuchang', 'hefei', 'jianye'],
  },
  {
    id: 'hanzhong',
    name: '한중',
    x: 215,
    y: 290,
    initialOwner: 'neutral',
    initialTroops: 50,
    adjacent: ['changan', 'chengdu', 'xiangyang'],
  },
  {
    id: 'chengdu',
    name: '성도',
    x: 150,
    y: 390,
    initialOwner: 'shu',
    initialTroops: 70,
    adjacent: ['hanzhong', 'jiangling'],
  },
  {
    id: 'xiangyang',
    name: '양양',
    x: 395,
    y: 330,
    initialOwner: 'neutral',
    initialTroops: 60,
    adjacent: ['luoyang', 'xuchang', 'hanzhong', 'jiangling', 'chaisang'],
  },
  {
    id: 'jiangling',
    name: '강릉',
    x: 345,
    y: 405,
    initialOwner: 'shu',
    initialTroops: 55,
    adjacent: ['chengdu', 'xiangyang', 'changsha'],
  },
  {
    id: 'hefei',
    name: '합비',
    x: 560,
    y: 315,
    initialOwner: 'neutral',
    initialTroops: 55,
    adjacent: ['xuchang', 'xiapi', 'jianye', 'chaisang'],
  },
  {
    id: 'jianye',
    name: '건업',
    x: 665,
    y: 345,
    initialOwner: 'wu',
    initialTroops: 70,
    adjacent: ['xiapi', 'hefei', 'chaisang', 'kuaiji'],
  },
  {
    id: 'chaisang',
    name: '시상',
    x: 515,
    y: 395,
    initialOwner: 'wu',
    initialTroops: 55,
    adjacent: ['xiangyang', 'hefei', 'jianye', 'changsha', 'kuaiji'],
  },
  {
    id: 'changsha',
    name: '장사',
    x: 430,
    y: 465,
    initialOwner: 'neutral',
    initialTroops: 45,
    adjacent: ['jiangling', 'chaisang', 'kuaiji'],
  },
  {
    id: 'kuaiji',
    name: '회계',
    x: 680,
    y: 455,
    initialOwner: 'neutral',
    initialTroops: 45,
    adjacent: ['jianye', 'chaisang', 'changsha'],
  },
];

export const BASE_RECRUIT_TROOPS = 35;
export const LUOYANG_TURN_BONUS = 20;
export const LUOYANG_DEFENSE_BONUS = 0.1;
export const BASE_FIRE_LOSS_RATE = 0.3;
export const SOUTHEAST_WIND_FIRE_BONUS = 0.1;
export const BASE_MAX_FIRE_USES = 1;
export const SOUTHEAST_WIND_MAX_FIRE_USES = 2;
export const MIN_GARRISON_TROOPS = 5;
export const NEUTRAL_REPLENISH_TROOPS = 4;
export const NEUTRAL_TROOP_CAP = 80;
export const MAX_AP = 2;

export function getStartingCityForFaction(faction: PlayableFactionId): CityId {
  if (faction === 'shu') return 'chengdu';
  if (faction === 'wei') return 'xuchang';
  return 'jianye';
}

export const VICTORY_RANKS: readonly VictoryRank[] = ['SS', 'S', 'A', 'B', 'C', 'D', 'E'] as const;

export const VICTORY_RANK_GUIDE_TEXT =
  '등급 기준: ~15턴 SS · 16~20 S · 21~25 A · 26~30 B · 31~35 C · 36~40 D · 41+ E';

export interface VictoryRankStyle {
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeShadow?: string;
  canvasFillStart: string;
  canvasFillEnd?: string;
  canvasBorder: string;
  canvasInnerBorder: string;
  canvasText: string;
  isTopTier?: boolean;
}

export const VICTORY_RANK_STYLES: Record<VictoryRank, VictoryRankStyle> = {
  SS: {
    badgeBg: 'linear-gradient(135deg, #8b140e 0%, #b8291d 48%, #c98f1a 100%)',
    badgeBorder: '#e6ba4c',
    badgeText: '#fff8db',
    badgeShadow: '0 0 0 1px rgba(230, 186, 76, 0.55), 0 2px 8px rgba(173, 118, 16, 0.38)',
    canvasFillStart: '#8d1610',
    canvasFillEnd: '#c78f1a',
    canvasBorder: '#e5b849',
    canvasInnerBorder: 'rgba(255, 240, 184, 0.9)',
    canvasText: '#fff8dc',
    isTopTier: true,
  },
  S: {
    badgeBg: '#a3261d',
    badgeBorder: '#6f1710',
    badgeText: '#faf3e3',
    canvasFillStart: '#a3261d',
    canvasBorder: '#6c1610',
    canvasInnerBorder: 'rgba(250, 243, 227, 0.78)',
    canvasText: '#faf3e3',
  },
  A: {
    badgeBg: '#b3680e',
    badgeBorder: '#7c4506',
    badgeText: '#fff8ea',
    canvasFillStart: '#b3680e',
    canvasBorder: '#7a4406',
    canvasInnerBorder: 'rgba(255, 247, 230, 0.74)',
    canvasText: '#fff8ea',
  },
  B: {
    badgeBg: '#2b784c',
    badgeBorder: '#1b5032',
    badgeText: '#f3fbf6',
    canvasFillStart: '#2b784c',
    canvasBorder: '#1b5032',
    canvasInnerBorder: 'rgba(243, 251, 246, 0.72)',
    canvasText: '#f3fbf6',
  },
  C: {
    badgeBg: '#245887',
    badgeBorder: '#173b5c',
    badgeText: '#f0f6fc',
    canvasFillStart: '#245887',
    canvasBorder: '#173b5c',
    canvasInnerBorder: 'rgba(240, 246, 252, 0.72)',
    canvasText: '#f0f6fc',
  },
  D: {
    badgeBg: '#746148',
    badgeBorder: '#4f412f',
    badgeText: '#f8f3ea',
    canvasFillStart: '#746148',
    canvasBorder: '#4f412f',
    canvasInnerBorder: 'rgba(248, 243, 234, 0.68)',
    canvasText: '#f8f3ea',
  },
  E: {
    badgeBg: '#57514b',
    badgeBorder: '#3a3631',
    badgeText: '#efebe5',
    canvasFillStart: '#57514b',
    canvasBorder: '#3a3631',
    canvasInnerBorder: 'rgba(239, 235, 229, 0.65)',
    canvasText: '#efebe5',
  },
};
