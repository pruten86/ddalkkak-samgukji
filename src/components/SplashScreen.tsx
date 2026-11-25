import { useEffect, useState, type CSSProperties } from 'react';
import { sound } from '../game/sound';

interface SplashScreenProps {
  onProceed: () => void;
}

interface EmberSpec {
  id: string;
  leftPct: number;
  bottomPct: number;
  sizePx: number;
  risePx: number;
  driftPx: number;
  durationSec: number;
  delaySec: number;
  opacity: number;
  warmTint: 'bright' | 'gold' | 'amber';
}

// 14 subtle golden ink-and-ember motes drifting gently upward across the splash illustration
const SPLASH_EMBERS: readonly EmberSpec[] = [
  { id: 'e1', leftPct: 8, bottomPct: 12, sizePx: 4, risePx: 145, driftPx: 14, durationSec: 6.4, delaySec: -1.1, opacity: 0.65, warmTint: 'gold' },
  { id: 'e2', leftPct: 15, bottomPct: 28, sizePx: 5.5, risePx: 175, driftPx: -12, durationSec: 7.8, delaySec: -4.2, opacity: 0.72, warmTint: 'bright' },
  { id: 'e3', leftPct: 22, bottomPct: 8, sizePx: 3.5, risePx: 130, driftPx: 10, durationSec: 5.9, delaySec: -2.6, opacity: 0.58, warmTint: 'amber' },
  { id: 'e4', leftPct: 29, bottomPct: 36, sizePx: 4.5, risePx: 165, driftPx: -16, durationSec: 8.2, delaySec: -5.4, opacity: 0.64, warmTint: 'gold' },
  { id: 'e5', leftPct: 36, bottomPct: 16, sizePx: 6, risePx: 195, driftPx: 15, durationSec: 7.1, delaySec: -0.6, opacity: 0.74, warmTint: 'bright' },
  { id: 'e6', leftPct: 43, bottomPct: 24, sizePx: 3.5, risePx: 140, driftPx: -11, durationSec: 6.2, delaySec: -3.5, opacity: 0.6, warmTint: 'gold' },
  { id: 'e7', leftPct: 49, bottomPct: 10, sizePx: 5, risePx: 185, driftPx: 12, durationSec: 8.6, delaySec: -6.1, opacity: 0.7, warmTint: 'amber' },
  { id: 'e8', leftPct: 56, bottomPct: 30, sizePx: 4, risePx: 155, driftPx: -14, durationSec: 6.9, delaySec: -1.9, opacity: 0.66, warmTint: 'bright' },
  { id: 'e9', leftPct: 62, bottomPct: 14, sizePx: 5.5, risePx: 180, driftPx: 16, durationSec: 7.6, delaySec: -4.8, opacity: 0.72, warmTint: 'gold' },
  { id: 'e10', leftPct: 69, bottomPct: 22, sizePx: 3.5, risePx: 135, driftPx: -10, durationSec: 5.8, delaySec: -2.2, opacity: 0.56, warmTint: 'amber' },
  { id: 'e11', leftPct: 76, bottomPct: 9, sizePx: 4.5, risePx: 170, driftPx: 13, durationSec: 8.1, delaySec: -5.9, opacity: 0.68, warmTint: 'gold' },
  { id: 'e12', leftPct: 82, bottomPct: 34, sizePx: 6, risePx: 190, driftPx: -15, durationSec: 7.4, delaySec: -0.9, opacity: 0.74, warmTint: 'bright' },
  { id: 'e13', leftPct: 88, bottomPct: 18, sizePx: 4, risePx: 150, driftPx: 11, durationSec: 6.6, delaySec: -3.8, opacity: 0.62, warmTint: 'gold' },
  { id: 'e14', leftPct: 93, bottomPct: 26, sizePx: 3.5, risePx: 140, driftPx: -12, durationSec: 7.2, delaySec: -4.9, opacity: 0.58, warmTint: 'amber' },
];

const EMBER_GRADIENT_BY_TINT: Record<EmberSpec['warmTint'], string> = {
  bright: 'radial-gradient(circle, #fffbe2 0%, #f8d465 55%, rgba(235, 168, 42, 0) 100%)',
  gold: 'radial-gradient(circle, #fff3c0 0%, #eebf47 58%, rgba(214, 138, 26, 0) 100%)',
  amber: 'radial-gradient(circle, #ffe5a3 0%, #e4972b 60%, rgba(196, 98, 22, 0) 100%)',
};

