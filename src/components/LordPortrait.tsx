import type { CSSProperties } from 'react';
import { FACTIONS } from '../game/data';
import {
  EMOTION_BADGES,
  EMOTION_LABELS,
  PORTRAIT_CROPS,
  type PortraitEmotion,
} from '../game/portraits';
import type { FactionId } from '../game/types';

export type PortraitSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LordPortraitProps {
  faction: FactionId;
  emotion?: PortraitEmotion;
  size?: PortraitSize;
  className?: string;
  ariaLabel?: string;
}

const SIZE_CLASSES: Record<PortraitSize, string> = {
  xs: 'h-9 w-9',
  sm: 'h-11 w-11',
  md: 'h-14 w-14',
  lg: 'h-[68px] w-[68px]',
  xl: 'h-24 w-24',
};

const BADGE_SIZE_CLASSES: Record<PortraitSize, string> = {
  xs: 'h-4 w-4 text-[10px] -top-1 -right-1',
  sm: 'h-5 w-5 text-[11px] -top-1 -right-1',
  md: 'h-6 w-6 text-xs -top-1 -right-1',
  lg: 'h-7 w-7 text-sm -top-1 -right-1',
  xl: 'h-8 w-8 text-base -top-1.5 -right-1.5',
};

const EMOTION_ANIM_CLASS: Record<PortraitEmotion, string> = {
  idle: 'portrait-anim-idle',
  attack: 'portrait-anim-attack',
  defend: 'portrait-anim-defend',
  victory: 'portrait-anim-victory',
  defeat: 'portrait-anim-defeat',
  fire: 'portrait-anim-fire',
  appear: 'portrait-anim-appear',
};

export function LordPortrait({
  faction,
  emotion = 'idle',
  size = 'md',
  className = '',
  ariaLabel,
}: LordPortraitProps) {
  const factionInfo = FACTIONS[faction];
  const badge = EMOTION_BADGES[emotion];
  const isNeutral = faction === 'neutral';
  const crop = isNeutral ? null : PORTRAIT_CROPS[faction];

  // Dynamic border & aura styling based on emotion
  let borderColor = crop ? crop.ringColor : '#73685c';
  let frameExtraClass = '';
  if (emotion === 'victory') {
    borderColor = '#d4a017';
    frameExtraClass = 'portrait-ring-victory';
  } else if (emotion === 'fire') {
    borderColor = '#dc2626';
    frameExtraClass = 'portrait-ring-fire';
  } else if (emotion === 'appear') {
    borderColor = '#581c5c';
    frameExtraClass = 'portrait-ring-appear';
  }

  const spriteStyle: CSSProperties | undefined = crop
    ? {
        backgroundImage: `url("${crop.imageUrl}")`,
        backgroundPosition: crop.bgPosition,
        backgroundSize: crop.bgSize,
        backgroundRepeat: 'no-repeat',
        backgroundColor: crop.backdropColor,
        filter: emotion === 'defeat' ? 'grayscale(65%) brightness(0.92)' : undefined,
      }
    : {
        filter: emotion === 'defeat' ? 'grayscale(65%) brightness(0.92)' : undefined,
      };

  const accessibleLabel =
    ariaLabel ??
    `${factionInfo.shortName} ${factionInfo.ruler} 초상화 (${EMOTION_LABELS[emotion]})`;

  return (
    <div
      role="img"
      aria-label={accessibleLabel}
      data-testid={`lord-portrait-${faction}`}
      data-emotion={emotion}
      className={`relative inline-flex shrink-0 select-none items-center justify-center ${SIZE_CLASSES[size]} ${EMOTION_ANIM_CLASS[emotion]} ${className}`}
    >
      {/* Circular Portrait Frame */}
      <div
        className={`relative h-full w-full overflow-hidden rounded-full border-2 shadow-sm transition-[border-color,box-shadow] duration-200 ${frameExtraClass}`}
        style={{ borderColor }}
      >
        {isNeutral ? (
          <div
            className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#ebe1cd] to-[#d2c3a7]"
            style={spriteStyle}
          >
            {/* Antique-map fortress shield emblem for neutral warlords */}
            <svg
              viewBox="0 0 40 40"
              className="h-[72%] w-[72%]"
              aria-hidden="true"
            >
              <path
                d="M20 4 L32 8.5 V19.5 C32 27.2 26.8 33.1 20 36 C13.2 33.1 8 27.2 8 19.5 V8.5 Z"
                fill="#73685c"
                stroke="#3f362c"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M14 14 H17 V17 H19 V14 H21 V17 H23 V14 H26 V26 H14 Z"
                fill="#f5ecd8"
              />
              <rect x="18.2" y="21" width="3.6" height="5" rx="1.6" fill="#544a40" />
            </svg>
          </div>
        ) : (
          <div
            className="h-full w-full transition-[filter] duration-200"
            style={spriteStyle}
          />
        )}

        {/* Subtle antique inner rim */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-black/15"
        />
      </div>

      {/* Top-right emotion emoji badge */}
      {badge && (
        <span
          aria-hidden="true"
          data-testid={`lord-portrait-badge-${faction}`}
          className={`portrait-badge-pop pointer-events-none absolute z-10 flex items-center justify-center rounded-full border border-[#c8b288] bg-[#fdf7e8] leading-none shadow-sm ${BADGE_SIZE_CLASSES[size]}`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
