import { useEffect, useState } from 'react';
import { Flame, Medal, Trophy, X } from 'lucide-react';
import { FACTIONS, VICTORY_RANK_STYLES } from '../game/data';
import { sound } from '../game/sound';
import type { PlayableFactionId } from '../game/types';
import {
  fetchHallOfFame,
  formatHallOfFameDateTime,
  isSupabaseConfigured,
  sortHallOfFameEntries,
  subscribeHallOfFameInserts,
  type HallOfFameEntry,
} from '../lib/supabase';

interface HallOfFameModalProps {
  onClose: () => void;
  recentEntry?: HallOfFameEntry | null;
}

type FilterTab = 'all' | PlayableFactionId;

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'wei', label: '위(조조)' },
  { id: 'shu', label: '촉(유비)' },
  { id: 'wu', label: '오(손권)' },
];

type TopTierNumber = 1 | 2 | 3;

interface TopRankTierStyle {
  tier: TopTierNumber;
  title: string;
  label: string;
  crownFill: string;
  crownStroke: string;
  crownJewel: string;
  rankBg: string;
  rankBorder: string;
  rankText: string;
  titleBg: string;
  titleBorder: string;
  titleText: string;
  rowBgClass: string;
}

function getTopRankTier(position: number): TopRankTierStyle | null {
  if (position === 1) {
    return {
      tier: 1,
      title: '황제',
      label: '1위 황제',
      crownFill: '#f6d260',
      crownStroke: '#966608',
      crownJewel: '#c12c1d',
      rankBg: 'linear-gradient(135deg, #fce9a7 0%, #eac04e 100%)',
      rankBorder: '#b88314',
      rankText: '#5e3c02',
      titleBg: '#fcf0c7',
      titleBorder: '#cfa032',
      titleText: '#6c4704',
      rowBgClass: 'bg-[#fbf1d3]/85',
    };
  }
  if (position === 2) {
    return {
      tier: 2,
      title: '왕',
      label: '2위 왕',
      crownFill: '#dfe6ee',
      crownStroke: '#52606f',
      crownJewel: '#356899',
      rankBg: 'linear-gradient(135deg, #f2f5f8 0%, #d3dce6 100%)',
      rankBorder: '#7c8b9c',
      rankText: '#2f3a46',
      titleBg: '#edf1f5',
      titleBorder: '#97a6b8',
      titleText: '#35414f',
      rowBgClass: 'bg-[#f1f4f7]/80',
    };
  }
  if (position === 3) {
    return {
      tier: 3,
      title: '제후',
      label: '3위 제후',
      crownFill: '#e4a778',
      crownStroke: '#7d4016',
      crownJewel: '#9d4c14',
      rankBg: 'linear-gradient(135deg, #f4d9c2 0%, #d99f71 100%)',
      rankBorder: '#9e5725',
      rankText: '#592c0d',
      titleBg: '#f6e2d1',
      titleBorder: '#c27b48',
      titleText: '#693412',
      rowBgClass: 'bg-[#f7eae0]/80',
    };
  }
  return null;
}

