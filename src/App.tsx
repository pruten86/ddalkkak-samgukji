import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, RotateCcw, Trophy, Volume2, VolumeX } from 'lucide-react';
import { CommandPanel } from './components/CommandPanel';
import { EventModal, RulesModal, SettlementModal } from './components/GameModals';
import { HallOfFameModal } from './components/HallOfFameModal';
import { LegendBar } from './components/LegendBar';
import { LobbyScreen } from './components/LobbyScreen';
import { SplashScreen } from './components/SplashScreen';
import { StrategyMap } from './components/StrategyMap';
import { FACTIONS, MAX_AP, PLAYABLE_FACTIONS } from './game/data';
import {
  applyEndOfRoundGrowth,
  checkLuBuAppearance,
  checkOutcome,
  countTerritories,
  countTotalTroops,
  createInitialGameState,
  executeFireAttack,
  executeMarchOrTransport,
  executeRecruit,
  getOwnedCities,
  hasDefeatedLuBu,
  planAiAction,
  triggerThreeTurnEvent,
} from './game/engine';
import { sound } from './game/sound';
import type {
  ChronicleEntry,
  CityBurstEffect,
  CityId,
  FactionId,
  GameState,
  MarchArrowEffect,
  MarchRatio,
  PlayableFactionId,
} from './game/types';

