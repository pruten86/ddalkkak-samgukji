import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PlayableFactionId, VictoryRank } from '../game/types';

export interface HallOfFameEntry {
  id: string;
  nickname: string;
  faction: PlayableFactionId;
  rank: VictoryRank;
  turns: number;
  lubu_defeated: boolean;
  score: number;
  created_at?: string | null;
}

export interface NewHallOfFameRecord {
  nickname: string;
  faction: PlayableFactionId;
  rank: VictoryRank;
  turns: number;
  lubu_defeated: boolean;
  score: number;
}

const LOCAL_STORAGE_KEY = 'ttalkkak_samgukji_hall_of_fame_v1';
const MAX_HALL_OF_FAME_ROWS = 50;

const VALID_VICTORY_RANKS = new Set<VictoryRank>(['SS', 'S', 'A', 'B', 'C', 'D', 'E']);

/**
 * Formats an ISO / UTC timestamp into Korea Standard Time (Asia/Seoul) date only:
 * `YYYY.MM.DD` (2-digit zero padding for month and day).
 * Safely returns `""` for null, empty, or invalid timestamps.
 */
export function formatHallOfFameDateTime(isoString?: string | null): string {
  if (typeof isoString !== 'string') return '';
  const trimmed = isoString.trim();
  if (!trimmed) return '';

  // Normalize PostgreSQL timestamps (e.g., "2026-11-24 14:22:00+00") for full ISO-8601 compatibility
  let normalizedInput = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(trimmed)
    ? trimmed.replace(' ', 'T')
    : trimmed;
  normalizedInput = normalizedInput.replace(/([+-]\d{2})$/, '$1:00');

  const date = new Date(normalizedInput);
  if (Number.isNaN(date.getTime())) return '';

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? '';

    const year = getPart('year');
    const month = getPart('month').padStart(2, '0');
    const day = getPart('day').padStart(2, '0');

    if (!year || !month || !day) return '';
    return `${year}.${month}.${day}`;
  } catch {
    // Fallback fixed UTC+9 calculation (Asia/Seoul has no DST)
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const year = kst.getUTCFullYear();
    const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
    const day = String(kst.getUTCDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }
}

export function normalizeSupabaseUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim().replace(/^['"]+|['"]+$/g, '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return '';
    }
    if (!parsed.hostname) {
      return '';
    }
    return parsed.origin;
  } catch {
    return '';
  }
}

function createSafeSupabaseClient(): SupabaseClient | null {
  try {
    const env = (import.meta as { env?: Record<string, unknown> }).env;
    const supabaseUrl = normalizeSupabaseUrl(env?.VITE_SUPABASE_URL);
    const rawKey = env?.VITE_SUPABASE_ANON_KEY;
    const supabaseAnonKey =
      typeof rawKey === 'string' ? rawKey.trim().replace(/^['"]+|['"]+$/g, '').trim() : '';

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      supabaseUrl.includes('your-project.supabase.co') ||
      supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY'
    ) {
      return null;
    }

    return createClient(supabaseUrl, supabaseAnonKey);
  } catch {
    return null;
  }
}

export const supabase: SupabaseClient | null = createSafeSupabaseClient();
export const isSupabaseConfigured = Boolean(supabase);

function getSortableTimestamp(iso?: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

export function sortHallOfFameEntries(entries: HallOfFameEntry[]): HallOfFameEntry[] {
  return [...entries]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.turns !== b.turns) return a.turns - b.turns;
      return getSortableTimestamp(a.created_at) - getSortableTimestamp(b.created_at);
    })
    .slice(0, MAX_HALL_OF_FAME_ROWS);
}

function readLocalEntries(): HallOfFameEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HallOfFameEntry[];
  } catch {
    return [];
  }
}

