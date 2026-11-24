import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Crown,
  Download,
  Flame,
  RotateCcw,
  ScrollText,
  Share2,
  Trophy,
  X,
} from 'lucide-react';
import { FACTIONS } from '../game/data';
import { calculateAchievementScore, calculateVictoryRank } from '../game/engine';
import { LUBU_TAUNT_LINES } from '../game/portraits';
import { sound } from '../game/sound';
import type { GameEventModalData, GameStats, PlayableFactionId } from '../game/types';
import { submitHallOfFameEntry, type HallOfFameEntry } from '../lib/supabase';
import {
  downloadCertificateImage,
  generateCertificatePreviewAsset,
  isInAppBrowser,
  shareCertificateFile,
  shareCertificateRecord,
  type CertificateData,
  type CertificatePreviewAsset,
} from '../utils/certificate';
import { LordPortrait } from './LordPortrait';

interface EventModalProps {
  event: GameEventModalData;
  onClose: () => void;
}

export function EventModal({ event, onClose }: EventModalProps) {
  const isLuBu = Boolean(event.isLuBu);
  const lubuTaunt = event.victimIsPlayer
    ? LUBU_TAUNT_LINES.againstPlayer
    : LUBU_TAUNT_LINES.againstRival;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
      data-testid={isLuBu ? 'lubu-event-modal' : 'random-event-modal'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
    >
      <div
        className={`w-full max-w-md overflow-hidden rounded-lg border-2 bg-[#faf3e3] shadow-2xl ${
          isLuBu ? 'border-[#581c5c]' : 'border-[#b89f76]'
        }`}
      >
        {isLuBu ? (
          /* Dramatic Lu Bu Arrival Stage — Purple Lightning & Crimson Flame Backdrop */
          <div
            data-testid="lubu-appear-stage"
            className="relative overflow-hidden px-5 pt-6 pb-5 text-center text-[#faf3e3]"
            style={{
              background:
                'radial-gradient(circle at 50% 34%, rgba(138, 43, 146, 0.72) 0%, rgba(56, 16, 62, 0.96) 54%, rgba(24, 8, 28, 1) 100%)',
            }}
          >
            {/* Subtle Crimson Ember Glow at Bottom */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
              style={{
                background:
                  'linear-gradient(0deg, rgba(220, 38, 38, 0.34) 0%, rgba(234, 88, 12, 0.14) 52%, transparent 100%)',
              }}
            />

            {/* Purple Lightning Bolts SVG */}
            <svg
              viewBox="0 0 400 180"
              aria-hidden="true"
              className="lubu-lightning-pulse pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
            >
              <path
                d="M52 0 L84 48 L64 56 L106 118 L82 76 L102 68 Z"
                fill="#e9b3ff"
                fillOpacity="0.45"
              />
              <path
                d="M348 0 L314 52 L334 60 L292 126 L318 80 L298 72 Z"
                fill="#f0abfc"
                fillOpacity="0.42"
              />
              <path
                d="M28 165 Q100 130 155 170 T290 164 T385 174"
                fill="none"
                stroke="#f97316"
                strokeWidth="2.5"
                strokeOpacity="0.38"
              />
            </svg>

            <div className="relative z-10 flex flex-col items-center">
              <LordPortrait faction="lubu" emotion="appear" size="xl" />
              <p className="mt-3 text-xs font-bold tracking-[0.14em] text-[#e7b8f0]">
                {event.subtitle}
              </p>
              <h2
                id="event-modal-title"
                className="mt-0.5 font-display text-2xl font-black tracking-tight text-[#fff7ec]"
              >
                {event.title}
              </h2>
              <p
                data-testid="lubu-taunt-line"
                className="mt-3 w-full rounded-md border border-[#d89ce6]/35 bg-black/35 px-3.5 py-2 font-display text-xs font-bold leading-relaxed text-[#fce9ff] sm:text-sm"
              >
                {lubuTaunt}
              </p>
            </div>
          </div>
        ) : (
          <div className="px-6 pt-6">
            <div className="mb-3 flex items-center gap-2.5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: event.accentColor }}
                aria-hidden="true"
              >
                <Flame className="h-5 w-5" />
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
          </div>
        )}

        <div className={isLuBu ? 'p-5 sm:p-6' : 'px-6 pb-6'}>
          {isLuBu && (
            <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-[#581c5c]">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>긴급 전보</span>
            </div>
          )}

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
            onClick={() => {
              sound.playClick();
              onClose();
            }}
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
  onRegisteredHof: (entry: HallOfFameEntry) => void;
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
  const [savingImg, setSavingImg] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [certPreview, setCertPreview] = useState<CertificatePreviewAsset | null>(null);
  const [previewSharing, setPreviewSharing] = useState(false);

  const buildCertificateData = (): CertificateData => ({
    nickname,
    factionId: playerFaction,
    rank: rankInfo.rank,
    rankTitle: rankInfo.title,
    turns: turn,
    totalScore: scoreInfo.totalScore,
    baseScore: scoreInfo.baseScore,
    lubuBonus: scoreInfo.lubuBonus,
    troopBonus: scoreInfo.troopBonus,
    battlesWon: stats.battlesWon,
    battlesFought: stats.battlesFought,
    totalTroops,
    lubuSpawned,
    lubuDefeated,
  });

  const handleSubmitHof = async (e: FormEvent) => {
    e.preventDefault();
    if (hasRegisteredHof || submitting) return;
    sound.playClick();

    const trimmed = nickname.trim();
    if (trimmed.length < 1 || trimmed.length > 12) {
      setFormError('닉네임은 1~12자로 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const { entry } = await submitHallOfFameEntry({
        nickname: trimmed,
        faction: playerFaction,
        rank: rankInfo.rank,
        turns: turn,
        lubu_defeated: lubuDefeated,
        score: scoreInfo.totalScore,
      });
      onRegisteredHof(entry);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCertificate = async () => {
    if (savingImg) return;
    sound.playClick();
    setSavingImg(true);
    setActionNotice(null);
    try {
      const certData = buildCertificateData();
      // In KakaoTalk and other in-app WebViews, never trigger programmatic <a download>
      // because OS DownloadManager rejects blob:/data: URLs with "unsupported format".
      if (isInAppBrowser()) {
        const preview = generateCertificatePreviewAsset(certData);
        setCertPreview(preview);
        return;
      }

      const filename = await downloadCertificateImage(certData);
      setActionNotice(`인증서 이미지(${filename})를 저장했습니다.`);
    } catch {
      setActionNotice('이미지 저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSavingImg(false);
    }
  };

  const handleSharePreviewFile = async () => {
    if (!certPreview?.file || previewSharing) return;
    sound.playClick();
    setPreviewSharing(true);
    try {
      const result = await shareCertificateFile(certPreview.file, buildCertificateData());
      if (result === 'shared') {
        setActionNotice('천하통일 인증서를 공유했습니다!');
      }
      // 'cancelled' (AbortError) is intentionally ignored without showing an error
    } finally {
      setPreviewSharing(false);
    }
  };

  const handleShareRecord = async () => {
    if (sharing) return;
    sound.playClick();
    setSharing(true);
    setActionNotice(null);
    try {
      const result = await shareCertificateRecord(buildCertificateData());
      if (result === 'copied') {
        setActionNotice('기록이 클립보드에 복사되었습니다!');
      } else if (result === 'shared') {
        setActionNotice('천하통일 기록을 공유했습니다!');
      }
    } catch {
      setActionNotice('기록 공유에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settlement-modal-title"
      data-testid="settlement-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4"
    >
      <div className="max-h-[92dvh] w-full max-w-md overflow-x-hidden overflow-y-auto rounded-lg border-2 border-[#a88d5c] bg-[#faf3e3] p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2.5 border-b border-[#dfd0b3] pb-4 sm:gap-3">
          <LordPortrait
            faction={playerFaction}
            emotion={isVictory ? 'victory' : 'defeat'}
            size="md"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[#6e5d47]">
              딸깍 삼국지 · {faction.name} · 제 {turn}턴
            </p>
            <h2
              id="settlement-modal-title"
              className="mt-0.5 font-display text-lg font-black text-[#1f1a14] sm:text-2xl"
            >
              {isVictory ? '5분만에 천하통일!' : '세력 멸망'}
            </h2>
            <p className="mt-0.5 text-xs text-[#594b3a]">
              {isVictory
                ? `${rankInfo.title} — ${rankInfo.comment}`
                : '모든 성지를 상실하여 대업이 좌절되었습니다.'}
            </p>
          </div>

          {isVictory ? (
            <div
              className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md border-2 border-[#9e2a22] bg-[#9e2a22] text-[#faf3e3] shadow-sm sm:h-16 sm:w-16"
              aria-label={`최종 등급 ${rankInfo.rank}`}
            >
              <span className="text-[10px] font-semibold opacity-85">등급</span>
              <span className="font-display text-2xl font-black leading-none sm:text-3xl">
                {rankInfo.rank}
              </span>
            </div>
          ) : (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#4a4138] text-[#faf3e3]"
              aria-hidden="true"
            >
              <Crown className="h-6 w-6 opacity-70" />
            </div>
          )}
        </div>

        {/* Final Achievement Score Banner on Victory */}
        {isVictory && (
          <div className="mb-4 rounded-md border border-[#cbb07b] bg-[#f4e7c6] px-3.5 py-3">
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
          <div className="mb-3 rounded-md border border-[#d6c5a3] bg-[#f5ecd9] p-3">
            {hasRegisteredHof ? (
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <p
                  data-testid="hof-registered-message"
                  className="text-xs font-bold text-[#24633e]"
                >
                  ✅ 명예의 전당에 등록되었습니다!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onOpenHallOfFame();
                  }}
                  data-testid="btn-view-hof-after-register"
                  className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#9a7222] px-3.5 py-1.5 text-xs font-bold text-[#faf4e6] hover:brightness-110 whitespace-nowrap"
                >
                  <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>명예의 전당 보기</span>
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
                <div className="flex w-full items-center gap-2">
                  <input
                    id="hof-nickname-input"
                    type="text"
                    value={nickname}
                    maxLength={12}
                    enterKeyHint="done"
                    onChange={(e) => {
                      setNickname(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="장수 닉네임 입력"
                    data-testid="hof-nickname-input"
                    className="min-h-[42px] min-w-0 flex-1 rounded-md border border-[#bda884] bg-[#fffcf5] px-3 text-sm text-[#1f1a14] placeholder:text-[#9c8d77] focus:border-[#231f1a] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    aria-label="명예의 전당 등록"
                    data-testid="btn-register-hof"
                    className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#9a7222] px-4 text-xs font-bold text-[#faf4e6] hover:brightness-110 disabled:opacity-50 whitespace-nowrap"
                  >
                    <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{submitting ? '등록 중' : '등록'}</span>
                  </button>
                </div>
                {formError && <p className="text-xs font-medium text-[#a82921]">{formError}</p>}
              </form>
            )}
          </div>
        )}

        {/* Save Certificate PNG & External Share Buttons (Victory Only) */}
        {isVictory && (
          <div className="mb-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void handleSaveCertificate()}
                disabled={savingImg}
                data-testid="btn-save-certificate"
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-md border border-[#bfa87e] bg-[#f1e5ca] px-3 py-2 text-xs font-bold text-[#2b2217] transition-colors hover:bg-[#e6d6b2] disabled:opacity-50 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{savingImg ? '생성 중...' : '기록 이미지 저장'}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleShareRecord()}
                disabled={sharing}
                data-testid="btn-share-record"
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-md border border-[#231f1a] bg-[#2c251d] px-3 py-2 text-xs font-bold text-[#faf4e6] transition-colors hover:bg-[#3d3429] disabled:opacity-50 whitespace-nowrap"
              >
                <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{sharing ? '공유 중...' : '기록 공유하기'}</span>
              </button>
            </div>
            {actionNotice && (
              <p
                role="status"
                data-testid="settlement-action-notice"
                className="rounded-md border border-[#c7b38a] bg-[#f6ecd4] px-3 py-1.5 text-center text-xs font-semibold text-[#3f321e]"
              >
                {actionNotice}
              </p>
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
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 font-display text-sm font-bold text-[#faf4e6] hover:brightness-110 whitespace-nowrap"
            style={{ backgroundColor: faction.color }}
          >
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>같은 세력으로 재도전</span>
          </button>
          <button
            type="button"
            onClick={onReturnLobby}
            className="min-h-[44px] shrink-0 rounded-md border border-[#bda884] bg-[#efe4cc] px-4 py-2.5 text-sm font-semibold text-[#2b241c] hover:bg-[#e5d6b7] whitespace-nowrap"
          >
            출정 로비로
          </button>
        </div>
      </div>

      {/* In-App Browser Certificate Preview Modal (KakaoTalk / Naver / Instagram / Line / FB) */}
      {certPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cert-preview-title"
          data-testid="certificate-preview-modal"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-3 sm:p-4"
        >
          <div className="flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-lg border-2 border-[#b49b6c] bg-[#faf3e3] shadow-2xl">
            {/* Top Header */}
            <div className="flex items-center justify-between gap-2 border-b border-[#dfd0b3] bg-[#f2e6ce] px-4 py-3">
              <h3
                id="cert-preview-title"
                className="font-display text-base font-black text-[#1f1a14]"
              >
                천하통일 인증서 미리보기
              </h3>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setCertPreview(null);
                }}
                aria-label="인증서 미리보기 닫기"
                data-testid="btn-close-cert-preview-x"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#5c4f3d] hover:bg-[#e4d5b6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Clear Long-Press Save Instruction Banner */}
            <div
              data-testid="cert-preview-guide-banner"
              className="border-b border-[#dcc48c] bg-[#f7e9c2] px-4 py-2.5 text-center text-xs font-bold leading-snug text-[#5c3d0c]"
            >
              카카오톡에서는 아래 이미지를 꾹(1초 이상) 눌러 「이미지 저장」을 선택해 주세요!
            </div>

            {/* Unobstructed PNG Image Area — Topmost Touch Target for Long-Press Save */}
            <div className="flex-1 overflow-y-auto bg-[#efe4cc]/65 p-3">
              <img
                src={certPreview.dataUrl}
                alt="딸깍 삼국지 천하통일 인증서"
                data-testid="cert-preview-img"
                className="cert-preview-img relative z-10 pointer-events-auto block h-auto w-full rounded-md border border-[#c6b18b] shadow-md"
              />
            </div>

            {/* Bottom Actions & Helper Notice */}
            <div className="space-y-2 border-t border-[#dfd0b3] bg-[#f3e8d2] px-4 py-3">
              <div className="flex items-center justify-end gap-2">
                {certPreview.canNativeShareFile && certPreview.file && (
                  <button
                    type="button"
                    onClick={() => void handleSharePreviewFile()}
                    disabled={previewSharing}
                    data-testid="btn-cert-preview-share"
                    className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-md bg-[#9a7222] px-3.5 py-2 text-xs font-bold text-[#faf4e6] hover:brightness-110 disabled:opacity-50 whitespace-nowrap"
                  >
                    <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{previewSharing ? '공유 중...' : '공유 / 사진에 저장'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setCertPreview(null);
                  }}
                  data-testid="btn-close-cert-preview"
                  className={`min-h-[42px] shrink-0 rounded-md bg-[#231f1a] px-5 py-2 text-xs font-bold text-[#faf4e6] hover:bg-[#383128] whitespace-nowrap ${
                    certPreview.canNativeShareFile && certPreview.file ? '' : 'w-full'
                  }`}
                >
                  닫기
                </button>
              </div>
              <p className="text-center text-[11px] leading-snug text-[#6a5b46]">
                저장 메뉴가 안 뜰 경우 화면을 캡처하거나 우측 상단(⋮) → &apos;다른 브라우저로
                열기&apos;를 이용해 주세요.
              </p>
            </div>
          </div>
        </div>
      )}
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
            onClick={() => {
              sound.playClick();
              onClose();
            }}
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
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="mt-5 min-h-[44px] w-full rounded-md bg-[#231f1a] px-4 py-2.5 font-display text-sm font-bold text-[#faf4e6] hover:bg-[#383128]"
        >
          전장으로 돌아가기
        </button>
      </div>
    </div>
  );
}

interface EndTurnConfirmModalProps {
  remainingAp: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function EndTurnConfirmModal({
  remainingAp,
  onCancel,
  onConfirm,
}: EndTurnConfirmModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-turn-confirm-title"
      data-testid="end-turn-confirm-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
    >
      <div className="w-full max-w-sm rounded-lg border-2 border-[#b49d76] bg-[#faf3e3] p-5 shadow-2xl sm:p-6">
        <div className="mb-3 flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#b07d1f] text-[#faf4e6]"
            aria-hidden="true"
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2
            id="end-turn-confirm-title"
            className="font-display text-lg font-bold text-[#1f1a14]"
          >
            아직 행동력이 남아 있습니다
          </h2>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-[#3f3529]">
          남은 행동력이 <strong className="tabular-nums text-[#9e2a22]">{remainingAp}</strong>{' '}
          있습니다. 행동을 마저 하지 않고 정말 턴을 넘기시겠습니까?
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            data-testid="btn-cancel-end-turn"
            className="min-h-[44px] rounded-md border border-[#bda884] bg-[#efe4cc] px-3 py-2 text-xs font-bold text-[#2b241c] transition-colors hover:bg-[#e5d6b7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231f1a] whitespace-nowrap sm:text-sm"
          >
            취소 (계속 행동)
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="btn-confirm-end-turn"
            className="min-h-[44px] rounded-md bg-[#9e2a22] px-3 py-2 font-display text-xs font-bold text-[#faf4e6] transition-colors hover:bg-[#b53228] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231f1a] whitespace-nowrap sm:text-sm"
          >
            턴 넘기기
          </button>
        </div>
      </div>
    </div>
  );
}
