import { useEffect, useState } from 'react';
import { Flame, Medal, Trophy, X } from 'lucide-react';
import { FACTIONS } from '../game/data';
import type { PlayableFactionId } from '../game/types';
import {
  fetchHallOfFame,
  isSupabaseConfigured,
  sortHallOfFameEntries,
  subscribeHallOfFameInserts,
  type HallOfFameEntry,
} from '../lib/supabase';

interface HallOfFameModalProps {
  onClose: () => void;
}

type FilterTab = 'all' | PlayableFactionId;

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'wei', label: '위(조조)' },
  { id: 'shu', label: '촉(유비)' },
  { id: 'wu', label: '오(손권)' },
];

function getRankMedalStyle(position: number): { color: string; bg: string; label: string } | null {
  if (position === 1) return { color: '#7a5607', bg: '#f5df98', label: '1위' };
  if (position === 2) return { color: '#47515c', bg: '#e2e6eb', label: '2위' };
  if (position === 3) return { color: '#75411c', bg: '#efd2ba', label: '3위' };
  return null;
}

export function HallOfFameModal({ onClose }: HallOfFameModalProps) {
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
      setEntries(res.entries);
      setSource(res.source);
      setErrorMsg(res.error ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

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
        <div className="flex items-start justify-between gap-3 border-b border-[#dfd0b3] bg-[#f2e6ce] px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Trophy className="h-5 w-5 text-[#9a7222]" aria-hidden="true" />
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
            onClick={onClose}
            aria-label="명예의 전당 닫기"
            data-testid="btn-close-hof"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#5c4f3d] hover:bg-[#e4d5b6]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Faction Filter Tabs */}
        <div className="border-b border-[#dfd0b3] bg-[#f7eedb] px-5 py-2.5">
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
                  onClick={() => setActiveTab(tab.id)}
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
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5">
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#d9c9aa] text-[11px] font-semibold text-[#6a5b46]">
                    <th className="py-2 pr-2 w-12">순위</th>
                    <th className="py-2 px-2">닉네임</th>
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
                    const medal = getRankMedalStyle(pos);
                    const factionInfo = FACTIONS[entry.faction];
                    return (
                      <tr
                        key={entry.id}
                        data-testid={`hof-row-${pos}`}
                        className={pos <= 3 ? 'bg-[#f6ecd4]/75' : undefined}
                      >
                        <td className="py-2.5 pr-2">
                          {medal ? (
                            <span
                              className="inline-flex h-6 min-w-[30px] items-center justify-center rounded px-1.5 font-display text-xs font-black tabular-nums"
                              style={{ backgroundColor: medal.bg, color: medal.color }}
                            >
                              {pos}
                            </span>
                          ) : (
                            <span className="pl-1.5 font-semibold text-[#6c5d49] tabular-nums">
                              {pos}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 font-bold text-[#1f1a14] max-w-[130px] truncate">
                          {entry.nickname}
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#3b3227]">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-[2px]"
                              style={{ backgroundColor: factionInfo.color }}
                              aria-hidden="true"
                            />
                            {factionInfo.shortName}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-display font-black text-[#9e2a22]">
                            {entry.rank}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-[#4a3e2e] whitespace-nowrap">
                          {entry.turns}턴
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
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
                        <td className="py-2.5 pl-2 text-right font-display font-black tabular-nums text-[#1f1a14] whitespace-nowrap">
                          {entry.score.toLocaleString('ko-KR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#dfd0b3] bg-[#f3e8d2] px-4 py-3 sm:px-5">
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-[#6a5b46]">
            점수 = 기본(최대 10,000) + 여포 토벌(1,500) + 잔여 병력(최대 1,500)
          </p>
          <button
            type="button"
            onClick={onClose}
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