// Exact natural dimensions & citadel-click anchor coordinates (percent of image bounds)
const SPLASH_ARTWORK_LAYOUT = {
  pc: {
    src: '/title-pc.png',
    aspectRatio: '2752 / 1536',
    stageWidthExpr: 'min(100vw, calc(100dvh * 2752 / 1536))',
    citadelLeftPct: 51.6,
    citadelTopPct: 56.2,
    rippleWidthPct: 19,
  },
  mobile: {
    src: '/title-mobile.png',
    aspectRatio: '1536 / 2752',
    stageWidthExpr: 'min(100vw, calc(100dvh * 1536 / 2752))',
    citadelLeftPct: 51.4,
    citadelTopPct: 61.4,
    rippleWidthPct: 34,
  },
} as const;

const CITADEL_SPARKLES: ReadonlyArray<{
  cx: number;
  cy: number;
  size: number;
  delay: string;
}> = [
  { cx: 42, cy: 48, size: 12, delay: '0.06s' },
  { cx: 160, cy: 52, size: 13, delay: '0.22s' },
  { cx: 34, cy: 120, size: 10, delay: '0.38s' },
  { cx: 164, cy: 130, size: 11, delay: '0.16s' },
  { cx: 102, cy: 22, size: 14, delay: '0.3s' },
] as const;

function buildFourPointStarPath(cx: number, cy: number, r: number): string {
  const inner = r * 0.28;
  return [
    `M ${cx} ${cy - r}`,
    `Q ${cx + inner * 0.45} ${cy - inner * 0.45} ${cx + r} ${cy}`,
    `Q ${cx + inner * 0.45} ${cy + inner * 0.45} ${cx} ${cy + r}`,
    `Q ${cx - inner * 0.45} ${cy + inner * 0.45} ${cx - r} ${cy}`,
    `Q ${cx - inner * 0.45} ${cy - inner * 0.45} ${cx} ${cy - r}`,
    'Z',
  ].join(' ');
}

function getIsPcLayout(): boolean {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= 768 && window.innerWidth >= window.innerHeight;
}

