import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHallOfFameRow, normalizeSupabaseUrl } from './supabase';

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

test('normalizeHallOfFameRow maps rank_grade, rank, and grade columns cleanly', () => {
  const fromRankGrade = normalizeHallOfFameRow({
    id: '1',
    nickname: '제갈공명',
    faction: 'shu',
    rank_grade: 'S',
    turns: 16,
    lubu_defeated: true,
    score: 10225,
    created_at: '2026-01-01T00:00:00Z',
  });
  assert.equal(fromRankGrade.rank, 'S');
  assert.equal(fromRankGrade.nickname, '제갈공명');
  assert.equal(fromRankGrade.lubu_defeated, true);

  const fromLegacyRank = normalizeHallOfFameRow({
    id: '2',
    nickname: '조맹덕',
    faction: 'wei',
    rank: 'A',
    turns: 22,
    lubu_defeated: false,
    score: 6800,
  });
  assert.equal(fromLegacyRank.rank, 'A');
});
