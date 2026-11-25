import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, RotateCcw, Trophy, Volume2, VolumeX } from 'lucide-react';
import { BattleCutIn, type BattleCutInData } from './components/BattleCutIn';
import { CommandPanel } from './components/CommandPanel';
import {
  EndTurnConfirmModal,
  EventModal,
  RulesModal,
  SettlementModal,
} from './components/GameModals';
import { HallOfFameModal } from './components/HallOfFameModal';
import { LegendBar } from './components/LegendBar';
import { LobbyScreen } from './components/LobbyScreen';
import { LordStatusBar } from './components/LordStatusBar';
import { SplashScreen } from './components/SplashScreen';
import { StrategyMap } from './components/StrategyMap';
import { BASE_MAX_FIRE_USES, FACTIONS, MAX_AP, PLAYABLE_FACTIONS } from './game/data';
import {
  applyEndOfRoundGrowth,
  canUseFireAttack,
  checkLuBuAppearance,
  checkOutcome,
  countTerritories,
  countTotalTroops,
  createInitialGameState,
  executeFireAttack,
  executeMarchOrTransport,
  executeRecruit,
  formatEliminationRewardMessage,
  getFireApCost,
  getFireLossRate,
  getOwnedCities,
  hasDefeatedLuBu,
  isMajorEliminationReward,
  planAiAction,
  reserveVictoryBonusAp,
  resolveNextPlayerTurnAp,
  triggerThreeTurnEvent,
} from './game/engine';
import {
  pickLordLine,
  type LordReactionTrigger,
  type PortraitEmotion,
} from './game/portraits';
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
import type { HallOfFameEntry } from './lib/supabase';

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
  const [showEndTurnConfirm, setShowEndTurnConfirm] = useState(false);
  const [hasRegisteredHof, setHasRegisteredHof] = useState(false);
  const [recentHofEntry, setRecentHofEntry] = useState<HallOfFameEntry | null>(null);
  const [marchArrows, setMarchArrows] = useState<MarchArrowEffect[]>([]);
  const [cityBursts, setCityBursts] = useState<CityBurstEffect[]>([]);
  const [shakeMap, setShakeMap] = useState(false);
  const [lordEmotion, setLordEmotion] = useState<PortraitEmotion>('idle');
  const [lordLine, setLordLine] = useState<string>(() => pickLordLine(state.playerFaction, 'idle', 0));
  const [lubuEmotion, setLubuEmotion] = useState<PortraitEmotion>('idle');
  const [battleCutIn, setBattleCutIn] = useState<BattleCutInData | null>(null);

  const aiAbortRef = useRef<number>(0);
  const lordTimerRef = useRef<number | null>(null);
  const lubuTimerRef = useRef<number | null>(null);
  const cutInTimerRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    return () => {
      if (lordTimerRef.current !== null) window.clearTimeout(lordTimerRef.current);
      if (lubuTimerRef.current !== null) window.clearTimeout(lubuTimerRef.current);
      if (cutInTimerRef.current !== null) window.clearTimeout(cutInTimerRef.current);
    };
  }, []);

  const dismissBattleCutIn = useCallback(() => {
    if (cutInTimerRef.current !== null) {
      window.clearTimeout(cutInTimerRef.current);
      cutInTimerRef.current = null;
    }
    setBattleCutIn(null);
  }, []);

  const showBattleCutIn = useCallback(
    (payload: Omit<BattleCutInData, 'id'>, duration = 1200) => {
      if (cutInTimerRef.current !== null) {
        window.clearTimeout(cutInTimerRef.current);
        cutInTimerRef.current = null;
      }
      const next: BattleCutInData = { ...payload, id: uid('cutin') };
      setBattleCutIn(next);
      cutInTimerRef.current = window.setTimeout(() => {
        cutInTimerRef.current = null;
        setBattleCutIn((current) => (current?.id === next.id ? null : current));
      }, duration);
    },
    []
  );

  const resetLordStatus = useCallback(
    (faction: PlayableFactionId) => {
      if (lordTimerRef.current !== null) {
        window.clearTimeout(lordTimerRef.current);
        lordTimerRef.current = null;
      }
      if (lubuTimerRef.current !== null) {
        window.clearTimeout(lubuTimerRef.current);
        lubuTimerRef.current = null;
      }
      dismissBattleCutIn();
      setLordEmotion('idle');
      setLubuEmotion('idle');
      setLordLine(pickLordLine(faction, 'idle', 0));
    },
    [dismissBattleCutIn]
  );

  const triggerLordReaction = useCallback(
    (
      emotion: PortraitEmotion,
      trigger: LordReactionTrigger,
      duration = 1500,
      overrideLine?: string
    ) => {
      if (lordTimerRef.current !== null) {
        window.clearTimeout(lordTimerRef.current);
        lordTimerRef.current = null;
      }
      const faction = stateRef.current.playerFaction;
      setLordEmotion(emotion);
      setLordLine(overrideLine ?? pickLordLine(faction, trigger));

      if (emotion !== 'idle') {
        lordTimerRef.current = window.setTimeout(() => {
          lordTimerRef.current = null;
          setLordEmotion('idle');
          setLordLine(pickLordLine(stateRef.current.playerFaction, 'idle'));
        }, duration);
      }
    },
    []
  );

  const triggerLubuReaction = useCallback((emotion: PortraitEmotion, duration = 1600) => {
    if (lubuTimerRef.current !== null) {
      window.clearTimeout(lubuTimerRef.current);
      lubuTimerRef.current = null;
    }
    setLubuEmotion(emotion);
    if (emotion !== 'idle') {
      lubuTimerRef.current = window.setTimeout(() => {
        lubuTimerRef.current = null;
        setLubuEmotion('idle');
      }, duration);
    }
  }, []);

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
      if (!next) {
        sound.playClick();
      }
      return next;
    });
  }, []);

  const handleProceedFromSplash = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'lobby' }));
  }, []);

  const handleBackToSplash = useCallback(() => {
    aiAbortRef.current += 1;
    sound.playClick();
    setShowHallOfFame(false);
    setShowRules(false);
    setShowEndTurnConfirm(false);
    resetLordStatus(stateRef.current.playerFaction);
    setState((prev) => createInitialGameState(prev.playerFaction, 'splash'));
  }, [resetLordStatus]);

  const handleSelectLobbyFaction = useCallback(
    (faction: PlayableFactionId) => {
      sound.playClick();
      resetLordStatus(faction);
      setState((prev) => createInitialGameState(faction, prev.phase));
    },
    [resetLordStatus]
  );

  const handleStartGame = useCallback(() => {
    aiAbortRef.current += 1;
    sound.playClick();
    sound.playDrum(0.03);
    setMarchArrows([]);
    setCityBursts([]);
    setShowRules(false);
    setShowHallOfFame(false);
    setShowEndTurnConfirm(false);
    setHasRegisteredHof(false);
    setRecentHofEntry(null);
    resetLordStatus(stateRef.current.playerFaction);
    setState((prev) => createInitialGameState(prev.playerFaction, 'playing'));
  }, [resetLordStatus]);

  const handleRestartSameFaction = useCallback(() => {
    aiAbortRef.current += 1;
    sound.playClick();
    sound.playDrum(0.03);
    setMarchArrows([]);
    setCityBursts([]);
    setShowRules(false);
    setShowHallOfFame(false);
    setShowEndTurnConfirm(false);
    setHasRegisteredHof(false);
    setRecentHofEntry(null);
    resetLordStatus(stateRef.current.playerFaction);
    setState((prev) => createInitialGameState(prev.playerFaction, 'playing'));
  }, [resetLordStatus]);

  const handleReturnLobby = useCallback(() => {
    aiAbortRef.current += 1;
    sound.playClick();
    setMarchArrows([]);
    setCityBursts([]);
    setShowRules(false);
    setShowHallOfFame(false);
    setShowEndTurnConfirm(false);
    setHasRegisteredHof(false);
    setRecentHofEntry(null);
    resetLordStatus(stateRef.current.playerFaction);
    setState((prev) => createInitialGameState(prev.playerFaction, 'lobby'));
  }, [resetLordStatus]);

  const handleRecruit = useCallback(() => {
    const cur = stateRef.current;
    if (cur.phase !== 'playing' || cur.isAiTurn || cur.ap <= 0 || !cur.selectedCityId) return;
    const city = cur.cities[cur.selectedCityId];
    if (!city || city.owner !== cur.playerFaction) return;

    const { cities: nextCities, gained } = executeRecruit(cur.cities, city.id);
    sound.playClick();
    sound.playDrum(0.028);
    spawnBurst(city.id, 'recruit', `+${gained}`, FACTIONS[cur.playerFaction].color);
    triggerLordReaction('victory', 'recruit', 1500);

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
  }, [spawnBurst, triggerLordReaction]);

  const handleToggleMarchMode = useCallback(() => {
    sound.playClick();
    setState((prev) => ({
      ...prev,
      commandMode: prev.commandMode === 'march' ? 'idle' : 'march',
    }));
  }, []);

  const handleToggleFireMode = useCallback(() => {
    sound.playClick();
    setState((prev) => ({
      ...prev,
      commandMode: prev.commandMode === 'fire' ? 'idle' : 'fire',
    }));
  }, []);

  const handleChangeMarchRatio = useCallback((ratio: MarchRatio) => {
    sound.playClick();
    setState((prev) => ({ ...prev, marchRatio: ratio }));
  }, []);

  const handleCancelMode = useCallback(() => {
    sound.playClick();
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
          sound.playClick();
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
        const eliminatedMajorFaction =
          battle.attackerWon &&
          isMajorEliminationReward(
            cur.playerFaction,
            battle.defenderFaction,
            cur.playerFaction,
            res.cities
          );
        const eliminationRewardText = eliminatedMajorFaction
          ? formatEliminationRewardMessage(battle.defenderFaction)
          : null;

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
        if (eliminationRewardText) {
          extraLogs.unshift({
            id: uid('elim-reward'),
            turn: cur.turn,
            text: eliminationRewardText,
            faction: battle.defenderFaction,
            highlight: battle.defenderFaction === 'lubu' ? 'lubu' : 'event',
          });
        } else if (!cur.lubuDefeated && defeatedLuBuNow) {
          extraLogs.unshift({
            id: uid('lubu-defeated'),
            turn: cur.turn,
            text: '천하무쌍 여포군을 완전히 토벌했습니다! (+1,500점 보너스 확보)',
            faction: 'lubu',
            highlight: 'lubu',
          });
        }

        if (battle.attackerWon) {
          triggerLordReaction(
            'victory',
            !cur.lubuDefeated && defeatedLuBuNow ? 'lubu_defeated' : 'attack_win',
            eliminationRewardText ? 2600 : 1500,
            eliminationRewardText ?? undefined
          );
          showBattleCutIn({
            kind: 'capture',
            cityName: target.name,
            attackerFaction: battle.attackerFaction,
            defenderFaction: battle.defenderFaction,
            attackerEmotion: 'victory',
            defenderEmotion: 'defeat',
            headline: `⚔️ ${target.name} 점령!`,
            subline: `${FACTIONS[battle.attackerFaction].ruler} 승 · 잔여 ${battle.remainingTroops}명`,
          });
        } else {
          triggerLordReaction('defeat', 'attack_lose', 1500);
          showBattleCutIn({
            kind: 'defend',
            cityName: target.name,
            attackerFaction: battle.attackerFaction,
            defenderFaction: battle.defenderFaction,
            attackerEmotion: 'defeat',
            defenderEmotion: 'victory',
            headline: `🛡️ ${target.name} 수성 성공!`,
            subline: `${FACTIONS[battle.defenderFaction].ruler} 방어 · 잔여 ${battle.remainingTroops}명`,
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
          nextTurnBonusAp: reserveVictoryBonusAp(prev.nextTurnBonusAp, eliminatedMajorFaction),
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

      // Execute Fire Attack if in fire mode & clicking adjacent enemy (Wu 1st fire costs 0 AP!)
      if (
        cur.commandMode === 'fire' &&
        selected &&
        selected.owner === cur.playerFaction &&
        selected.adjacent.includes(targetId) &&
        target.owner !== cur.playerFaction &&
        canUseFireAttack(
          cur.playerFaction,
          cur.ap,
          cur.fireUsesThisTurn,
          cur.maxFireUsesThisTurn
        )
      ) {
        const fireCost = getFireApCost(cur.playerFaction, cur.fireUsesThisTurn);
        const res = executeFireAttack(
          cur.cities,
          selected.id,
          targetId,
          cur.fireBonusRateThisTurn
        );
        if (!res) return;

        const lossPct = Math.round(res.lossRate * 100);
        const costTag = fireCost === 0 ? '무료 0 AP' : '1 AP';
        sound.playFire();
        triggerShake();
        spawnBurst(targetId, 'fire', `화공 -${res.troopsLost}`, '#d9480f', 1200);
        triggerLordReaction('fire', 'fire', 1600);
        showBattleCutIn({
          kind: 'fire',
          cityName: target.name,
          attackerFaction: cur.playerFaction,
          defenderFaction: target.owner,
          attackerEmotion: 'fire',
          defenderEmotion: 'defeat',
          headline: `🔥 ${target.name} 화공 적중!`,
          subline: `적 병력 -${res.troopsLost}명 소멸 (-${lossPct}% · ${costTag})`,
        });

        const logEntry: ChronicleEntry = {
          id: uid('log'),
          turn: cur.turn,
          text: `${selected.name}에서 ${target.name}에 화공(${costTag}, -${lossPct}%)을 펼쳐 적 병력 ${res.troopsLost}명을 소멸시켰습니다!`,
          faction: cur.playerFaction,
          highlight: 'battle',
        };

        setState((prev) => ({
          ...prev,
          cities: res.cities,
          ap: prev.ap - fireCost,
          fireUsesThisTurn: prev.fireUsesThisTurn + 1,
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
      sound.playClick();
      setState((prev) => ({
        ...prev,
        selectedCityId: targetId,
        commandMode: 'idle',
      }));
    },
    [showBattleCutIn, spawnArrow, spawnBurst, triggerLordReaction, triggerShake]
  );

  const handleEndTurn = useCallback(async () => {
    const startSnap = stateRef.current;
    if (startSnap.phase !== 'playing' || startSnap.isAiTurn || startSnap.pendingEvent) return;

    // Signature '딸-깍' on every confirmed turn transition
    sound.playDdalkkak();

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
            if (aiFaction === 'lubu') {
              triggerLubuReaction('attack', 1200);
            }
            if (res.battle.defenderFaction === playerFaction) {
              triggerShake();
              if (res.battle.attackerWon) {
                triggerLordReaction('defeat', 'defend_lose', 1500);
                showBattleCutIn({
                  kind: 'capture',
                  cityName: toName,
                  attackerFaction: aiFaction,
                  defenderFaction: playerFaction,
                  attackerEmotion: 'victory',
                  defenderEmotion: 'defeat',
                  headline: `⚔️ ${toName} 점령!`,
                  subline: `${FACTIONS[aiFaction].ruler} 침공 · 잔여 ${res.battle.remainingTroops}명`,
                });
              } else {
                triggerLordReaction('defend', 'defend_win', 1500);
                showBattleCutIn({
                  kind: 'defend',
                  cityName: toName,
                  attackerFaction: aiFaction,
                  defenderFaction: playerFaction,
                  attackerEmotion: 'defeat',
                  defenderEmotion: 'victory',
                  headline: `🛡️ ${toName} 수성 성공!`,
                  subline: `${FACTIONS[playerFaction].ruler} 방어 · 잔여 ${res.battle.remainingTroops}명`,
                });
              }
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
    let nextMaxFireUses = BASE_MAX_FIRE_USES;
    let nextFireBonusRate = 0;
    let eventBonusAp = 0;
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
      triggerLubuReaction('appear', 1800);
      triggerLordReaction('defend', 'lubu_spawn', 1800);

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
      nextMaxFireUses = ev.maxFireUsesThisTurn;
      nextFireBonusRate = ev.fireBonusRateThisTurn;
      eventBonusAp = ev.bonusAp;

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

    const apRoll = resolveNextPlayerTurnAp(
      startSnap.maxAp,
      startSnap.nextTurnBonusAp,
      eventBonusAp
    );

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
      ap: apRoll.ap,
      turnMaxAp: apRoll.turnMaxAp,
      nextTurnBonusAp: apRoll.nextTurnBonusAp,
      victoryApBonusActive: apRoll.victoryApBonusActive,
      fireUsesThisTurn: 0,
      maxFireUsesThisTurn: nextMaxFireUses,
      fireBonusRateThisTurn: nextFireBonusRate,
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
  }, [showBattleCutIn, spawnArrow, spawnBurst, triggerLordReaction, triggerLubuReaction, triggerShake]);

  const handleRequestEndTurn = useCallback(() => {
    const cur = stateRef.current;
    if (cur.phase !== 'playing' || cur.isAiTurn || cur.pendingEvent) return;
    if (cur.ap > 0) {
      sound.playClick();
      setShowEndTurnConfirm(true);
      return;
    }
    void handleEndTurn();
  }, [handleEndTurn]);

  const handleConfirmEndTurn = useCallback(() => {
    setShowEndTurnConfirm(false);
    void handleEndTurn();
  }, [handleEndTurn]);

  // Global keyboard shortcuts during gameplay & modals
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const cur = stateRef.current;

      if (e.key === 'Escape') {
        if (showEndTurnConfirm) {
          setShowEndTurnConfirm(false);
          return;
        }
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
        !showHallOfFame &&
        !showEndTurnConfirm
      ) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'BUTTON' || tag === 'INPUT') return;
        e.preventDefault();
        handleRequestEndTurn();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRequestEndTurn, showEndTurnConfirm, showHallOfFame, showRules, toggleMute]);

  const counts = useMemo(() => countTerritories(state.cities), [state.cities]);
  const playerTotalTroops = useMemo(
    () => countTotalTroops(state.cities, state.playerFaction),
    [state.cities, state.playerFaction]
  );
  const remainingFireUses = Math.max(0, state.maxFireUsesThisTurn - state.fireUsesThisTurn);
  const fireLossPct = Math.round(
    getFireLossRate(state.playerFaction, state.fireBonusRateThisTurn) * 100
  );
  const freeFireReady =
    remainingFireUses > 0 && getFireApCost(state.playerFaction, state.fireUsesThisTurn) === 0;
  const southeastWindActive = state.maxFireUsesThisTurn > BASE_MAX_FIRE_USES;

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
            sound.playClick();
            setShowHallOfFame(true);
          }}
        />
        {showHallOfFame && (
          <HallOfFameModal
            recentEntry={recentHofEntry}
            onClose={() => setShowHallOfFame(false)}
          />
        )}
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

              {/* Action Point (AP) Visual Seal Pips (gold-rimmed when victory +1 AP bonus is active) */}
              <div
                className={`flex items-center gap-1.5 whitespace-nowrap ${
                  state.victoryApBonusActive
                    ? 'rounded-md border border-[#e3b94f] bg-[#3f3116] px-2 py-0.5 shadow-[0_0_8px_rgba(227,185,79,0.28)]'
                    : ''
                }`}
                aria-label={`남은 행동력 ${state.ap}/${state.turnMaxAp}${state.victoryApBonusActive ? ' (승전 +1)' : ''}`}
                data-testid="hud-ap"
                data-victory-bonus={state.victoryApBonusActive ? 'true' : 'false'}
              >
                <span
                  className={`text-[11px] ${
                    state.victoryApBonusActive ? 'font-bold text-[#f7dc88]' : 'text-[#cbbca3]'
                  }`}
                >
                  행동력
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.max(state.turnMaxAp, state.ap) }).map((_, idx) => {
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
                <span
                  className={`tabular-nums font-bold ${
                    state.victoryApBonusActive ? 'text-[#fde68a]' : 'text-[#faf3e3]'
                  }`}
                >
                  {state.ap}/{state.turnMaxAp}
                </span>
                {state.victoryApBonusActive && (
                  <span className="text-[11px] font-bold text-[#f7dc88] whitespace-nowrap">
                    · 승전 +1
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Hall of Fame + Compact Utility Icon Buttons */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
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
              onClick={() => {
                sound.playClick();
                setShowRules(true);
              }}
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

      {/* Slim Lord Portrait & Speech Bubble Bar (+ Active Lu Bu Alert Badge) — Outside SVG map */}
      <LordStatusBar
        playerFaction={state.playerFaction}
        lordEmotion={lordEmotion}
        lordLine={lordLine}
        lubuAlive={state.lubuSpawned && counts.lubu > 0}
        lubuCityCount={counts.lubu}
        lubuEmotion={lubuEmotion}
        freeFireReady={freeFireReady}
        southeastWindActive={southeastWindActive}
        remainingFireUses={remainingFireUses}
        fireLossPct={fireLossPct}
      />

      {/* Main Playfield */}
      <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 items-start gap-4 px-3 py-3 pb-8 sm:px-5 lg:grid-cols-[minmax(0,1fr)_336px] lg:gap-5 lg:py-4">
        <div className="relative w-full pb-2 sm:pb-3 lg:pb-0">
          {battleCutIn && (
            <BattleCutIn
              key={battleCutIn.id}
              cutIn={battleCutIn}
              onDismiss={dismissBattleCutIn}
            />
          )}
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
          fireUsesThisTurn={state.fireUsesThisTurn}
          maxFireUsesThisTurn={state.maxFireUsesThisTurn}
          fireBonusRateThisTurn={state.fireBonusRateThisTurn}
          isAiTurn={state.isAiTurn}
          activeAiFaction={state.activeAiFaction}
          chronicle={state.chronicle}
          onRecruit={handleRecruit}
          onToggleMarchMode={handleToggleMarchMode}
          onToggleFireMode={handleToggleFireMode}
          onChangeMarchRatio={handleChangeMarchRatio}
          onCancelMode={handleCancelMode}
          onEndTurn={handleRequestEndTurn}
        />
      </main>

      {/* Remaining AP End-Turn Confirmation Modal */}
      {showEndTurnConfirm && (
        <EndTurnConfirmModal
          remainingAp={state.ap}
          onCancel={() => {
            sound.playClick();
            setShowEndTurnConfirm(false);
          }}
          onConfirm={handleConfirmEndTurn}
        />
      )}

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
          onRegisteredHof={(entry) => {
            setHasRegisteredHof(true);
            setRecentHofEntry(entry);
          }}
          onOpenHallOfFame={() => setShowHallOfFame(true)}
          onRestart={handleRestartSameFaction}
          onReturnLobby={handleReturnLobby}
        />
      )}

      {/* Hall of Fame Modal */}
      {showHallOfFame && (
        <HallOfFameModal
          recentEntry={recentHofEntry}
          onClose={() => setShowHallOfFame(false)}
        />
      )}

      {/* Rules Reference Modal */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
