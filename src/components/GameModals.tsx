import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Flame,
  RotateCcw,
  ScrollText,
  Trophy,
  X,
} from 'lucide-react';
import { FACTIONS } from '../game/data';
import { calculateAchievementScore, calculateVictoryRank } from '../game/engine';
import type { GameEventModalData, GameStats, PlayableFactionId } from '../game/types';
import { submitHallOfFameEntry } from '../lib/supabase';

interface EventModalProps {
  event: GameEventModalData;
  onClose: () => void;
}

export function EventModal({ event, onClose }: EventModalProps) {
  const isLuBu = Boolean(event.isLuBu);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
      data-testid={isLuBu ? 'lubu-event-modal' : 'random-event-modal'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
    >
      <div
        className={`w-full max-w-md rounded-lg border-2 bg-[#faf3e3] p-6 shadow-2xl ${
          isLuBu ? 'border-[#581c5c]' : 'border-[#b89f76]'
        }`}
      >
        <div className="mb-3 flex items-center gap-2.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white"
            style={{ backgroundColor: event.accentColor }}
            aria-hidden="true"
          >
            {isLuBu ? <AlertTriangle className="h-5 w-5" /> : <Flame className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6b5b47]">{event.subtitle}</p>
            <h2
              id="event-modal-title"
              className="font-display text-xl font-black text-[#1e1a15]"
            >
              {event.title}
            </h2>
          </div>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-[#3a3126]">{event.description}</p>

        <div
          className="mb-5 rounded-md border px-3.5 py-2.5 text-xs font-semibold"
          style={{
            borderColor: `${event.accentColor}44`,
            backgroundColor: `${event.accentColor}12`,
            color: event.accentColor,
          }}
        >
          {event.effectSummary}
        </div>

        <button
          type="button"
          onClick={onClose}
          data-testid="btn-close-event"
          className="min-h-[44px] w-full rounded-md px-4 py-2.5 font-display text-sm font-bold text-[#faf4e6] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231f1a]"
          style={{ backgroundColor: event.accentColor }}
        >
          {isLuBu
            ? event.victimIsPlayer
              ? '긴급 대응에 나선다'
              : '형세를 주시한다'
            : '확인'}
        </button>
      </div>
    </div>
  );
}

interface SettlementModalProps {
  outcome: 'victory' | 'defeat';
  turn: number;
  playerFaction: PlayableFactionId;
  totalTroops: number;
  lubuSpawned: boolean;
  lubuDefeated: boolean;
  stats: GameStats;
  hasRegisteredHof: boolean;
  onRegisteredHof: () => void;
  onOpenHallOfFame: () => void;
  onRestart: () => void;
  onReturnLobby: () => void;
}

export function SettlementModal({
  outcome,
  turn,
  playerFaction,
  totalTroops,
  lubuSpawned,
  lubuDefeated,
  stats,
  hasRegisteredHof,
  onRegisteredHof,
  onOpenHallOfFame,
  onRestart,
  onReturnLobby,
}: SettlementModalProps) {
  const isVictory = outcome === 'victory';
  const rankInfo = calculateVictoryRank(turn);
  const scoreInfo = calculateAchievementScore(turn, totalTroops, lubuDefeated);
  const faction = FACTIONS[playerFaction];

  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmitHof = async (e: FormEvent) => {
    e.preventDefault();
    if (hasRegisteredHof || submitting) return;

    const trimmed = nickname.trim();
    if (trimmed.length < 1 || trimmed.length > 12) {
      setFormError('닉네임은 1~12자로 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await submitHallOfFameEntry({
        nickname: trimmed,
        faction: playerFaction,
        rank: rankInfo.rank,
        turns: turn,
        lubu_defeated: lubuDefeated,
        score: scoreInfo.totalScore,
      });
      onRegisteredHof();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settlement-modal-title"
      data-testid="settlement-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border-2 border-[#a88d5c] bg-[#faf3e3] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#dfd0b3] pb-4">
          <div>
            <p className="text-xs font-semibold text-[#6e5d47]">
              딸깍 삼국지 · {faction.name} · 제 {turn}턴 결산
            </p>
            <h2
              id="settlement-modal-title"
              className="mt-0.5 font-display text-2xl font-black text-[#1f1a14]"
            >
              {isVictory ? '5분만에 천하통일!' : '세력 멸망'}
            </h2>
            <p className="mt-1 text-xs text-[#594b3a]">
              {isVictory
                ? `${rankInfo.title} — ${rankInfo.comment}`
                : '모든 성지를 상실하여 대업이 좌절되었습니다. 다시 전열을 가다듬으세요.'}
            </p>
          </div>

          {isVictory ? (
            <div
              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-md border-2 border-[#9e2a22] bg-[#9e2a22] text-[#faf3e3] shadow-sm"
              aria-label={`최종 등급 ${rankInfo.rank}`}
            >
              <span className="text-[10px] font-semibold opacity-85">등급</span>
              <span className="font-display text-3xl font-black leading-none">
                {rankInfo.rank}
              </span>
            </div>
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-[#4a4138] text-[#faf3e3]"
              aria-hidden="true"
            >
              <Crown className="h-7 w-7 opacity-70" />
            </div>
          )}
        </div>

        {/* Final Achievement Score Banner on Victory */}
        {isVictory && (
          <div className="mb-4 rounded-md border border-[#cbb07b] bg-[#f4e7c6] px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold text-[#6b501d]">최종 업적 점수</span>
              <span
                data-testid="settlement-final-score"
                className="font-display text-2xl font-black tabular-nums text-[#1f1a14]"
              >
                {scoreInfo.totalScore.toLocaleString('ko-KR')}
                <span className="ml-0.5 text-xs font-sans font-semibold text-[#6b501d]">점</span>
              </span>
            </div>
            <p className="mt-1 text-[11px] tabular-nums text-[#69542c]">
              기본 {scoreInfo.baseScore.toLocaleString('ko-KR')} + 여포 토벌{' '}
              {scoreInfo.lubuBonus.toLocaleString('ko-KR')} + 잔여 병력{' '}
              {scoreInfo.troopBonus.toLocaleString('ko-KR')}
            </p>
          </div>
        )}

        {/* Tabular Stats Grid */}
        <div className="mb-4 grid grid-cols-2 gap-2.5 text-sm">
          <div className="rounded-md border border-[#ded0b4] bg-[#f3ead6] px-3 py-2">
            <p className="text-xs text-[#695a46]">소요 턴</p>
            <p className="tabular-nums font-display text-lg font-bold text-[#1f1a14]">
              {turn}턴
            </p>
          </div>
          <div className="rounded-md border border-[#ded0b4] bg-[#f3ead6] px-3 py-2">
            <p className="text-xs text-[#695a46]">
              {isVictory ? '최종 총병력' : '최대 보유 영토'}
            </p>
            <p className="tabular-nums font-display text-lg font-bold text-[#1f1a14]">
              {isVictory ? `${totalTroops}명` : `${stats.peakTerritories} / 15`}
            </p>
          </div>
          <div className="rounded-md border border-[#ded0b4] bg-[#f3ead6] px-3 py-2">
            <p className="text-xs text-[#695a46]">전투 승리</p>
            <p className="tabular-nums font-display text-lg font-bold text-[#1f1a14]">
              {stats.battlesWon} / {stats.battlesFought}
            </p>
          </div>
          <div className="rounded-md border border-[#ded0b4] bg-[#f3ead6] px-3 py-2">
            <p className="text-xs text-[#695a46]">여포 토벌</p>
            <p className="font-display text-base font-bold text-[#1f1a14]">
              {lubuDefeated ? '토벌 완료 (+1,500)' : lubuSpawned ? '미토벌' : '미출현'}
            </p>
          </div>
        </div>

        {/* Hall of Fame Registration Form (Victory Only, Once Per Match) */}
        {isVictory && (
          <div className="mb-4 rounded-md border border-[#d6c5a3] bg-[#f5ecd9] p-3.5">
            {hasRegisteredHof ? (
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#24633e]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>명예의 전당에 기록이 등록되었습니다!</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenHallOfFame}
                  className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-md bg-[#9a7222] px-3 py-1.5 text-xs font-bold text-[#faf4e6] hover:brightness-110 whitespace-nowrap"
                >
                  <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>순위 확인</span>
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmitHof(e)} className="space-y-2">
                <label
                  htmlFor="hof-nickname-input"
                  className="block text-xs font-bold text-[#3a3024]"
                >
                  명예의 전당 등록 (닉네임 1~12자)
                </label>
                <div className="flex gap-2">
                  <input
                    id="hof-nickname-input"
                    type="text"
                    value={nickname}
                    maxLength={12}
                    onChange={(e) => {
                      setNickname(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="장수 닉네임 입력"
                    data-testid="hof-nickname-input"
                    className="min-h-[40px] flex-1 rounded-md border border-[#bda884] bg-[#fffcf5] px-3 text-sm text-[#1f1a14] placeholder:text-[#9c8d77] focus:border-[#231f1a] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    data-testid="btn-register-hof"
                    className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#9a7222] px-3.5 text-xs font-bold text-[#faf4e6] hover:brightness-110 disabled:opacity-50 whitespace-nowrap"
                  >
                    <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{submitting ? '등록 중...' : '명예의 전당 등록'}</span>
                  </button>
                </div>
                {formError && <p className="text-xs font-medium text-[#a82921]">{formError}</p>}
              </form>
            )}
          </div>
        )}

        {isVictory && (
          <p className="mb-4 text-center text-[11px] text-[#70614c]">
            등급 기준: 20턴 이하 S · 21~30턴 A · 31~40턴 B · 41턴 이상 C
          </p>
        )}

        <div className="flex gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 font-display text-sm font-bold text-[#faf4e6] hover:brightness-110"
            style={{ backgroundColor: faction.color }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>같은 세력으로 재도전</span>
          </button>
          <button
            type="button"
            onClick={onReturnLobby}
            className="min-h-[44px] rounded-md border border-[#bda884] bg-[#efe4cc] px-4 py-2.5 text-sm font-semibold text-[#2b241c] hover:bg-[#e5d6b7] whitespace-nowrap"
          >
            출정 로비로
          </button>
        </div>
      </div>
    </div>
  );
}

interface RulesModalProps {
  onClose: () => void;
}

export function RulesModal({ onClose }: RulesModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
    >
      <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-lg border-2 border-[#b49d76] bg-[#faf3e3] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-[#dfd0b3] pb-3">
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-[#7a5d2e]" aria-hidden="true" />
            <h2 id="rules-modal-title" className="font-display text-xl font-bold text-[#1f1a14]">
              딸깍 삼국지 병법서
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="병법서 닫기"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#5c4f3d] hover:bg-[#ebe0c8]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-[#3b3227]">
          <section>
            <h3 className="font-display font-bold text-[#1f1a14]">턴 규칙 및 명령 (행동력 2)</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed">
              <li>
                <strong>징병 (1 AP)</strong>: 선택한 아군 성지에 병력 +35 충원 (촉 +25% 적용 시 +44).
              </li>
              <li>
                <strong>출진 / 수송 (1 AP)</strong>: 인접 성지로 병력의 50% / 80% / 95%를 파병 (최소 5명 잔류).
              </li>
              <li>
                <strong>화공 계략 (1 AP, 턴당 1회)</strong>: 인접 적 성지 병력의 35%를 즉시 소멸시킵니다.
              </li>
              <li>
                <strong>황성 낙양</strong>: 점령 세력에게 매 턴 추가 병력 +20, 낙양 수성 시 방어력 +10%.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-display font-bold text-[#1f1a14]">세력 고유 특성</h3>
            <ul className="mt-1.5 space-y-1 text-xs leading-relaxed">
              <li>
                <strong style={{ color: FACTIONS.shu.color }}>촉(유비)</strong> — [인덕] 징병량 +25%
              </li>
              <li>
                <strong style={{ color: FACTIONS.wei.color }}>위(조조)</strong> — [패도] 공격력 +15%
              </li>
              <li>
                <strong style={{ color: FACTIONS.wu.color }}>오(손권)</strong> — [수성] 방어력 +20%
              </li>
              <li>
                <strong style={{ color: FACTIONS.lubu.color }}>여포군</strong> — [무쌍] 공격 +35%, 방어 +10%, 징병 +15%
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-display font-bold text-[#1f1a14]">돌발 사건 및 여포의 출현</h3>
            <p className="mt-1.5 text-xs leading-relaxed">
              매 3턴(3, 6, 9턴...)마다 삼국지 돌발 사건이 발생합니다. 또한 5턴 이후 주요 3세력 중
              선두가 영토 6~11개를 차지하고 2위와 3개 이상 차이를 벌리면, 방심한 후방 성지에서
              <strong> 여포군</strong>이 반기를 들고 출현합니다. 여포군을 멸망시키면 통일 시{' '}
              <strong>+1,500점</strong> 보너스를 받습니다.
            </p>
          </section>

          <section>
            <h3 className="font-display font-bold text-[#1f1a14]">천하통일 등급 및 점수 기준</h3>
            <p className="mt-1 text-xs text-[#594b3a]">
              15개 성지 모두 점령 시: 20턴 이하 <strong>S</strong> · 21~30턴 <strong>A</strong> ·
              31~40턴 <strong>B</strong> · 41턴 이상 <strong>C</strong>
            </p>
            <p className="mt-1 text-xs text-[#594b3a]">
              업적 점수: 기본점수(최대 10,000, 턴당 -150, 최소 500) + 여포 토벌(1,500) + 잔여 병력(최대 1,500)
            </p>
          </section>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-[44px] w-full rounded-md bg-[#231f1a] px-4 py-2.5 font-display text-sm font-bold text-[#faf4e6] hover:bg-[#383128]"
        >
          전장으로 돌아가기
        </button>
      </div>
    </div>
  );
}