function RankCrownIcon({
  tierStyle,
  className = 'h-3.5 w-3.5 shrink-0',
}: {
  tierStyle: TopRankTierStyle;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3 17.5L4.8 8.5L9.2 12.2L12 5.5L14.8 12.2L19.2 8.5L21 17.5H3Z"
        fill={tierStyle.crownFill}
        stroke={tierStyle.crownStroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <rect
        x="3.5"
        y="17.5"
        width="17"
        height="2.8"
        rx="1.2"
        fill={tierStyle.crownFill}
        stroke={tierStyle.crownStroke}
        strokeWidth="1.5"
      />
      <circle cx="12" cy="14" r="1.4" fill={tierStyle.crownJewel} />
      <circle cx="12" cy="4.4" r="1.3" fill={tierStyle.crownFill} stroke={tierStyle.crownStroke} strokeWidth="1" />
    </svg>
  );
}

function mergeRecentEntry(
  entries: HallOfFameEntry[],
  recentEntry: HallOfFameEntry | null | undefined,
  activeTab: FilterTab
): HallOfFameEntry[] {
  if (!recentEntry) return entries;
  if (activeTab !== 'all' && recentEntry.faction !== activeTab) return entries;
  const alreadyPresent = entries.some(
    (item) =>
      item.id === recentEntry.id ||
      (item.nickname === recentEntry.nickname &&
        item.score === recentEntry.score &&
        item.turns === recentEntry.turns &&
        item.faction === recentEntry.faction)
  );
  if (alreadyPresent) return entries;
  return sortHallOfFameEntries([...entries, recentEntry]);
}

export function HallOfFameModal({ onClose, recentEntry }: HallOfFameModalProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'supabase' | 'local'>(
    isSupabaseConfigured ? 'supabase' : 'local'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);

    void fetchHallOfFame(activeTab).then((res) => {
      if (cancelled) return;
      setEntries(mergeRecentEntry(res.entries, recentEntry, activeTab));
      setSource(res.source);
      setErrorMsg(res.error ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeTab, recentEntry]);

  // Realtime Supabase INSERT subscription
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const unsubscribe = subscribeHallOfFameInserts((newRow) => {
      if (activeTab !== 'all' && newRow.faction !== activeTab) return;
      setEntries((prev) => {
        if (prev.some((item) => item.id === newRow.id)) return prev;
        return sortHallOfFameEntries([...prev, newRow]);
      });
    });

    return unsubscribe;
  }, [activeTab]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hof-modal-title"
      data-testid="hall-of-fame-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4"
    >
      <div className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border-2 border-[#b49b6c] bg-[#faf3e3] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#dfd0b3] bg-[#f2e6ce] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Trophy className="h-5 w-5 shrink-0 text-[#9a7222]" aria-hidden="true" />
              <h2
                id="hof-modal-title"
                className="font-display text-xl font-black text-[#1f1a14]"
              >
                명예의 전당
              </h2>
              {source === 'local' && (
                <span
                  data-testid="hof-local-badge"
                  className="rounded border border-[#c7ae7c] bg-[#efe1be] px-2 py-0.5 text-[11px] font-semibold text-[#6c511f]"
                >
                  로컬 미리보기 모드 (배포 시 실시간 랭킹 연동)
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#635440]">
              딸깍 삼국지 — 천하통일 상위 50위 영웅 기록 (점수 높은 순 · 턴 적은 순)
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            aria-label="명예의 전당 닫기"
            data-testid="btn-close-hof"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#5c4f3d] hover:bg-[#e4d5b6]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Faction Filter Tabs */}
        <div className="border-b border-[#dfd0b3] bg-[#f7eedb] px-4 py-2.5 sm:px-5">
          <div
            role="tablist"
            aria-label="세력별 순위 필터"
            className="flex flex-wrap items-center gap-1.5"
          >
            {FILTER_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`hof-tab-${tab.id}`}
                  onClick={() => {
                    sound.playClick();
                    setActiveTab(tab.id);
                  }}
                  className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#231f1a] text-[#faf4e6]'
                      : 'border border-[#d1c0a0] bg-[#faf4e6] text-[#524636] hover:bg-[#ede2cc]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 sm:px-5">
          {errorMsg && (
            <p className="mb-3 rounded border border-[#c98b78] bg-[#faece7] px-3 py-2 text-xs text-[#8a2e22]">
              실시간 서버 연결에 실패하여 로컬 기록을 표시합니다 ({errorMsg})
            </p>
          )}

          {loading ? (
            <div className="py-12 text-center text-sm text-[#6b5c47]">
              영웅 기록을 불러오는 중...
            </div>
          ) : entries.length === 0 ? (
            <div
              data-testid="hof-empty-state"
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <Medal className="mb-2.5 h-9 w-9 text-[#b09a72]" aria-hidden="true" />
              <p className="font-display text-base font-bold text-[#3b3227]">
                아직 등재된 영웅이 없습니다
              </p>
              <p className="mt-1 text-xs text-[#6f5f4b]">
                15개 성지를 모두 점령하고 명예의 전당에 첫 이름을 새겨 보세요!
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Compact List (< sm) — Zero horizontal overflow on 390px */}
              <ul
                aria-label="명예의 전당 순위 목록"
                data-testid="hof-mobile-list"
                className="divide-y divide-[#e6d8bd] sm:hidden"
              >
                {entries.map((entry, idx) => {
                  const pos = idx + 1;
                  const topTier = getTopRankTier(pos);
                  const rankStyle = VICTORY_RANK_STYLES[entry.rank] ?? VICTORY_RANK_STYLES.C;
                  const factionInfo = FACTIONS[entry.faction];
                  const formattedDate = formatHallOfFameDateTime(entry.created_at);

                  return (
                    <li
                      key={entry.id}
                      data-testid={`hof-mobile-row-${pos}`}
                      className={`flex items-start justify-between gap-2 py-2.5 px-1.5 ${
                        topTier ? `rounded-sm ${topTier.rowBgClass}` : ''
                      }`}
                    >
                      {/* Left: Rank Badge / Crown */}
                      <div className="mt-0.5 shrink-0">
                        {topTier ? (
                          <span
                            aria-label={topTier.label}
                            data-testid={`hof-mobile-crown-${pos}`}
                            className="inline-flex h-6 min-w-[38px] items-center justify-center gap-0.5 rounded border px-1 font-display text-xs font-black tabular-nums whitespace-nowrap shadow-2xs"
                            style={{
                              background: topTier.rankBg,
                              borderColor: topTier.rankBorder,
                              color: topTier.rankText,
                            }}
                          >
                            <RankCrownIcon tierStyle={topTier} className="h-3.5 w-3.5 shrink-0" />
                            <span>{pos}</span>
                          </span>
                        ) : (
                          <span className="inline-flex h-6 min-w-[38px] items-center justify-center font-semibold text-xs text-[#6c5d49] tabular-nums">
                            {pos}
                          </span>
                        )}
                      </div>

                      {/* Middle: Top-3 Title + Nickname + 7-Tier Rank Seal + Meta + KST Date */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1 min-w-0">
                          {topTier && (
                            <span
                              data-testid={`hof-mobile-title-${pos}`}
                              className="inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-black leading-none whitespace-nowrap"
                              style={{
                                backgroundColor: topTier.titleBg,
                                borderColor: topTier.titleBorder,
                                color: topTier.titleText,
                              }}
                            >
                              {topTier.title}
                            </span>
                          )}
                          <span className="min-w-0 max-w-full truncate text-sm font-bold text-[#1f1a14]">
                            {entry.nickname}
                          </span>
                          <span
                            data-testid={`hof-mobile-rank-${pos}`}
                            className="inline-flex shrink-0 items-center justify-center rounded border px-1.5 py-0.5 font-display text-[10px] font-black leading-none whitespace-nowrap"
                            style={{
                              background: rankStyle.badgeBg,
                              borderColor: rankStyle.badgeBorder,
                              color: rankStyle.badgeText,
                              boxShadow: rankStyle.badgeShadow,
                            }}
                          >
                            {entry.rank}등급
                          </span>
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#594b3a]">
                          <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap">
                            <span
                              className="inline-block h-2 w-2 rounded-[2px]"
                              style={{ backgroundColor: factionInfo.color }}
                              aria-hidden="true"
                            />
                            {factionInfo.shortName}
                          </span>
                          <span aria-hidden="true" className="text-[#b6a68d]">
                            ·
                          </span>
                          <span className="tabular-nums whitespace-nowrap">{entry.turns}턴</span>
                          {entry.lubu_defeated && (
                            <span
                              title="여포군 토벌 보너스 (+1,500)"
                              className="inline-flex items-center gap-0.5 rounded bg-[#efe3f0] px-1.5 py-0.5 text-[10px] font-bold text-[#581c5c] whitespace-nowrap"
                            >
                              <Flame className="h-2.5 w-2.5" aria-hidden="true" />
                              여포 토벌
                            </span>
                          )}
                        </div>

                        {formattedDate && (
                          <time
                            dateTime={entry.created_at ?? undefined}
                            data-testid={`hof-mobile-time-${pos}`}
                            className="mt-0.5 block text-[11px] leading-tight text-[#7c6d58] tabular-nums whitespace-nowrap"
                          >
                            {formattedDate}
                          </time>
                        )}
                      </div>

                      {/* Right: Score */}
                      <div className="shrink-0 text-right pl-1">
                        <span className="font-display text-sm font-black tabular-nums text-[#1f1a14] whitespace-nowrap">
                          {entry.score.toLocaleString('ko-KR')}
                        </span>
                        <span className="ml-0.5 text-[10px] font-semibold text-[#6b5c47]">점</span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Desktop / Tablet Table (>= sm) */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#d9c9aa] text-[11px] font-semibold text-[#6a5b46]">
                      <th className="py-2 pr-2 w-16 whitespace-nowrap">순위</th>
                      <th className="py-2 px-2">닉네임 / 등록일</th>
                      <th className="py-2 px-2 whitespace-nowrap">세력</th>
                      <th className="py-2 px-2 text-center whitespace-nowrap">등급</th>
                      <th className="py-2 px-2 text-right whitespace-nowrap">턴</th>
                      <th className="py-2 px-2 text-center whitespace-nowrap">여포</th>
                      <th className="py-2 pl-2 text-right whitespace-nowrap">점수</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8dcc4]">
                    {entries.map((entry, idx) => {
                      const pos = idx + 1;
                      const topTier = getTopRankTier(pos);
                      const rankStyle = VICTORY_RANK_STYLES[entry.rank] ?? VICTORY_RANK_STYLES.C;
                      const factionInfo = FACTIONS[entry.faction];
                      const formattedDate = formatHallOfFameDateTime(entry.created_at);

                      return (
                        <tr
                          key={entry.id}
                          data-testid={`hof-row-${pos}`}
                          className={topTier ? topTier.rowBgClass : undefined}
                        >
                          <td className="py-2.5 pr-2 align-middle whitespace-nowrap">
                            {topTier ? (
                              <span
                                aria-label={topTier.label}
                                data-testid={`hof-crown-${pos}`}
                                className="inline-flex h-6 min-w-[42px] items-center justify-center gap-1 rounded border px-1.5 font-display text-xs font-black tabular-nums whitespace-nowrap shadow-2xs"
                                style={{
                                  background: topTier.rankBg,
                                  borderColor: topTier.rankBorder,
                                  color: topTier.rankText,
                                }}
                              >
                                <RankCrownIcon tierStyle={topTier} className="h-3.5 w-3.5 shrink-0" />
                                <span>{pos}</span>
                              </span>
                            ) : (
                              <span className="inline-flex min-w-[42px] justify-center font-semibold text-[#6c5d49] tabular-nums">
                                {pos}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 max-w-[210px] align-middle">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {topTier && (
                                  <span
                                    data-testid={`hof-title-${pos}`}
                                    className="inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-black leading-none whitespace-nowrap"
                                    style={{
                                      backgroundColor: topTier.titleBg,
                                      borderColor: topTier.titleBorder,
                                      color: topTier.titleText,
                                    }}
                                  >
                                    {topTier.title}
                                  </span>
                                )}
                                <span className="truncate font-bold text-[#1f1a14]">
                                  {entry.nickname}
                                </span>
                              </div>
                              {formattedDate && (
                                <time
                                  dateTime={entry.created_at ?? undefined}
                                  data-testid={`hof-time-${pos}`}
                                  className="mt-0.5 block text-[11px] font-normal leading-tight text-[#7c6d58] tabular-nums whitespace-nowrap"
                                >
                                  {formattedDate}
                                </time>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 font-medium text-[#3b3227]">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-[2px]"
                                style={{ backgroundColor: factionInfo.color }}
                                aria-hidden="true"
                              />
                              {factionInfo.shortName}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center align-middle whitespace-nowrap">
                            <span
                              data-testid={`hof-rank-${pos}`}
                              className="inline-flex min-w-[34px] items-center justify-center rounded border px-1.5 py-0.5 font-display text-xs font-black leading-none whitespace-nowrap"
                              style={{
                                background: rankStyle.badgeBg,
                                borderColor: rankStyle.badgeBorder,
                                color: rankStyle.badgeText,
                                boxShadow: rankStyle.badgeShadow,
                              }}
                            >
                              {entry.rank}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right align-middle tabular-nums text-[#4a3e2e] whitespace-nowrap">
                            {entry.turns}턴
                          </td>
                          <td className="py-2.5 px-2 text-center align-middle whitespace-nowrap">
                            {entry.lubu_defeated ? (
                              <span
                                title="여포군 토벌 보너스 (+1,500)"
                                className="inline-flex items-center gap-0.5 rounded bg-[#efe3f0] px-1.5 py-0.5 text-[11px] font-bold text-[#581c5c]"
                              >
                                <Flame className="h-3 w-3" aria-hidden="true" />
                                토벌
                              </span>
                            ) : (
                              <span className="text-[#a0917a]">-</span>
                            )}
                          </td>
                          <td className="py-2.5 pl-2 text-right align-middle font-display font-black tabular-nums text-[#1f1a14] whitespace-nowrap">
                            {entry.score.toLocaleString('ko-KR')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#dfd0b3] bg-[#f3e8d2] px-4 py-3 sm:px-5">
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-[#6a5b46]">
            점수 = 기본(최대 10,000) + 여포 토벌(1,500) + 잔여 병력(최대 1,500)
          </p>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            data-testid="btn-footer-close-hof"
            className="min-h-[38px] shrink-0 rounded-md bg-[#231f1a] px-4 py-1.5 text-xs font-bold text-[#faf4e6] hover:bg-[#383128] whitespace-nowrap"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
