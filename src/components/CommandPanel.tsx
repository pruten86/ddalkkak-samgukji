import { Flame, Shield, Swords, Users } from 'lucide-react';
import { FACTIONS, MIN_GARRISON_TROOPS } from '../game/data';
import { getRecruitAmount, getSendTroops } from '../game/engine';
import type {
  ChronicleEntry,
  CityId,
  CityState,
  CommandMode,
  FactionId,
  MarchRatio,
  PlayableFactionId,
} from '../game/types';

interface CommandPanelProps {
  selectedCity: CityState | null;
  cities: Record<CityId, CityState>;
  playerFaction: PlayableFactionId;
  ap: number;
  commandMode: CommandMode;
  marchRatio: MarchRatio;
  fireUsedThisTurn: boolean;
  fireEnhancedThisTurn: boolean;
  isAiTurn: boolean;
  activeAiFaction: FactionId | null;
  chronicle: ChronicleEntry[];
  onRecruit: () => void;
  onToggleMarchMode: () => void;
  onToggleFireMode: () => void;
  onChangeMarchRatio: (ratio: MarchRatio) => void;
  onCancelMode: () => void;
  onEndTurn: () => void;
}

const RATIO_OPTIONS: Array<{ value: MarchRatio; label: string }> = [
  { value: 0.5, label: '50%' },
  { value: 0.8, label: '80%' },
  { value: 0.95, label: '총공격 95%' },
];

