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
  created_at: string;
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

export function sortHallOfFameEntries(entries: HallOfFameEntry[]): HallOfFameEntry[] {
  return [...entries]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.turns !== b.turns) return a.turns - b.turns;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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

function normalizeRow(raw: Record<string, unknown>): HallOfFameEntry {
  const rankVal = (raw.rank ?? raw.grade ?? 'C') as VictoryRank;
  return {
    id: String(raw.id ?? ''),
    nickname: String(raw.nickname ?? ''),
    faction: (raw.faction as PlayableFactionId) ?? 'shu',
    rank: rankVal,
    turns: Number(raw.turns ?? 0),
    lubu_defeated: Boolean(raw.lubu_defeated),
    score: Number(raw.score ?? 0),
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

export async function fetchHallOfFame(
  factionFilter: 'all' | PlayableFactionId = 'all'
): Promise<{ entries: HallOfFameEntry[]; source: 'supabase' | 'local'; error?: string }> {
  if (supabase) {
    try {
      let query = supabase
        .from('hall_of_fame')
        .select('*')
        .order('score', { ascending: false })
        .order('turns', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(MAX_HALL_OF_FAME_ROWS);

      if (factionFilter !== 'all') {
        query = query.eq('faction', factionFilter);
      }

      const { data, error } = await query;
      if (error) {
        return {
          entries: filterAndSortLocal(factionFilter),
          source: 'local',
          error: error.message,
        };
      }
      const normalized = ((data ?? []) as Record<string, unknown>[]).map(normalizeRow);
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
      const { data, error } = await supabase
        .from('hall_of_fame')
        .insert([sanitized])
        .select('*')
        .single();

      if (!error && data) {
        return {
          entry: normalizeRow(data as Record<string, unknown>),
          source: 'supabase',
        };
      }

      // Retry with `grade` column if the remote schema uses `grade` instead of reserved word `rank`
      if (error && /rank|column/i.test(error.message)) {
        const { rank, ...rest } = sanitized;
        const retry = await supabase
          .from('hall_of_fame')
          .insert([{ ...rest, grade: rank }])
          .select('*')
          .single();
        if (!retry.error && retry.data) {
          return {
            entry: normalizeRow(retry.data as Record<string, unknown>),
            source: 'supabase',
          };
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
            onInsert(normalizeRow(payload.new as Record<string, unknown>));
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
