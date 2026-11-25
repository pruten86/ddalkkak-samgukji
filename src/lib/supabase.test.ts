import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatHallOfFameDateTime,
  normalizeHallOfFameRow,
  normalizeSupabaseUrl,
} from './supabase';

test('normalizeSupabaseUrl handles valid URLs and safely returns empty string for malformed inputs', () => {
  assert.equal(
    normalizeSupabaseUrl('https://yecwhkjjgboyzfllvhru.supabase.co'),
    'https://yecwhkjjgboyzfllvhru.supabase.co'
  );
  assert.equal(
    normalizeSupabaseUrl('https://yecwhkjjgboyzfllvhru.supabase.co/rest/v1/'),
    'https://yecwhkjjgboyzfllvhru.supabase.co'
  );
  assert.equal(
    normalizeSupabaseUrl(' "https://yecwhkjjgboyzfllvhru.supabase.co/" '),
    'https://yecwhkjjgboyzfllvhru.supabase.co'
  );

  // Malformed values must never throw and must return '' for clean localStorage fallback
  assert.equal(normalizeSupabaseUrl(''), '');
  assert.equal(normalizeSupabaseUrl(undefined), '');
  assert.equal(normalizeSupabaseUrl('not-a-valid-url'), '');
  assert.equal(normalizeSupabaseUrl('[https://a.supabase.co](https://a.supabase.co)'), '');
  assert.equal(normalizeSupabaseUrl('ftp://invalid-protocol.example.com'), '');
});

test('normalizeHallOfFameRow maps SS~E rank_grade, rank, and grade columns cleanly and preserves nullable created_at', () => {
  const fromRankGrade = normalizeHallOfFameRow({
    id: '1',
    nickname: '제갈공명',
    faction: 'shu',
    rank_grade: 'SS',
    turns: 14,
    lubu_defeated: true,
    score: 10225,
    created_at: '2026-01-01T00:00:00Z',
  });
  assert.equal(fromRankGrade.rank, 'SS');
  assert.equal(fromRankGrade.nickname, '제갈공명');
  assert.equal(fromRankGrade.lubu_defeated, true);
  assert.equal(fromRankGrade.created_at, '2026-01-01T00:00:00Z');

  const fromLegacyRank = normalizeHallOfFameRow({
    id: '2',
    nickname: '조맹덕',
    faction: 'wei',
    rank: 'E',
    turns: 45,
    lubu_defeated: false,
    score: 3800,
  });
  assert.equal(fromLegacyRank.rank, 'E');
  assert.equal(fromLegacyRank.created_at, null);

  const fromInvalidRank = normalizeHallOfFameRow({
    id: '3',
    nickname: '손중모',
    faction: 'wu',
    grade: 'UNKNOWN',
    turns: 33,
    lubu_defeated: false,
    score: 5200,
  });
  assert.equal(fromInvalidRank.rank, 'C');
});

test('formatHallOfFameDateTime converts UTC timestamps to KST (Asia/Seoul) YYYY.MM.DD including midnight & year rollover', () => {
  // Standard UTC -> KST (+09:00), date only without HH:mm
  assert.equal(formatHallOfFameDateTime('2026-11-24T14:22:00Z'), '2026.11.24');
  // Exact midnight rollover in KST (15:00Z -> next day KST)
  assert.equal(formatHallOfFameDateTime('2026-11-24T15:00:00Z'), '2026.11.25');
  // Just past midnight rollover with fractional seconds
  assert.equal(formatHallOfFameDateTime('2026-11-24T15:05:45.123Z'), '2026.11.25');
  // Year rollover in KST (Dec 31 16:30 UTC -> Jan 1 KST)
  assert.equal(formatHallOfFameDateTime('2026-12-31T16:30:00Z'), '2027.01.01');
  // Zero padding for single-digit month and day
  assert.equal(formatHallOfFameDateTime('2026-03-04T00:05:00Z'), '2026.03.04');
  // PostgreSQL space-separated UTC timestamp format
  assert.equal(formatHallOfFameDateTime('2026-11-24 14:22:00+00'), '2026.11.24');
});

test('formatHallOfFameDateTime safely returns empty string for null, empty, or invalid inputs', () => {
  assert.equal(formatHallOfFameDateTime(null), '');
  assert.equal(formatHallOfFameDateTime(undefined), '');
  assert.equal(formatHallOfFameDateTime(''), '');
  assert.equal(formatHallOfFameDateTime('   '), '');
  assert.equal(formatHallOfFameDateTime('invalid-date-string'), '');
  assert.equal(formatHallOfFameDateTime('2026-99-99T99:99:99Z'), '');
});