export function SplashScreen({ onProceed }: SplashScreenProps) {
  const [isPc, setIsPc] = useState<boolean>(() => getIsPcLayout());
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const updateLayout = () => setIsPc(getIsPcLayout());
    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);
    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, []);

  const triggerProceed = () => {
    if (fading) return;
    // Play signature '딸-깍' (+ subtle trailing drum) synchronously inside the user gesture
    sound.playSplashStart();
    setFading(true);
    window.setTimeout(() => {
      onProceed();
    }, 180);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerProceed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const artwork = isPc ? SPLASH_ARTWORK_LAYOUT.pc : SPLASH_ARTWORK_LAYOUT.mobile;

  return (
    <main
      className={`relative h-[100dvh] w-full overflow-hidden bg-[#e8d8b9] transition-opacity duration-200 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <button
        type="button"
        onClick={triggerProceed}
        data-testid="splash-start"
        aria-label="딸깍 삼국지 시작하기"
        className="group relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden bg-[#e8d8b9] p-0 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#231f1a]"
      >
        {/* Aspect-ratio-locked stage matching the rendered illustration bounds 1:1 */}
        <div
          data-testid="splash-artwork-stage"
          className="relative overflow-hidden transition-transform duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active:scale-[0.992]"
          style={{
            aspectRatio: artwork.aspectRatio,
            width: artwork.stageWidthExpr,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {/* Breathing layer: scales artwork + citadel click overlay together so anchors never drift */}
          <div className="animate-splash-breathe relative h-full w-full">
            <img
              src={artwork.src}
              alt="딸깍 삼국지 — 5분만에 천하통일 타이틀 일러스트"
              referrerPolicy="no-referrer"
              className="block h-full w-full select-none object-cover"
              data-testid={isPc ? 'splash-img-pc' : 'splash-img-mobile'}
            />

            {/* Central Golden Citadel & Hand Cursor "딸깍" Click Ripple + Starlight Sparkles */}
            <div
              aria-hidden="true"
              data-testid="splash-citadel-fx"
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${artwork.citadelLeftPct}%`,
                top: `${artwork.citadelTopPct}%`,
                width: `${artwork.rippleWidthPct}%`,
                aspectRatio: '1 / 1',
              }}
            >
              <svg
                viewBox="0 0 200 200"
                className="h-full w-full overflow-visible"
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(212, 128, 14, 0.72))',
                }}
                aria-hidden="true"
                focusable="false"
              >
                <defs>
                  <radialGradient id="splash-citadel-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fff9dc" stopOpacity="0.95" />
                    <stop offset="45%" stopColor="#f7be38" stopOpacity="0.52" />
                    <stop offset="100%" stopColor="#d98212" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Brief warm click impact flash at the citadel/fingertip focal point */}
                <circle
                  cx="104"
                  cy="108"
                  r="42"
                  fill="url(#splash-citadel-glow)"
                  className="animate-splash-impact"
                />

                {/* Primary golden click ripple ring (2.2s cycle) with crisp amber-gold legibility */}
                <circle
                  cx="102"
                  cy="104"
                  r="54"
                  fill="none"
                  stroke="#f4b324"
                  strokeWidth="6"
                  className="animate-splash-ripple"
                />
                <circle
                  cx="102"
                  cy="104"
                  r="54"
                  fill="none"
                  stroke="#fff5c4"
                  strokeWidth="2.4"
                  className="animate-splash-ripple"
                />

                {/* Secondary staggered outer golden ripple ring */}
                <circle
                  cx="102"
                  cy="104"
                  r="54"
                  fill="none"
                  stroke="#e39414"
                  strokeWidth="3.5"
                  className="animate-splash-ripple-delayed"
                />

                {/* Starlight 4-point sparkles synced around the golden citadel sunburst */}
                {CITADEL_SPARKLES.map((star, index) => (
                  <path
                    key={index}
                    d={buildFourPointStarPath(star.cx, star.cy, star.size)}
                    fill="#fffbe0"
                    stroke="#cc7e0e"
                    strokeWidth="1.6"
                    className="animate-splash-sparkle"
                    style={{ animationDelay: star.delay }}
                  />
                ))}
              </svg>
            </div>

            {/* Subtle warm pulse behind mobile artwork's baked-in "터치하여 시작!" banner */}
            {!isPc && (
              <div
                aria-hidden="true"
                data-testid="splash-mobile-glow"
                className="animate-splash-mobile-glow pointer-events-none absolute left-1/2 bottom-[3.6%] h-[7.5%] w-[64%] -translate-x-1/2 rounded-full"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(255, 224, 125, 0.55) 0%, rgba(235, 174, 52, 0.16) 58%, rgba(235, 174, 52, 0) 100%)',
                }}
              />
            )}
          </div>
        </div>

        {/* Full-screen floating golden ember particles (14 motes, pointer-events-none) */}
        <div
          aria-hidden="true"
          data-testid="splash-embers-layer"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {SPLASH_EMBERS.map((ember) => {
            const emberStyle = {
              left: `${ember.leftPct}%`,
              bottom: `${ember.bottomPct}%`,
              width: `${ember.sizePx}px`,
              height: `${ember.sizePx}px`,
              background: EMBER_GRADIENT_BY_TINT[ember.warmTint],
              boxShadow: '0 0 8px rgba(247, 201, 72, 0.65)',
              '--ember-rise': `-${ember.risePx}px`,
              '--ember-drift': `${ember.driftPx}px`,
              '--ember-duration': `${ember.durationSec}s`,
              '--ember-delay': `${ember.delaySec}s`,
              '--ember-opacity': ember.opacity,
            } as CSSProperties;

            return (
              <span
                key={ember.id}
                className="animate-splash-ember absolute rounded-full"
                style={emberStyle}
              />
            );
          })}
        </div>

        {/* PC ONLY overlay prompt — Mobile image already includes "터치하여 시작!" */}
        {isPc && (
          <div
            data-testid="splash-pc-prompt"
            className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center px-4"
          >
            <span className="animate-splash-cta-glow inline-flex items-center justify-center rounded-md border border-[#f5d882]/85 bg-[#231b14]/86 px-7 py-2.5 font-display text-lg font-bold tracking-wide text-[#fdf3dc] whitespace-nowrap transition-transform duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.045] group-hover:border-[#ffe59c] group-active:scale-[0.94]">
              클릭하여 시작!
            </span>
          </div>
        )}
      </button>
    </main>
  );
}
