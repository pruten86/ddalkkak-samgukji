import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHARE_URL,
  canSharePngFile,
  formatShareText,
  getCertificateFilename,
  isInAppBrowser,
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

test('isInAppBrowser detects KakaoTalk and major in-app WebViews while returning false for standard browsers', () => {
  // KakaoTalk Android & iOS
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 KAKAOTALK 10.9.5'
    ),
    true
  );
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.9.5'
    ),
    true
  );

  // Other major in-app browsers
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 1000; 12.6.0)'
    ),
    true
  );
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 336.0.0'
    ),
    true
  );
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 Line/14.9.0'
    ),
    true
  );
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/465.0.0.0]'
    ),
    true
  );

  // Standard browsers (PC Chrome, Mobile Chrome, Safari, Edge, Samsung Internet) must return false
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    ),
    false
  );
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
    ),
    false
  );
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
    ),
    false
  );
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36'
    ),
    false
  );
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
    ),
    false
  );
  assert.equal(isInAppBrowser(''), false);
});

test('canSharePngFile safely returns false when file is null or Web Share API is unavailable', () => {
  assert.equal(canSharePngFile(null), false);
});
