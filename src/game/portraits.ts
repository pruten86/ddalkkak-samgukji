import type { FactionId, PlayableFactionId } from './types';

export type PortraitEmotion =
  | 'idle'
  | 'attack'
  | 'defend'
  | 'victory'
  | 'defeat'
  | 'fire'
  | 'appear';

export type LordReactionTrigger =
  | 'idle'
  | 'recruit'
  | 'attack_win'
  | 'attack_lose'
  | 'defend_win'
  | 'defend_lose'
  | 'fire'
  | 'lubu_spawn'
  | 'lubu_defeated';

export interface PortraitCropConfig {
  /** Source artwork path inside /public */
  imageUrl: string;
  /** CSS background-position (% X, % Y) — adjust here to fine-tune face centering */
  bgPosition: string;
  /** CSS background-size (width % relative to circular portrait container) */
  bgSize: string;
  /** Default border accent matching the faction */
  ringColor: string;
  /** Fallback parchment tone behind the cropped sprite */
  backdropColor: string;
  /** Ruler display name for accessibility & labels */
  rulerName: string;
}

/**
 * Centralized crop coordinates for public/title-pc.png (2752 x 1536).
 * Tweak `bgPosition` and `bgSize` here to fine-tune any portrait framing.
 */
export const PORTRAIT_CROPS: Record<Exclude<FactionId, 'neutral'>, PortraitCropConfig> = {
  wei: {
    imageUrl: '/title-pc.png',
    bgPosition: '11.2% 7.4%',
    bgSize: '640% auto',
    ringColor: '#255a8a',
    backdropColor: '#d9e3ec',
    rulerName: '조조',
  },
  shu: {
    imageUrl: '/title-pc.png',
    bgPosition: '12.9% 70.6%',
    bgSize: '560% auto',
    ringColor: '#2e7d4f',
    backdropColor: '#dbe9df',
    rulerName: '유비',
  },
  wu: {
    imageUrl: '/title-pc.png',
    bgPosition: '92.8% 71.8%',
    bgSize: '550% auto',
    ringColor: '#b5382a',
    backdropColor: '#f1dfd9',
    rulerName: '손권',
  },
  lubu: {
    imageUrl: '/title-pc.png',
    bgPosition: '94.2% 15.2%',
    bgSize: '680% auto',
    ringColor: '#581c5c',
    backdropColor: '#e8daeb',
    rulerName: '여포',
  },
};

export const EMOTION_BADGES: Record<PortraitEmotion, string | null> = {
  idle: null,
  attack: '⚔️',
  defend: '🛡️',
  victory: '✨',
  defeat: '💧',
  fire: '🔥',
  appear: '⚡',
};

export const EMOTION_LABELS: Record<PortraitEmotion, string> = {
  idle: '대기',
  attack: '돌진',
  defend: '수비',
  victory: '환호',
  defeat: '피해',
  fire: '화공',
  appear: '강림',
};

