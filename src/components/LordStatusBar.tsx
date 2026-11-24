import { FACTIONS } from '../game/data';
import type { PortraitEmotion } from '../game/portraits';
import type { PlayableFactionId } from '../game/types';
import { LordPortrait } from './LordPortrait';

interface LordStatusBarProps {
  playerFaction: PlayableFactionId;
  lordEmotion: PortraitEmotion;
  lordLine: string;
  lubuAlive: boolean;
  lubuCityCount: number;
  lubuEmotion: PortraitEmotion;
}

export function LordStatusBar({
  playerFaction,
  lordEmotion,
  lordLine,
  lubuAlive,
  lubuCityCount,
  lubuEmotion,
}: LordStatusBarProps) {
  const factionInfo = FACTIONS[playerFaction];

  return (
    <section
      aria-label="군주 전황 패널"
      data-testid="lord-status-bar"
      className="w-full border-b border-[#cbb998] bg-[#f7efe0] px-3 py-2 sm:px-5"
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: Player Lord Portrait + 1-Line Speech Bubble */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <LordPortrait
            faction={playerFaction}
            emotion={lordEmotion}
            size="sm"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs leading-tight">
              <span
                className="font-display font-bold whitespace-nowrap"
                style={{ color: factionInfo.color }}
              >
                {factionInfo.shortName} · {factionInfo.ruler}
              </span>
              <span aria-hidden="true" className="text-[#a59274]">
                ·
              </span>
              <span className="text-[11px] font-medium text-[#6a5c4a] whitespace-nowrap">
                {factionInfo.traitName}
              </span>
            </div>

            <div
              data-testid="lord-speech-bubble"
              className="mt-1 flex items-center rounded-lg border border-[#d6c6a8] bg-[#fdf9f0] px-2.5 py-1 text-xs font-medium text-[#2c251d] sm:text-[13px]"
            >
              <p className="min-w-0 flex-1 truncate">{lordLine}</p>
            </div>
          </div>
        </div>

        {/* Right: Active Lu Bu Alert Badge (only while Lu Bu is alive on the map) */}
        {lubuAlive && (
          <div
            data-testid="lubu-alert-badge"
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[#581c5c]/45 bg-[#f2e7f4] px-2 py-1 sm:px-2.5 sm:py-1.5"
          >
            <LordPortrait
              faction="lubu"
              emotion={lubuEmotion}
              size="xs"
            />
            <div className="leading-tight">
              <div className="text-[11px] font-bold text-[#581c5c] whitespace-nowrap sm:text-xs">
                여포 출몰 중
              </div>
              <div className="tabular-nums text-[10px] font-semibold text-[#753c7a] whitespace-nowrap sm:text-[11px]">
                점령 {lubuCityCount}성
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
