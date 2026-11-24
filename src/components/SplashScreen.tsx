import { useEffect, useState } from 'react';
import { sound } from '../game/sound';

interface SplashScreenProps {
  onProceed: () => void;
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
        className="relative flex h-full w-full cursor-pointer items-center justify-center bg-[#e8d8b9] p-0 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#231f1a]"
      >
        <img
          src={isPc ? '/title-pc.png' : '/title-mobile.png'}
          alt="딸깍 삼국지 — 5분만에 천하통일 타이틀 일러스트"
          referrerPolicy="no-referrer"
          className="h-full w-full select-none object-contain"
          data-testid={isPc ? 'splash-img-pc' : 'splash-img-mobile'}
        />

        {/* PC ONLY overlay prompt — Mobile image already includes "터치하여 시작!" */}
        {isPc && (
          <div
            data-testid="splash-pc-prompt"
            className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center px-4"
          >
            <span className="animate-splash-pulse rounded-md border border-[#f0d58c]/75 bg-[#231b14]/82 px-7 py-2.5 font-display text-lg font-bold tracking-wide text-[#faf1dc] shadow-lg">
              클릭하여 시작!
            </span>
          </div>
        )}
      </button>
    </main>
  );
}
