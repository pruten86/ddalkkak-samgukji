import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSupabaseUrl } from './supabase';

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