function writeLocalEntries(entries: HallOfFameEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function normalizeHallOfFameRow(raw: Record<string, unknown>): HallOfFameEntry {
  const rawRankCandidate = String(raw.rank_grade ?? raw.rank ?? raw.grade ?? 'C')
    .trim()
    .toUpperCase() as VictoryRank;
  const rankVal: VictoryRank = VALID_VICTORY_RANKS.has(rawRankCandidate) ? rawRankCandidate : 'C';
  const createdAt =
    typeof raw.created_at === 'string' && raw.created_at.trim().length > 0
      ? raw.created_at.trim()
      : null;

  return {
    id: String(raw.id ?? ''),
    nickname: String(raw.nickname ?? ''),
    faction: (raw.faction as PlayableFactionId) ?? 'shu',
    rank: rankVal,
    turns: Number(raw.turns ?? 0),
    lubu_defeated: Boolean(raw.lubu_defeated),
    score: Number(raw.score ?? 0),
    created_at: createdAt,
  };
}

const HALL_OF_FAME_SELECT_WITH_RANK_GRADE =
  'id, nickname, faction, rank_grade, turns, lubu_defeated, score, created_at';

export async function fetchHallOfFame(
  factionFilter: 'all' | PlayableFactionId = 'all'
): Promise<{ entries: HallOfFameEntry[]; source: 'supabase' | 'local'; error?: string }> {
  if (supabase) {
    try {
      const buildQuery = (columns: string) => {
        let q = supabase
          .from('hall_of_fame')
          .select(columns)
          .order('score', { ascending: false })
          .order('turns', { ascending: true })
          .order('created_at', { ascending: true })
          .limit(MAX_HALL_OF_FAME_ROWS);
        if (factionFilter !== 'all') {
          q = q.eq('faction', factionFilter);
        }
        return q;
      };

      let { data, error } = await buildQuery(HALL_OF_FAME_SELECT_WITH_RANK_GRADE);
      if (error && /rank_grade|column/i.test(error.message)) {
        // Fallback for schemas using `rank` or `grade` column names (still includes `created_at`)
        ({ data, error } = await buildQuery('*'));
      }

      if (error) {
        return {
          entries: filterAndSortLocal(factionFilter),
          source: 'local',
          error: error.message,
        };
      }
      const normalized = ((data ?? []) as unknown as Record<string, unknown>[]).map(
        normalizeHallOfFameRow
      );
      return {
        entries: sortHallOfFameEntries(normalized),
        source: 'supabase',
      };
    } catch (err) {
      return {
        entries: filterAndSortLocal(factionFilter),
        source: 'local',
        error: err instanceof Error ? err.message : '랭킹을 불러오지 못했습니다.',
      };
    }
  }

  return {
    entries: filterAndSortLocal(factionFilter),
    source: 'local',
  };
}

function filterAndSortLocal(factionFilter: 'all' | PlayableFactionId): HallOfFameEntry[] {
  const all = readLocalEntries();
  const filtered =
    factionFilter === 'all' ? all : all.filter((item) => item.faction === factionFilter);
  return sortHallOfFameEntries(filtered);
}

export async function submitHallOfFameEntry(
  record: NewHallOfFameRecord
): Promise<{ entry: HallOfFameEntry; source: 'supabase' | 'local' }> {
  const cleanNickname = record.nickname.trim();
  if (cleanNickname.length < 1 || cleanNickname.length > 12) {
    throw new Error('닉네임은 1자 이상 12자 이하로 입력해 주세요.');
  }

  const sanitized: NewHallOfFameRecord = {
    ...record,
    nickname: cleanNickname,
  };

  if (supabase) {
    try {
      const { rank, ...rest } = sanitized;
      const attempts: Array<{ payload: Record<string, unknown>; rankCol: string }> = [
        { payload: { ...rest, rank_grade: rank }, rankCol: 'rank_grade' },
        { payload: { ...rest, rank }, rankCol: 'rank' },
        { payload: { ...rest, grade: rank }, rankCol: 'grade' },
      ];

      for (const { payload, rankCol } of attempts) {
        const selectCols = `id, nickname, faction, ${rankCol}, turns, lubu_defeated, score, created_at`;
        const { data, error } = await supabase
          .from('hall_of_fame')
          .insert([payload])
          .select(selectCols)
          .single();

        if (!error && data) {
          const normalized = normalizeHallOfFameRow(data as unknown as Record<string, unknown>);
          return {
            entry: {
              ...normalized,
              created_at: normalized.created_at ?? new Date().toISOString(),
            },
            source: 'supabase',
          };
        }

        if (!error || !/rank_grade|rank|grade|column/i.test(error.message)) {
          break;
        }
      }
    } catch {
      // Fall back to localStorage preview mode below
    }
  }

  // Fallback / localStorage preview mode
  const localEntry: HallOfFameEntry = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...sanitized,
    created_at: new Date().toISOString(),
  };
  const updated = sortHallOfFameEntries([...readLocalEntries(), localEntry]);
  writeLocalEntries(updated);
  return {
    entry: localEntry,
    source: 'local',
  };
}

export function subscribeHallOfFameInserts(
  onInsert: (entry: HallOfFameEntry) => void
): () => void {
  if (!supabase) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel(`hall_of_fame_inserts_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'hall_of_fame',
        },
        (payload) => {
          if (payload.new) {
            onInsert(normalizeHallOfFameRow(payload.new as Record<string, unknown>));
          }
        }
      )
      .subscribe();

    return () => {
      try {
        void supabase.removeChannel(channel);
      } catch {
        // Ignore cleanup errors
      }
    };
  } catch {
    return () => {};
  }
}
