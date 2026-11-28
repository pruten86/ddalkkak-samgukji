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
  fireApCost?: number;
  southeastWindActive?: boolean;
  remainingFireUses?: number;
  fireDamageRangeText?: string;
}

export function LordStatusBar({
  playerFaction,
  lordEmotion,
  lordLine,
  lubuAlive,
  lubuCityCount,
  lubuEmotion,
  fireApCost = 1,
  southeastWindActive = false,
  remainingFireUses = 0,
  fireDamageRangeText = '20~30%',
}: LordStatusBarProps) {
  const factionInfo = FACTIONS[playerFaction];
  const isWu = playerFaction === 'wu';
  const wuFireCompleted = remainingFireUses <= 0;
  const wuFireLabel = wuFireCompleted
    ? '🔥 화공 완료'
    : `🔥 화공 ${fireApCost} AP · -${fireDamageRangeText}`;

  return (
    <section
      aria-label="군주 전황 패널"
      data-testid="lord-status-bar"
      className="w-full border-b border-[#cbb998] bg-[#f7efe0] px-3 py-2 sm:px-5"
    >
      <div className="mx-auto flex max-w-[1400px] items-start justify-between gap-2.5 sm:items-center sm:gap-4">
        {/* Left: Player Lord Portrait + Wrapping Status Row & Full Speech Bubble */}
        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center sm:gap-3">
          <div className="shrink-0">
            <LordPortrait
              faction={playerFaction}
              emotion={lordEmotion}
              size="sm"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-tight">
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <span
                  className="font-display font-bold whitespace-nowrap"
                  style={{ color: factionInfo.color }}
                >
                  {factionInfo.shortName} · {factionInfo.ruler}
                </span>
                <span aria-hidden="true" className="text-[#a59274]">
                  ·
                </span>
                <span className="text-[11px] font-semibold text-[#6a5c4a] whitespace-nowrap">
                  [{factionInfo.traitName}]
                </span>
              </div>

              {isWu && (
                <span
                  data-testid="hud-fire-status"
                  className={`inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap sm:text-xs ${
                    wuFireCompleted
                      ? 'border-[#cbbba0] bg-[#efe5d3] text-[#7c6d58]'
                      : 'border-[#c94a16]/60 bg-[#fbe9dc] text-[#9e2a22]'
                  }`}
                >
                  {wuFireLabel}
                </span>
              )}

              {southeastWindActive && (
                <span
                  data-testid="hud-southeast-wind"
                  className="inline-flex shrink-0 items-center gap-1 rounded border border-[#b5382a]/55 bg-[#f8e3db] px-2 py-0.5 text-[11px] font-bold text-[#8f2419] whitespace-nowrap sm:text-xs"
                >
                  {isWu
                    ? remainingFireUses > 0
                      ? `🌬️ 동남풍 · ${remainingFireUses}회 남음`
                      : '🌬️ 동남풍'
                    : remainingFireUses > 0
                      ? `🌬️ 동남풍 · 화공 ${remainingFireUses}회 남음 (-${fireDamageRangeText})`
                      : '🌬️ 동남풍 · 화공 완료'}
                </span>
              )}
            </div>

            <div
              data-testid="lord-speech-bubble"
              className="mt-1 flex items-center rounded-lg border border-[#d6c6a8] bg-[#fdf9f0] px-2.5 py-1.5 text-xs font-medium text-[#2c251d] sm:py-1 sm:text-[13px]"
            >
              <p className="min-w-0 flex-1 break-keep leading-snug">{lordLine}</p>
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
