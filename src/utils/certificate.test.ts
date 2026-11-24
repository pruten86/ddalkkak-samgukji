import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHARE_URL,
  formatShareText,
  getCertificateFilename,
  resolveDisplayNickname,
  type CertificateData,
} from './certificate';

const SAMPLE_CERT: CertificateData = {
  nickname: '제갈공명',
  factionId: 'shu',
  rank: 'S',
  rankTitle: '천하무적 패왕',
  turns: 16,
  totalScore: 10200,
  baseScore: 7600,
  lubuBonus: 1500,
  troopBonus: 1100,
  battlesWon: 18,
  battlesFought: 20,
  totalTroops: 1100,
  lubuSpawned: true,
  lubuDefeated: true,
};

test('resolveDisplayNickname defaults empty or whitespace nickname to 무명 영웅', () => {
  assert.equal(resolveDisplayNickname(''), '무명 영웅');
  assert.equal(resolveDisplayNickname('   '), '무명 영웅');
  assert.equal(resolveDisplayNickname(' 조조 '), '조조');
});

test('getCertificateFilename sanitizes nickname and produces expected png filename', () => {
  assert.equal(getCertificateFilename('제갈공명'), '딸깍삼국지_결산_제갈공명.png');
  assert.equal(getCertificateFilename(''), '딸깍삼국지_결산_무명_영웅.png');
  assert.equal(getCertificateFilename('관우/장비:유비'), '딸깍삼국지_결산_관우장비유비.png');
});

test('formatShareText includes title, nickname, faction, rank, score, Lu Bu status, and vercel URL', () => {
  const text = formatShareText(SAMPLE_CERT);
  assert.ok(text.includes('딸깍 삼국지 — 5분만에 천하통일'));
  assert.ok(text.includes('제갈공명'));
  assert.ok(text.includes('촉 · 유비'));
  assert.ok(text.includes('S (천하무적 패왕)'));
  assert.ok(text.includes('10,200점'));
  assert.ok(text.includes('16턴'));
  assert.ok(text.includes('토벌 완료 (+1,500점)'));
  assert.ok(text.includes(SHARE_URL));

  const anonText = formatShareText({
    ...SAMPLE_CERT,
    nickname: '   ',
    lubuSpawned: false,
    lubuDefeated: false,
  });
  assert.ok(anonText.includes('무명 영웅'));
  assert.ok(anonText.includes('여포 토벌: 미출현'));
});