export function CommandPanel({
  selectedCity,
  cities,
  playerFaction,
  ap,
  commandMode,
  marchRatio,
  fireUsedThisTurn,
  fireEnhancedThisTurn,
  isAiTurn,
  activeAiFaction,
  chronicle,
  onRecruit,
  onToggleMarchMode,
  onToggleFireMode,
  onChangeMarchRatio,
  onCancelMode,
  onEndTurn,
}: CommandPanelProps) {
  const isPlayerCity = selectedCity?.owner === playerFaction;
  const canAct = !isAiTurn && ap > 0 && isPlayerCity;
  const recruitGain = getRecruitAmount(playerFaction);

  const sendPreview =
    selectedCity && isPlayerCity ? getSendTroops(selectedCity.troops, marchRatio) : 0;
  const canMarch = canAct && (selectedCity?.troops ?? 0) > MIN_GARRISON_TROOPS;

  const hasAdjacentEnemy =
    selectedCity && isPlayerCity
      ? selectedCity.adjacent.some((adjId) => cities[adjId].owner !== playerFaction)
      : false;
  const canFire = canAct && !fireUsedThisTurn && hasAdjacentEnemy;

  const selectedFactionInfo = selectedCity ? FACTIONS[selectedCity.owner] : null;

  return (
    <aside
      aria-label="군사 명령 및 전황"
      className="flex w-full flex-col gap-3 rounded-lg border border-[#c6b391] bg-[#faf4e6] p-4 shadow-sm"
    >
      {/* Selected City Header */}
      <div className="border-b border-[#dfd1b5] pb-3">
        {selectedCity && selectedFactionInfo ? (
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block h-3.5 w-3.5 shrink-0 rounded-[3px] border border-black/25"
                  style={{ backgroundColor: selectedFactionInfo.color }}
                  aria-hidden="true"
                />
                <h2 className="font-display text-lg font-bold text-[#1f1a14] truncate">
                  {selectedCity.name}
                  {selectedCity.isImperial ? ' (황성)' : ''}
                </h2>
              </div>
              <span className="tabular-nums font-display text-xl font-black text-[#231f1a] whitespace-nowrap">
                {selectedCity.troops}
                <span className="ml-0.5 text-xs font-sans font-medium text-[#6b5d4a]">명</span>
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#635542]">
              <span>{selectedFactionInfo.name}</span>
              <span aria-hidden="true">·</span>
              <span>
                [{selectedFactionInfo.traitName}] {selectedFactionInfo.traitSummary}
              </span>
            </div>
            {selectedCity.isImperial && (
              <p className="mt-1.5 text-xs font-semibold text-[#8c6509]">
                황성 특전: 매 턴 +20 병력 · 낙양 수성 방어력 +10%
              </p>
            )}
            {!isPlayerCity && (
              <p className="mt-1.5 text-xs text-[#7c5c32]">
                적·중립 성지입니다. 아군 성지를 선택한 뒤 출진이나 화공을 실행하세요.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#635542]">지도에서 아군 성지를 선택하세요.</p>
        )}
      </div>

      {/* Contextual Target Selection Guidance */}
      {commandMode !== 'idle' && selectedCity && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-[#c99b49] bg-[#f7ecd2] px-3 py-2 text-xs text-[#4a3610]">
          <span className="font-medium">
            {commandMode === 'march'
              ? `지도에서 출진·수송할 인접 성지를 선택하세요 (${sendPreview}명 파병)`
              : `지도에서 화공을 펼칠 인접 적 성지를 선택하세요 (-${fireEnhancedThisTurn ? '50%' : '35%'})`}
          </span>
          <button
            type="button"
            onClick={onCancelMode}
            className="shrink-0 font-semibold text-[#8a2e22] underline underline-offset-2 hover:text-[#631c13]"
          >
            취소
          </button>
        </div>
      )}

      {/* 3 Primary Tactical Commands */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onRecruit}
          disabled={!canAct}
          data-testid="cmd-recruit"
          className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-md border border-[#bda884] bg-[#f3ead6] px-2 py-2 text-center transition-colors hover:bg-[#e8dcc2] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231f1a]"
        >
          <Users className="h-4 w-4 text-[#2e7d4f]" aria-hidden="true" />
          <span className="text-xs font-bold text-[#1f1a14] whitespace-nowrap">징병</span>
          <span className="tabular-nums text-[11px] font-medium text-[#5c4f3d] whitespace-nowrap">
            +{recruitGain} · 1AP
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleMarchMode}
          disabled={!canMarch}
          aria-pressed={commandMode === 'march'}
          data-testid="cmd-march"
          className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-md border px-2 py-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231f1a] ${
            commandMode === 'march'
              ? 'border-[#255a8a] bg-[#255a8a] text-white'
              : 'border-[#bda884] bg-[#f3ead6] text-[#1f1a14] hover:bg-[#e8dcc2]'
          }`}
        >
          <Swords
            className={`h-4 w-4 ${commandMode === 'march' ? 'text-white' : 'text-[#255a8a]'}`}
            aria-hidden="true"
          />
          <span className="text-xs font-bold whitespace-nowrap">출진/수송</span>
          <span
            className={`tabular-nums text-[11px] font-medium whitespace-nowrap ${
              commandMode === 'march' ? 'text-white/90' : 'text-[#5c4f3d]'
            }`}
          >
            {Math.round(marchRatio * 100)}% · 1AP
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleFireMode}
          disabled={!canFire}
          aria-pressed={commandMode === 'fire'}
          data-testid="cmd-fire"
          className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-md border px-2 py-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231f1a] ${
            commandMode === 'fire'
              ? 'border-[#b5382a] bg-[#b5382a] text-white'
              : 'border-[#bda884] bg-[#f3ead6] text-[#1f1a14] hover:bg-[#e8dcc2]'
          }`}
        >
          <Flame
            className={`h-4 w-4 ${commandMode === 'fire' ? 'text-white' : 'text-[#c94a16]'}`}
            aria-hidden="true"
          />
          <span className="text-xs font-bold whitespace-nowrap">화공</span>
          <span
            className={`tabular-nums text-[11px] font-medium whitespace-nowrap ${
              commandMode === 'fire' ? 'text-white/90' : 'text-[#5c4f3d]'
            }`}
          >
            {fireUsedThisTurn
              ? '사용 완료'
              : `-${fireEnhancedThisTurn ? '50%' : '35%'} · 1AP`}
          </span>
        </button>
      </div>

      {/* March Ratio Segmented Selector */}
      <div className="flex items-center justify-between gap-2 border-t border-[#e5d8be] pt-2.5">
        <span className="text-xs font-semibold text-[#5a4d3b] whitespace-nowrap">
          파병 비율
        </span>
        <div
          role="group"
          aria-label="파병 병력 비율"
          className="inline-flex rounded-md border border-[#cbb998] bg-[#ede2cc] p-0.5"
        >
          {RATIO_OPTIONS.map((opt) => {
            const active = marchRatio === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeMarchRatio(opt.value)}
                aria-pressed={active}
                data-testid={`ratio-${Math.round(opt.value * 100)}`}
                className={`min-h-[32px] rounded px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#231f1a] text-[#faf4e6]'
                    : 'text-[#524636] hover:text-[#1f1a14]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* End Turn CTA — Subdued while AP remains, vivid seal-red highlight once AP is 0 */}
      <button
        type="button"
        onClick={onEndTurn}
        disabled={isAiTurn}
        data-testid="btn-end-turn"
        data-ap-empty={ap === 0 ? 'true' : 'false'}
        className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 font-display text-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231f1a] whitespace-nowrap ${
          isAiTurn
            ? 'cursor-wait border border-[#c6b391] bg-[#e6dac2] text-[#635542]'
            : ap === 0
              ? 'border border-[#7e1f18] bg-[#9e2a22] text-[#faf5ea] shadow-md hover:bg-[#b23128]'
              : 'border border-[#cbb895] bg-[#efe5d0] text-[#5e513e] hover:bg-[#e6d8bc] hover:text-[#2c241b]'
        }`}
      >
        {isAiTurn ? (
          <span>
            {activeAiFaction ? `${FACTIONS[activeAiFaction].name} 행동 중...` : '적군 행동 중...'}
          </span>
        ) : (
          <>
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span>{ap === 0 ? '행동력 소진 · 턴 종료' : '턴 종료'}</span>
          </>
        )}
      </button>

      {/* Compact Battle Chronicle (visible cleanly below commands) */}
      <div className="border-t border-[#dfd1b5] pt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="font-display text-xs font-bold text-[#4a3e2e]">전황 기록</h3>
          <span className="text-[11px] text-[#786853]">최근 6건</span>
        </div>
        <ul
          aria-label="최근 전황 기록"
          className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs leading-snug"
        >
          {chronicle.slice(0, 6).map((entry) => (
            <li
              key={entry.id}
              className={`flex items-start gap-1.5 ${
                entry.highlight === 'lubu'
                  ? 'font-semibold text-[#581c5c]'
                  : entry.highlight === 'event'
                    ? 'font-medium text-[#8c4b14]'
                    : 'text-[#43392c]'
              }`}
            >
              <span className="tabular-nums shrink-0 font-semibold text-[#7a6b56]">
                {entry.turn}T
              </span>
              <span>{entry.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