function createBootGameState(): GameState {
  if (typeof window === 'undefined') {
    return createInitialGameState('shu', 'splash');
  }
  const params = new URLSearchParams(window.location.search);
  return createInitialGameState('shu', params.get('autostart') === '1' ? 'playing' : 'splash');
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function App() {
  const [state, setState] = useState<GameState>(() => createBootGameState());
  const [muted, setMuted] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [hasRegisteredHof, setHasRegisteredHof] = useState(false);
  const [marchArrows, setMarchArrows] = useState<MarchArrowEffect[]>([]);
  const [cityBursts, setCityBursts] = useState<CityBurstEffect[]>([]);
  const [shakeMap, setShakeMap] = useState(false);

  const aiAbortRef = useRef<number>(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Mirror game state machine to document.body.dataset.state
  useEffect(() => {
    const bodyState =
      state.phase === 'victory' || state.phase === 'defeat'
        ? 'gameover'
        : state.phase === 'splash' || state.phase === 'lobby'
          ? 'title'
          : state.phase;
    document.body.dataset.state = bodyState;
  }, [state.phase]);

  const spawnBurst = useCallback(
    (
      cityId: CityId,
      kind: CityBurstEffect['kind'],
      label: string,
      color: string,
      duration = 1100
    ) => {
      const id = uid('burst');
      setCityBursts((prev) => [...prev, { id, cityId, kind, label, color }]);
      window.setTimeout(() => {
        setCityBursts((prev) => prev.filter((b) => b.id !== id));
      }, duration);
    },
    []
  );

  const spawnArrow = useCallback(
    (
      fromId: CityId,
      toId: CityId,
      faction: FactionId,
      troops: number,
      kind: 'attack' | 'transport',
      duration = 650
    ) => {
      const id = uid('arrow');
      setMarchArrows((prev) => [...prev, { id, fromId, toId, faction, troops, kind }]);
      window.setTimeout(() => {
        setMarchArrows((prev) => prev.filter((a) => a.id !== id));
      }, duration);
    },
    []
  );

  const triggerShake = useCallback(() => {
    setShakeMap(true);
    window.setTimeout(() => setShakeMap(false), 340);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      sound.setMuted(next);
      return next;
    });
  }, []);

  const handleProceedFromSplash = useCallback(() => {
    sound.playDrum();
    setState((prev) => ({ ...prev, phase: 'lobby' }));
  }, []);

  const handleBackToSplash = useCallback(() => {
    aiAbortRef.current += 1;
    sound.playSelect();
    setShowHallOfFame(false);
    setShowRules(false);
    setState((prev) => createInitialGameState(prev.playerFaction, 'splash'));
  }, []);

  const handleSelectLobbyFaction = useCallback((faction: PlayableFactionId) => {
    sound.playSelect();
    setState((prev) => createInitialGameState(faction, prev.phase));
  }, []);

  const handleStartGame = useCallback(() => {
    aiAbortRef.current += 1;
    sound.playDrum();
    setMarchArrows([]);
    setCityBursts([]);
    setShowRules(false);
    setShowHallOfFame(false);
    setHasRegisteredHof(false);
    setState((prev) => createInitialGameState(prev.playerFaction, 'playing'));
  }, []);

  const handleRestartSameFaction = useCallback(() => {
    aiAbortRef.current += 1;
    sound.playDrum();
    setMarchArrows([]);
    setCityBursts([]);
    setShowRules(false);
    setShowHallOfFame(false);
    setHasRegisteredHof(false);
    setState((prev) => createInitialGameState(prev.playerFaction, 'playing'));
  }, []);

  const handleReturnLobby = useCallback(() => {
    aiAbortRef.current += 1;
    setMarchArrows([]);
    setCityBursts([]);
    setShowRules(false);
    setShowHallOfFame(false);
    setHasRegisteredHof(false);
    setState((prev) => createInitialGameState(prev.playerFaction, 'lobby'));
  }, []);

  const handleRecruit = useCallback(() => {
    const cur = stateRef.current;
    if (cur.phase !== 'playing' || cur.isAiTurn || cur.ap <= 0 || !cur.selectedCityId) return;
    const city = cur.cities[cur.selectedCityId];
    if (!city || city.owner !== cur.playerFaction) return;

    const { cities: nextCities, gained } = executeRecruit(cur.cities, city.id);
    sound.playDrum();
    spawnBurst(city.id, 'recruit', `+${gained}`, FACTIONS[cur.playerFaction].color);

    const logEntry: ChronicleEntry = {
      id: uid('log'),
      turn: cur.turn,
      text: `${city.name}에서 병력 ${gained}명을 징병했습니다.`,
      faction: cur.playerFaction,
    };

    setState((prev) => ({
      ...prev,
      cities: nextCities,
      ap: prev.ap - 1,
      commandMode: 'idle',
      chronicle: [logEntry, ...prev.chronicle].slice(0, 30),
    }));
  }, [spawnBurst]);

  const handleToggleMarchMode = useCallback(() => {
    sound.playSelect();
    setState((prev) => ({
      ...prev,
      commandMode: prev.commandMode === 'march' ? 'idle' : 'march',
    }));
  }, []);

  const handleToggleFireMode = useCallback(() => {
    sound.playSelect();
    setState((prev) => ({
      ...prev,
      commandMode: prev.commandMode === 'fire' ? 'idle' : 'fire',
    }));
  }, []);

  const handleChangeMarchRatio = useCallback((ratio: MarchRatio) => {
    sound.playSelect();
    setState((prev) => ({ ...prev, marchRatio: ratio }));
  }, []);

  const handleCancelMode = useCallback(() => {
    setState((prev) => ({ ...prev, commandMode: 'idle' }));
  }, []);

  const handleSelectCity = useCallback(
    (targetId: CityId) => {
      const cur = stateRef.current;
      if (cur.phase !== 'playing' || cur.isAiTurn || cur.pendingEvent) return;

      const selected = cur.selectedCityId ? cur.cities[cur.selectedCityId] : null;
      const target = cur.cities[targetId];

      // Execute March or Transport if in march mode & clicking a valid adjacent target
      if (
        cur.commandMode === 'march' &&
        selected &&
        selected.owner === cur.playerFaction &&
        selected.adjacent.includes(targetId) &&
        cur.ap > 0
      ) {
        const res = executeMarchOrTransport(cur.cities, selected.id, targetId, cur.marchRatio);
        if (!res) return;

        if (res.kind === 'transport') {
          sound.playSelect();
          spawnArrow(selected.id, targetId, cur.playerFaction, res.sentTroops, 'transport');
          spawnBurst(targetId, 'recruit', `+${res.sentTroops}`, FACTIONS[cur.playerFaction].color);

          const logEntry: ChronicleEntry = {
            id: uid('log'),
            turn: cur.turn,
            text: `${selected.name} → ${target.name} 병력 ${res.sentTroops}명 수송`,
            faction: cur.playerFaction,
          };

          setState((prev) => ({
            ...prev,
            cities: res.cities,
            ap: prev.ap - 1,
            selectedCityId: targetId,
            commandMode: 'idle',
            chronicle: [logEntry, ...prev.chronicle].slice(0, 30),
          }));
          return;
        }

        // Battle!
        const battle = res.battle!;
        sound.playClash();
        triggerShake();
        spawnArrow(selected.id, targetId, cur.playerFaction, res.sentTroops, 'attack');
        spawnBurst(
          targetId,
          battle.attackerWon ? 'capture' : 'clash',
          battle.attackerWon ? '점령!' : '격퇴됨',
          battle.attackerWon ? FACTIONS[cur.playerFaction].color : '#a82921'
        );

        const outcome = checkOutcome(res.cities, cur.playerFaction);
        const counts = countTerritories(res.cities);
        const defeatedLuBuNow = cur.lubuDefeated || hasDefeatedLuBu(cur.lubuSpawned, res.cities);

        const logEntry: ChronicleEntry = {
          id: uid('log'),
          turn: cur.turn,
          text: battle.attackerWon
            ? `${selected.name}군(${res.sentTroops}명)이 ${target.name}을(를) 점령했습니다! (잔여 ${battle.remainingTroops})`
            : `${target.name} 공격이 실패했습니다 (수비 잔여 ${battle.remainingTroops})`,
          faction: cur.playerFaction,
          highlight: 'battle',
        };

        const extraLogs: ChronicleEntry[] = [logEntry];
        if (!cur.lubuDefeated && defeatedLuBuNow) {
          extraLogs.unshift({
            id: uid('lubu-defeated'),
            turn: cur.turn,
            text: '천하무쌍 여포군을 완전히 토벌했습니다! (+1,500점 보너스 확보)',
            faction: 'lubu',
            highlight: 'lubu',
          });
        }

        if (outcome === 'victory') {
          window.setTimeout(() => sound.playFanfare(), 250);
        }

        setState((prev) => ({
          ...prev,
          phase: outcome ?? prev.phase,
          cities: res.cities,
          ap: prev.ap - 1,
          selectedCityId: battle.attackerWon ? targetId : selected.id,
          commandMode: 'idle',
          lubuDefeated: prev.lubuDefeated || defeatedLuBuNow,
          chronicle: [...extraLogs, ...prev.chronicle].slice(0, 30),
          stats: {
            ...prev.stats,
            battlesFought: prev.stats.battlesFought + 1,
            battlesWon: prev.stats.battlesWon + (battle.attackerWon ? 1 : 0),
            peakTerritories: Math.max(prev.stats.peakTerritories, counts[cur.playerFaction]),
          },
        }));
        return;
      }

      // Execute Fire Attack if in fire mode & clicking adjacent enemy
      if (
        cur.commandMode === 'fire' &&
        selected &&
        selected.owner === cur.playerFaction &&
        selected.adjacent.includes(targetId) &&
        target.owner !== cur.playerFaction &&
        cur.ap > 0 &&
        !cur.fireUsedThisTurn
      ) {
        const res = executeFireAttack(
          cur.cities,
          selected.id,
          targetId,
          cur.fireEnhancedThisTurn
        );
        if (!res) return;

        sound.playFire();
        triggerShake();
        spawnBurst(targetId, 'fire', `화공 -${res.troopsLost}`, '#d9480f', 1200);

        const logEntry: ChronicleEntry = {
          id: uid('log'),
          turn: cur.turn,
          text: `${selected.name}에서 ${target.name}에 화공을 펼쳐 적 병력 ${res.troopsLost}명을 소멸시켰습니다!`,
          faction: cur.playerFaction,
          highlight: 'battle',
        };

        setState((prev) => ({
          ...prev,
          cities: res.cities,
          ap: prev.ap - 1,
          fireUsedThisTurn: true,
          commandMode: 'idle',
          chronicle: [logEntry, ...prev.chronicle].slice(0, 30),
          stats: {
            ...prev.stats,
            firesUsed: prev.stats.firesUsed + 1,
          },
        }));
        return;
      }

      // Default: select clicked city & reset command mode
      sound.playSelect();
      setState((prev) => ({
        ...prev,
        selectedCityId: targetId,
        commandMode: 'idle',
      }));
    },
    [spawnArrow, spawnBurst, triggerShake]
  );

  const handleEndTurn = useCallback(async () => {
    const startSnap = stateRef.current;
    if (startSnap.phase !== 'playing' || startSnap.isAiTurn || startSnap.pendingEvent) return;

    const runToken = ++aiAbortRef.current;
    setState((prev) => ({
      ...prev,
      commandMode: 'idle',
      isAiTurn: true,
    }));

    let workingCities = startSnap.cities;
    let workingLubuDefeated = startSnap.lubuDefeated;
    const newLogs: ChronicleEntry[] = [];
    const currentTurn = startSnap.turn;
    const playerFaction = startSnap.playerFaction;
    const lubuTargetFaction = startSnap.lubuTargetFaction;

    const aiOrder: FactionId[] = [
      ...PLAYABLE_FACTIONS.filter((f) => f !== playerFaction),
      ...(startSnap.lubuSpawned ? (['lubu'] as FactionId[]) : []),
    ];

    for (const aiFaction of aiOrder) {
      if (aiAbortRef.current !== runToken) return;
      if (getOwnedCities(workingCities, aiFaction).length === 0) continue;

      setState((prev) => ({ ...prev, activeAiFaction: aiFaction }));

      for (let step = 0; step < MAX_AP; step++) {
        if (aiAbortRef.current !== runToken) return;

        const plan = planAiAction(workingCities, aiFaction, lubuTargetFaction);
        if (!plan) break;

        if (plan.type === 'attack') {
          const fromName = workingCities[plan.fromId].name;
          const toName = workingCities[plan.toId].name;
          const res = executeMarchOrTransport(workingCities, plan.fromId, plan.toId, plan.ratio);
          if (res && res.battle) {
            spawnArrow(plan.fromId, plan.toId, aiFaction, res.sentTroops, 'attack', 550);
            await delay(300);
            if (aiAbortRef.current !== runToken) return;

            workingCities = res.cities;
            if (!workingLubuDefeated && hasDefeatedLuBu(startSnap.lubuSpawned, workingCities)) {
              workingLubuDefeated = true;
            }
            sound.playClash();
            if (res.battle.defenderFaction === playerFaction) {
              triggerShake();
            }
            spawnBurst(
              plan.toId,
              res.battle.attackerWon ? 'capture' : 'clash',
              res.battle.attackerWon ? `${FACTIONS[aiFaction].shortName} 점령` : '방어 성공',
              res.battle.attackerWon ? FACTIONS[aiFaction].color : '#594b3a',
              950
            );
            newLogs.unshift({
              id: uid('ailog'),
              turn: currentTurn,
              text: res.battle.attackerWon
                ? `${FACTIONS[aiFaction].shortName}(${fromName})이 ${toName}을(를) 점령했습니다.`
                : `${FACTIONS[aiFaction].shortName}의 ${toName} 공격이 격퇴되었습니다.`,
              faction: aiFaction,
              highlight: res.battle.defenderFaction === playerFaction ? 'battle' : 'normal',
            });
            setState((prev) => ({
              ...prev,
              cities: workingCities,
              lubuDefeated: workingLubuDefeated,
              chronicle: [newLogs[0], ...prev.chronicle].slice(0, 30),
            }));
            await delay(260);
          }
        } else if (plan.type === 'transport') {
          const res = executeMarchOrTransport(workingCities, plan.fromId, plan.toId, plan.ratio);
          if (res) {
            spawnArrow(plan.fromId, plan.toId, aiFaction, res.sentTroops, 'transport', 460);
            await delay(260);
            if (aiAbortRef.current !== runToken) return;
            workingCities = res.cities;
            setState((prev) => ({ ...prev, cities: workingCities }));
          }
        } else {
          const rec = executeRecruit(workingCities, plan.cityId);
          workingCities = rec.cities;
          spawnBurst(plan.cityId, 'recruit', `+${rec.gained}`, FACTIONS[aiFaction].color, 750);
          setState((prev) => ({ ...prev, cities: workingCities }));
          await delay(220);
        }

        if (checkOutcome(workingCities, playerFaction) === 'defeat') {
          sound.playDefeat();
          setState((prev) => ({
            ...prev,
            phase: 'defeat',
            cities: workingCities,
            lubuDefeated: workingLubuDefeated,
            isAiTurn: false,
            activeAiFaction: null,
          }));
          return;
        }
      }
    }

    if (aiAbortRef.current !== runToken) return;

    const growth = applyEndOfRoundGrowth(workingCities);
    workingCities = growth.cities;
    if (growth.luoyangBonusRecipient) {
      spawnBurst('luoyang', 'recruit', '+20 황성', '#b8860b', 1000);
    }

    const nextTurn = currentTurn + 1;
    let nextLubuSpawned = startSnap.lubuSpawned;
    let nextLubuTarget = startSnap.lubuTargetFaction;
    let pendingEvent = null;
    let nextEnhanceFire = false;
    let nextAp = MAX_AP;
    const turnStartLogs: ChronicleEntry[] = [];

    const lubuCheck = checkLuBuAppearance(
      workingCities,
      nextTurn,
      nextLubuSpawned,
      playerFaction
    );

    if (lubuCheck.triggered && lubuCheck.betrayedCityId && lubuCheck.eventModal) {
      workingCities = lubuCheck.cities;
      nextLubuSpawned = true;
      nextLubuTarget = lubuCheck.victimFaction ?? null;
      pendingEvent = lubuCheck.eventModal;

      sound.playLuBuAlert();
      triggerShake();
      spawnBurst(lubuCheck.betrayedCityId, 'lubu', '여포 출현!', FACTIONS.lubu.color, 1600);

      turnStartLogs.push({
        id: uid('lubu-log'),
        turn: nextTurn,
        text: `여포군이 「${workingCities[lubuCheck.betrayedCityId].name}」에서 반기를 들고 독립했습니다! (병력 ${lubuCheck.initialTroops})`,
        faction: 'lubu',
        highlight: 'lubu',
      });
    } else if (nextTurn % 3 === 0) {
      const ev = triggerThreeTurnEvent(workingCities, playerFaction);
      workingCities = ev.cities;
      pendingEvent = ev.eventModal;
      nextEnhanceFire = ev.enhanceFireThisTurn;
      nextAp = MAX_AP + ev.bonusAp;

      if (ev.eventModal.type === 'southeast_wind') {
        sound.playFire();
      } else {
        sound.playDrum();
      }
      if (ev.targetCityId) {
        spawnBurst(ev.targetCityId, 'recruit', ev.eventModal.title, ev.eventModal.accentColor, 1200);
      }

      turnStartLogs.push({
        id: uid('ev-log'),
        turn: nextTurn,
        text: `[돌발 사건] ${ev.eventModal.title} — ${ev.eventModal.effectSummary}`,
        highlight: 'event',
      });
    }

    const finalOutcome = checkOutcome(workingCities, playerFaction);
    const counts = countTerritories(workingCities);
    if (finalOutcome === 'victory') sound.playFanfare();
    if (finalOutcome === 'defeat') sound.playDefeat();

    const ownedNow = getOwnedCities(workingCities, playerFaction);
    const currentSel = stateRef.current.selectedCityId;
    const nextSelected =
      currentSel && workingCities[currentSel]?.owner === playerFaction
        ? currentSel
        : (ownedNow[0]?.id ?? currentSel);

    setState((prev) => ({
      ...prev,
      phase: finalOutcome ?? prev.phase,
      turn: nextTurn,
      ap: nextAp,
      fireUsedThisTurn: false,
      fireEnhancedThisTurn: nextEnhanceFire,
      cities: workingCities,
      selectedCityId: nextSelected,
      lubuSpawned: nextLubuSpawned,
      lubuDefeated: workingLubuDefeated || hasDefeatedLuBu(nextLubuSpawned, workingCities),
      lubuTargetFaction: nextLubuTarget,
      isAiTurn: false,
      activeAiFaction: null,
      pendingEvent: finalOutcome ? null : pendingEvent,
      chronicle: [...turnStartLogs, ...prev.chronicle].slice(0, 30),
      stats: {
        ...prev.stats,
        peakTerritories: Math.max(prev.stats.peakTerritories, counts[playerFaction]),
      },
    }));
  }, [spawnArrow, spawnBurst, triggerShake]);

  // Global keyboard shortcuts during gameplay & modals
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const cur = stateRef.current;

      if (e.key === 'Escape') {
        if (showHallOfFame) {
          setShowHallOfFame(false);
          return;
        }
        if (showRules) {
          setShowRules(false);
          return;
        }
        if (cur.pendingEvent) {
          setState((prev) => ({ ...prev, pendingEvent: null }));
          return;
        }
        if (cur.commandMode !== 'idle') {
          setState((prev) => ({ ...prev, commandMode: 'idle' }));
        }
        return;
      }

      if (cur.phase !== 'playing') return;

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
        return;
      }

      if (
        e.key === ' ' &&
        !cur.isAiTurn &&
        !cur.pendingEvent &&
        !showRules &&
        !showHallOfFame
      ) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'BUTTON' || tag === 'INPUT') return;
        e.preventDefault();
        void handleEndTurn();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleEndTurn, showHallOfFame, showRules, toggleMute]);

  const counts = useMemo(() => countTerritories(state.cities), [state.cities]);
  const playerTotalTroops = useMemo(
    () => countTotalTroops(state.cities, state.playerFaction),
    [state.cities, state.playerFaction]
  );

  // Stage 1: Full-screen Splash Screen
  if (state.phase === 'splash') {
    return <SplashScreen onProceed={handleProceedFromSplash} />;
  }

  // Stage 2: Expedition Lobby Screen
  if (state.phase === 'lobby') {
    return (
      <>
        <LobbyScreen
          selectedFaction={state.playerFaction}
          onSelectFaction={handleSelectLobbyFaction}
          onStart={handleStartGame}
          onBackToSplash={handleBackToSplash}
          onOpenHallOfFame={() => {
            sound.playSelect();
            setShowHallOfFame(true);
          }}
        />
        {showHallOfFame && <HallOfFameModal onClose={() => setShowHallOfFame(false)} />}
      </>
    );
  }

  // Stage 3: Battlefield
  const playerInfo = FACTIONS[state.playerFaction];
  const selectedCity = state.selectedCityId ? state.cities[state.selectedCityId] : null;

  return (
    <div className="min-h-[100dvh] w-full hanji-surface flex flex-col">
      {/* Compact Game Top HUD Bar */}
      <header className="w-full bg-[#241e18] text-[#f5ecd8] px-3 py-2 sm:px-5">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-2 sm:gap-3">
          {/* Left: Official Game Brand + Live Turn & AP Seals */}
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
            <button
              type="button"
              onClick={handleReturnLobby}
              className="flex items-center gap-2 text-left hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5ecd8]"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-[#9e2a22] font-display text-sm font-black text-[#faf3e3]">
                統
              </span>
              <span className="font-display text-base font-bold tracking-tight whitespace-nowrap sm:text-lg">
                딸깍 삼국지
              </span>
              <span className="hidden text-xs text-[#cbbca3] md:inline whitespace-nowrap">
                5분만에 천하통일
              </span>
            </button>

            <div className="flex items-center gap-2.5 text-xs sm:gap-3 sm:text-sm">
              <span
                data-testid="hud-turn"
                className="tabular-nums font-display font-bold text-[#f0d58c] whitespace-nowrap"
              >
                제 {state.turn}턴
              </span>
              <span aria-hidden="true" className="text-[#786a56]">
                ·
              </span>
              <span className="tabular-nums font-medium text-[#e4d8c0] whitespace-nowrap">
                {playerInfo.shortName} {counts[state.playerFaction]}/15
              </span>
              <span aria-hidden="true" className="hidden text-[#786a56] sm:inline">
                ·
              </span>

              {/* Action Point (AP) Visual Seal Pips */}
              <div
                className="flex items-center gap-1.5 whitespace-nowrap"
                aria-label={`남은 행동력 ${state.ap}`}
                data-testid="hud-ap"
              >
                <span className="text-[11px] text-[#cbbca3]">행동력</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.max(state.maxAp, state.ap) }).map((_, idx) => {
                    const filled = idx < state.ap;
                    return (
                      <span
                        key={idx}
                        className={`inline-block h-3.5 w-3.5 rounded-[3px] border transition-colors ${
                          filled
                            ? 'border-[#f7e09e] bg-[#d4a017]'
                            : 'border-[#6b5e4c] bg-transparent'
                        }`}
                        aria-hidden="true"
                      />
                    );
                  })}
                </div>
                <span className="tabular-nums font-bold text-[#faf3e3]">{state.ap}</span>
              </div>
            </div>
          </div>

          {/* Right: Hall of Fame + Compact Utility Icon Buttons */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                sound.playSelect();
                setShowHallOfFame(true);
              }}
              aria-label="명예의 전당 보기"
              title="명예의 전당"
              data-testid="hud-hall-of-fame"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[#7c6536] bg-[#3b3022] px-2.5 text-xs font-bold text-[#f3dca2] transition-colors hover:bg-[#4d3f2c] whitespace-nowrap"
            >
              <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">명예의 전당</span>
            </button>
            <button
              type="button"
              onClick={() => setShowRules(true)}
              aria-label="병법서 보기"
              title="병법서"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#4a3f32] bg-[#312921] text-[#e8dcc4] transition-colors hover:bg-[#3f352b]"
            >
              <BookOpen className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? '효과음 켜기' : '효과음 음소거'}
              aria-pressed={muted}
              title={muted ? '음소거 해제 (M)' : '음소거 (M)'}
              data-testid="btn-mute"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#4a3f32] bg-[#312921] text-[#e8dcc4] transition-colors hover:bg-[#3f352b]"
            >
              {muted ? <VolumeX className="h-4 w-4 text-[#e07a6f]" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleRestartSameFaction}
              aria-label="게임 다시 시작"
              title="다시 시작"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#4a3f32] bg-[#312921] text-[#e8dcc4] transition-colors hover:bg-[#3f352b]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Independent Faction Legend Bar — Strictly OUTSIDE & ABOVE the SVG map */}
      <LegendBar
        counts={counts}
        luoyang={state.cities.luoyang}
        lubuSpawned={state.lubuSpawned}
        playerFaction={state.playerFaction}
      />

      {/* Main Playfield */}
      <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 items-start gap-4 px-3 py-3 pb-8 sm:px-5 lg:grid-cols-[minmax(0,1fr)_336px] lg:gap-5 lg:py-4">
        <div className="w-full pb-2 sm:pb-3 lg:pb-0">
          <StrategyMap
            cities={state.cities}
            playerFaction={state.playerFaction}
            selectedCityId={state.selectedCityId}
            commandMode={state.commandMode}
            marchRatio={state.marchRatio}
            marchArrows={marchArrows}
            cityBursts={cityBursts}
            shakeMap={shakeMap}
            onSelectCity={handleSelectCity}
          />
        </div>

        <CommandPanel
          selectedCity={selectedCity}
          cities={state.cities}
          playerFaction={state.playerFaction}
          ap={state.ap}
          commandMode={state.commandMode}
          marchRatio={state.marchRatio}
          fireUsedThisTurn={state.fireUsedThisTurn}
          fireEnhancedThisTurn={state.fireEnhancedThisTurn}
          isAiTurn={state.isAiTurn}
          activeAiFaction={state.activeAiFaction}
          chronicle={state.chronicle}
          onRecruit={handleRecruit}
          onToggleMarchMode={handleToggleMarchMode}
          onToggleFireMode={handleToggleFireMode}
          onChangeMarchRatio={handleChangeMarchRatio}
          onCancelMode={handleCancelMode}
          onEndTurn={() => void handleEndTurn()}
        />
      </main>

      {/* Event Modal (3-Turn Events & Lu Bu Appearance Warning) */}
      {state.pendingEvent && (
        <EventModal
          event={state.pendingEvent}
          onClose={() => setState((prev) => ({ ...prev, pendingEvent: null }))}
        />
      )}

      {/* Victory / Defeat Settlement Modal */}
      {(state.phase === 'victory' || state.phase === 'defeat') && (
        <SettlementModal
          outcome={state.phase}
          turn={state.turn}
          playerFaction={state.playerFaction}
          totalTroops={playerTotalTroops}
          lubuSpawned={state.lubuSpawned}
          lubuDefeated={state.lubuDefeated}
          stats={state.stats}
          hasRegisteredHof={hasRegisteredHof}
          onRegisteredHof={() => setHasRegisteredHof(true)}
          onOpenHallOfFame={() => setShowHallOfFame(true)}
          onRestart={handleRestartSameFaction}
          onReturnLobby={handleReturnLobby}
        />
      )}

      {/* Hall of Fame Modal */}
      {showHallOfFame && <HallOfFameModal onClose={() => setShowHallOfFame(false)} />}

      {/* Rules Reference Modal */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
