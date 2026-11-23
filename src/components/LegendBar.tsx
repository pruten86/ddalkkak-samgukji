import { FACTIONS } from '../game/data';
import type { CityState, FactionId, PlayableFactionId } from '../game/types';

interface LegendBarProps {
  counts: Record<FactionId, number>;
  luoyang: CityState;
  lubuSpawned: boolean;
  playerFaction: PlayableFactionId;
}

export function LegendBar({
  counts,
  luoyang,
  lubuSpawned,
  playerFaction,
}: LegendBarProps) {
  const legendFactions: FactionId[] = lubuSpawned
    ? ['wei', 'shu', 'wu', 'neutral', 'lubu']
    : ['wei', 'shu', 'wu', 'neutral'];

  const luoyangOwnerName = FACTIONS[luoyang.owner].shortName;

  return (
    <section
      aria-label="세력 범례"
      data-testid="legend-bar"
      className="w-full border-y border-[#cbb998] bg-[#ebe0ca] px-3 py-2 sm:px-5"
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {legendFactions.map((fid) => {
            const f = FACTIONS[fid];
            const isPlayer = fid === playerFaction;
            const isLuBu = fid === 'lubu';
            return (
              <div
                key={fid}
                data-testid={`legend-item-${fid}`}
                className="flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-[3px] border border-black/25"
                  style={{ backgroundColor: f.color }}
                  aria-hidden="true"
                />
                <span
                  className={`font-semibold whitespace-nowrap ${
                    isLuBu ? 'text-[#581c5c]' : 'text-[#231f1a]'
                  }`}
                >
                  {f.shortName}
                  {isPlayer ? '(나)' : ''}
                </span>
                <span className="tabular-nums font-bold text-[#4a3f32]">
                  {counts[fid]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Imperial Capital Luoyang indicator (outside map, never overlapping) */}
        <div className="flex items-center gap-1.5 text-xs text-[#5d4818] sm:text-sm">
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          >
            <polygon
              points="10,2 13,7 18,7 14,11 16,17 10,13.5 4,17 6,11 2,7 7,7"
              fill="#d4a017"
              stroke="#785609"
              strokeWidth="1.2"
            />
          </svg>
          <span className="font-semibold whitespace-nowrap">
            황성 낙양({luoyangOwnerName})
          </span>
          <span className="hidden text-xs text-[#6f5a2b] sm:inline whitespace-nowrap">
            · 매 턴 +20 / 수성 +10%
          </span>
        </div>
      </div>
    </section>
  );
}
