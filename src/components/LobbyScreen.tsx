import { ArrowLeft, Trophy } from 'lucide-react';
import { FACTIONS, VICTORY_RANK_GUIDE_TEXT } from '../game/data';
import type { PlayableFactionId } from '../game/types';
import { LordPortrait } from './LordPortrait';

interface LobbyScreenProps {
  selectedFaction: PlayableFactionId;
  onSelectFaction: (faction: PlayableFactionId) => void;
  onStart: () => void;
  onBackToSplash: () => void;
  onOpenHallOfFame: () => void;
}

const LOBBY_FACTION_ORDER: PlayableFactionId[] = ['wei', 'shu', 'wu'];
const LOBBY_BG_SRC = '/src/assets/images/title_hanji_scroll_1795431115531.jpg';

export function LobbyScreen({
  selectedFaction,
  onSelectFaction,
  onStart,
  onBackToSplash,
  onOpenHallOfFame,
}: LobbyScreenProps) {
  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden hanji-surface flex flex-col justify-between">
      {/* Subtle Hanji Ink-Wash Scroll Backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src={LOBBY_BG_SRC}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-right-bottom opacity-85"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f4ebd8]/94 via-[#f4ebd8]/82 to-[#f4ebd8]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#ebe0c8]/88 via-transparent to-[#f4ebd8]/45" />
      </div>

      {/* Top Navigation Bar with ← 타이틀로 */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-5 sm:px-10 lg:px-14">
        <button
          type="button"
          onClick={onBackToSplash}
          data-testid="btn-back-splash"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#c6b391] bg-[#faf4e6]/90 px-3.5 py-2 text-xs font-semibold text-[#3a3025] shadow-xs transition-colors hover:bg-[#efe4cc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231f1a] sm:text-sm whitespace-nowrap"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>타이틀로</span>
        </button>

        <span className="text-xs font-medium text-[#6a5b47] hidden sm:inline">
          황성 낙양 점령 시 매 턴 +20 병력 · 방어 +10%
        </span>
      </div>

      {/* Main Lobby Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-6 sm:px-10 lg:px-14">
        <div className="max-w-4xl">
          {/* Official Brand Lockup */}
          <div className="mb-5 flex items-center gap-3.5">
            <svg
              viewBox="0 0 64 64"
              className="h-14 w-14 shrink-0 sm:h-16 sm:w-16"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="4"
                width="56"
                height="56"
                rx="6"
                fill="#9e2a22"
                stroke="#6b1a14"
                strokeWidth="2.5"
              />
              <rect
                x="9"
                y="9"
                width="46"
                height="46"
                rx="3"
                fill="none"
                stroke="#f5e9d4"
                strokeWidth="1.2"
                strokeOpacity="0.65"
              />
              <text
                x="32"
                y="42"
                textAnchor="middle"
                fill="#faf3e3"
                fontSize="30"
                fontWeight="900"
                fontFamily="'Noto Serif KR', serif"
              >
                統
              </text>
            </svg>
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-[#7a4b21] sm:text-sm">
                5분만에 천하통일
              </p>
              <h1
                className="font-display text-3xl font-black tracking-tight text-[#1e1a15] sm:text-5xl"
                style={{ textWrap: 'balance' }}
              >
                딸깍 삼국지
              </h1>
            </div>
          </div>

          <div
            data-testid="lobby-intro-copy"
            className="mb-6 max-w-2xl space-y-0.5 text-sm leading-relaxed text-[#473d31] break-keep text-pretty sm:text-base"
          >
            <p>위·촉·오 세 군웅 중 하나의 깃발을 들고 15개 성지를 통일하세요.</p>
            <p>
              천하를 평정하면{' '}
              <span className="whitespace-nowrap">명예의 전당에</span> 이름을 새길 수 있습니다.
            </p>
          </div>

          {/* 3 Factions + Hall of Fame Card Grid */}
          <div className="mb-7 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
            <fieldset>
              <legend className="mb-2.5 text-sm font-semibold text-[#3c3328]">
                출정 세력 선택
              </legend>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {LOBBY_FACTION_ORDER.map((fid) => {
                  const f = FACTIONS[fid];
                  const active = selectedFaction === fid;
                  return (
                    <button
                      key={fid}
                      type="button"
                      onClick={() => onSelectFaction(fid)}
                      aria-pressed={active}
                      data-testid={`lobby-faction-${fid}`}
                      className={`group flex flex-col items-start rounded-md border px-3.5 py-3.5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231f1a] ${
                        active
                          ? 'bg-[#fbf6ec] shadow-sm'
                          : 'border-[#cfc1a5] bg-[#f6eedc]/88 hover:bg-[#fbf6ec]'
                      }`}
                      style={
                        active
                          ? { borderColor: f.color, boxShadow: `0 0 0 1.5px ${f.color}` }
                          : undefined
                      }
                    >
                      <div className="mb-2 flex w-full items-center gap-2.5">
                        <LordPortrait
                          faction={fid}
                          emotion={active ? 'victory' : 'idle'}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-display text-base font-bold text-[#1f1a15] whitespace-nowrap">
                              {f.name}
                            </span>
                            <span
                              className="h-3 w-3 shrink-0 rounded-sm border border-black/20"
                              style={{ backgroundColor: f.color }}
                              aria-hidden="true"
                            />
                          </div>
                          <p
                            className="mt-0.5 text-xs font-bold leading-snug"
                            style={{ color: f.darkColor }}
                          >
                            [{f.traitName}]
                          </p>
                          <p className="mt-0.5 text-[11px] font-medium leading-snug text-[#4e4234]">
                            {f.traitSummary}
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#6a5d4b]">
                        {f.startSummary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Hall of Fame Entry Card */}
            <div className="flex flex-col">
              <span className="mb-2.5 hidden text-sm font-semibold text-[#3c3328] lg:inline">
                천하 영웅록
              </span>
              <button
                type="button"
                onClick={onOpenHallOfFame}
                data-testid="lobby-hall-of-fame"
                className="flex flex-1 flex-row items-center justify-between gap-3 rounded-md border border-[#bfa36f] bg-[#f5e9cc]/95 px-4 py-3.5 text-left transition-colors hover:bg-[#efe0bc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231f1a] lg:flex-col lg:items-start lg:justify-center"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#9a7222] text-[#faf4e6]"
                    aria-hidden="true"
                  >
                    <Trophy className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-display text-base font-bold text-[#1f1a14] whitespace-nowrap">
                      명예의 전당
                    </p>
                    <p className="text-[11px] text-[#695637]">
                      최단 턴 · 최고 점수 순위
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#7d5814] whitespace-nowrap lg:mt-1">
                  순위 보기 →
                </span>
              </button>
            </div>
          </div>

          {/* Primary Expedition CTA */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-md px-8 py-3 font-display text-base font-bold text-[#faf5ea] shadow-md transition-transform duration-150 hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231f1a] whitespace-nowrap"
              style={{ backgroundColor: FACTIONS[selectedFaction].color }}
            >
              <span>{FACTIONS[selectedFaction].ruler} 세력으로 출정하기</span>
              <span aria-hidden="true">→</span>
            </button>

            <span className="text-xs leading-snug text-[#645746]">
              {VICTORY_RANK_GUIDE_TEXT}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom flat control hint */}
      <footer className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-5 sm:px-10 lg:px-14">
        <p className="text-xs text-[#635645]">
          성지 클릭 선택 · 징병 / 출진 / 화공 실행 · Space 턴 종료 · M 음소거
        </p>
      </footer>
    </main>
  );
}
