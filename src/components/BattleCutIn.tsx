import { FACTIONS } from '../game/data';
import type { PortraitEmotion } from '../game/portraits';
import type { FactionId, FireResultGrade } from '../game/types';
import { LordPortrait } from './LordPortrait';

export interface BattleCutInData {
  id: string;
  kind: 'capture' | 'defend' | 'fire';
  fireGrade?: FireResultGrade;
  cityName: string;
  attackerFaction: FactionId;
  defenderFaction: FactionId;
  attackerEmotion: PortraitEmotion;
  defenderEmotion: PortraitEmotion;
  headline: string;
  subline: string;
}

interface BattleCutInProps {
  cutIn: BattleCutInData;
  onDismiss: () => void;
}

const ACCENT_BY_KIND: Record<
  BattleCutInData['kind'],
  { border: string; badgeBg: string; headlineColor: string }
> = {
  capture: {
    border: '#d4a017',
    badgeBg: 'rgba(212, 160, 23, 0.2)',
    headlineColor: '#f7dc88',
  },
  defend: {
    border: '#5e9ed6',
    badgeBg: 'rgba(94, 158, 214, 0.2)',
    headlineColor: '#cfe6fb',
  },
  fire: {
    border: '#ea580c',
    badgeBg: 'rgba(234, 88, 12, 0.24)',
    headlineColor: '#fdba74',
  },
};

export function BattleCutIn({ cutIn, onDismiss }: BattleCutInProps) {
  const attacker = FACTIONS[cutIn.attackerFaction];
  const defender = FACTIONS[cutIn.defenderFaction];
  const baseTheme = ACCENT_BY_KIND[cutIn.kind];
  const isGreatFire = cutIn.kind === 'fire' && cutIn.fireGrade === 'great';
  const isMinorFire = cutIn.kind === 'fire' && cutIn.fireGrade === 'minor';
  const theme = isGreatFire
    ? {
        border: '#eab63e',
        badgeBg: 'rgba(185, 28, 28, 0.42)',
        headlineColor: '#ffe38e',
      }
    : isMinorFire
      ? {
          border: '#c26c24',
          badgeBg: 'rgba(194, 108, 36, 0.22)',
          headlineColor: '#f5c088',
        }
      : baseTheme;

  return (
    <div
      className="pointer-events-none absolute inset-x-2 top-2 z-20 flex justify-center sm:top-3"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onDismiss}
        title="클릭하여 닫기"
        data-testid="battle-cutin"
        data-kind={cutIn.kind}
        data-fire-grade={cutIn.fireGrade}
        className="battle-cutin-enter pointer-events-auto flex w-full max-w-[356px] cursor-pointer items-center justify-between gap-2 rounded-lg border-2 bg-[#221c16]/95 px-2.5 py-2 text-left text-[#faf3e3] shadow-xl backdrop-blur-[2px] transition-opacity hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5ecd8] sm:max-w-[404px] sm:gap-3 sm:px-3.5 sm:py-2.5"
        style={{
          borderColor: theme.border,
          boxShadow: isGreatFire
            ? '0 10px 26px rgba(153, 27, 27, 0.45), 0 0 18px rgba(234, 182, 62, 0.4)'
            : undefined,
        }}
      >
        {/* Left: Attacker Portrait */}
        <div className="flex shrink-0 flex-col items-center">
          <LordPortrait
            faction={cutIn.attackerFaction}
            emotion={cutIn.attackerEmotion}
            size="sm"
          />
          <span className="mt-0.5 text-[10px] font-bold text-[#e6d8be] whitespace-nowrap">
            {attacker.ruler}
          </span>
        </div>

        {/* Center: VS Result Headline */}
        <div className="min-w-0 flex-1 text-center">
          <div className="mb-0.5 flex items-center justify-center gap-1.5 text-[10px] font-bold tracking-wider text-[#cbbca3]">
            <span style={{ color: attacker.color === '#581c5c' ? '#d8a6e0' : '#f2dfc0' }}>
              공격
            </span>
            <span
              className="rounded px-1.5 py-0.2 font-display text-[10px] font-black text-[#faf3e3]"
              style={{ backgroundColor: theme.badgeBg }}
            >
              VS
            </span>
            <span>수비</span>
          </div>
          <p
            data-testid="battle-cutin-headline"
            className="truncate font-display text-sm font-black tracking-tight sm:text-base"
            style={{ color: theme.headlineColor }}
          >
            {cutIn.headline}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-[#d8cab0]">
            {cutIn.subline}
          </p>
        </div>

        {/* Right: Defender Portrait */}
        <div className="flex shrink-0 flex-col items-center">
          <LordPortrait
            faction={cutIn.defenderFaction}
            emotion={cutIn.defenderEmotion}
            size="sm"
          />
          <span className="mt-0.5 text-[10px] font-bold text-[#e6d8be] whitespace-nowrap">
            {defender.ruler}
          </span>
        </div>
      </button>
    </div>
  );
}