export const LORD_DIALOGUES: Record<PlayableFactionId, Record<LordReactionTrigger, string[]>> = {
  shu: {
    idle: [
      '인덕으로 백성의 마음을 모아 중원을 품으리라.',
      '성지를 선택해 징병하거나 인접 거점으로 진군하시오.',
      '대의가 우리와 함께하니 서두르지 말고 나아가세.',
    ],
    recruit: [
      '의로운 백성들이 스스로 깃발 아래 모여드는구나!',
      '인덕을 좇는 장병들이 구름처럼 몰려왔다!',
    ],
    attack_win: [
      '대의가 승리를 이끌었노라! 백성을 먼저 위로하라!',
      '쾌거로다! 천하통일이 한 걸음 가까워졌다!',
    ],
    attack_lose: [
      '아아… 군사를 수습해 다음 기회를 도모하세.',
      '적의 수비가 만만치 않구나. 잠시 숨을 고르세.',
    ],
    defend_win: [
      '성벽을 굳건히 지켜냈구나! 모두 수고가 많았소!',
      '적의 공세를 멋지게 물리쳤소! 기세를 지키세.',
    ],
    defend_lose: [
      '성지를 내주고 말았구나… 반드시 되찾으리라!',
      '물러난 땅은 더 큰 힘으로 수복하겠소.',
    ],
    fire: [
      '화공이 적중했구나! 적진이 불길에 휩싸였다!',
      '바람을 탄 불길이 적의 군세를 꺾어놓았다!',
    ],
    lubu_spawn: [
      '천하무쌍 여포가 나타났다! 성지 방비를 단단히 하라!',
    ],
    lubu_defeated: [
      '여포군을 마침내 평정했다! 이제 천하통일이 눈앞이다!',
    ],
  },
  wei: {
    idle: [
      '천하의 영웅은 오직 나뿐. 패도로 중원을 평정하리라.',
      '망설일 시간은 없다. 출격할 성지를 즉시 지목하라.',
      '가장 먼저 천하를 쥐는 자가 곧 대의다.',
    ],
    recruit: [
      '정예 병력이 속속 집결하는군. 진군 준비를 마쳐라!',
      '군세가 날로 강성해진다! 천하가 내 손안에 있구나.',
    ],
    attack_win: [
      '하하하! 내 패도를 막을 자가 누구인가!',
      '완벽한 승리다. 기세를 몰아 다음 성지로 진군하라!',
    ],
    attack_lose: [
      '칫, 잠시 물러날 뿐. 곧 두 배로 되갚아 주마.',
      '방심했군. 즉시 전열을 가다듬고 다시 밀어붙여라!',
    ],
    defend_win: [
      '겨우 이 정도로 내 성을 노렸더냐? 어리석군!',
      '적의 공세를 완벽히 분쇄했다! 반격을 준비하라!',
    ],
    defend_lose: [
      '감히 내 성을 빼앗다니… 곧바로 짓밟아 주마!',
      '잠시 빌려준 것뿐이다. 당장 되찾아 오겠다.',
    ],
    fire: [
      '화염으로 적의 사기를 꺾어라! 통쾌한 화공이로구나!',
      '불바다 속에서 적군이 무너지는 꼴이 가관이군!',
    ],
    lubu_spawn: [
      '여포 놈이 또 반기를 들었군! 당장 목을 베어라!',
    ],
    lubu_defeated: [
      '천하무쌍 여포도 결국 내 발아래 무릎을 꿇었군!',
    ],
  },
  wu: {
    idle: [
      '강동의 철벽 수성으로 버티고, 무료 화공으로 적의 기세를 꺾으리라.',
      '장강을 방패 삼아 굳건히 지키고 화공으로 승부를 가르자.',
      '성벽은 든든하니 화공으로 적진을 흔든 뒤 진군하라.',
    ],
    recruit: [
      '강동의 젊은 용사들이 기꺼이 창칼을 들었구나!',
      '병력이 든든히 보충되었다! 수성과 화공의 태세를 갖추라.',
    ],
    attack_win: [
      '강동의 기세를 보았느냐! 훌륭한 승전보로다!',
      '빈틈을 찔러 성문을 열었다! 이 기세로 중원을 장악하라!',
    ],
    attack_lose: [
      '쉽게 뚫리지 않는군… 화공으로 먼저 흔든 뒤 다시 노리자.',
      '손실이 크군. 철벽 수성으로 버티며 다음 기회를 도모하라.',
    ],
    defend_win: [
      '장강의 수성을 뚫을 수는 없다! 적의 공세를 완벽히 막아냈다!',
      '철벽 수비 성공이로구나! 이제 화공으로 되갚아 주마!',
    ],
    defend_lose: [
      '방어선이 뚫렸다니… 화공과 반격으로 반드시 되찾겠다!',
      '성지를 잃었군. 전열을 정비해 강동의 위용을 되찾으리라.',
    ],
    fire: [
      '적벽의 불꽃을 보라! 화공이 적진을 삼켰다!',
      '거센 화염이 적군을 불태웠다! 지금이 진군할 기회로다!',
    ],
    lubu_spawn: [
      '여포가 출몰했군! 강동의 수성으로 버티고 화공으로 병력을 꺾어라!',
    ],
    lubu_defeated: [
      '여포마저 쓰러뜨렸다! 강동의 수성과 지략이 천하를 울린다!',
    ],
  },
};

export const LUBU_TAUNT_LINES = {
  againstPlayer:
    '“하하하! 내 앞에서 천하를 논하느냐? 방천화극으로 네 성지를 짓밟아 주마!”',
  againstRival:
    '“중원의 군웅들이 모두 허수아비로구나! 이제 이 여포가 천하를 호령하리라!”',
} as const;

export function pickLordLine(
  faction: PlayableFactionId,
  trigger: LordReactionTrigger,
  seed?: number
): string {
  const lines = LORD_DIALOGUES[faction][trigger];
  if (!lines || lines.length === 0) return '';
  if (typeof seed === 'number') {
    return lines[Math.abs(seed) % lines.length];
  }
  return lines[Math.floor(Math.random() * lines.length)];
}
