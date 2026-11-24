import { FACTIONS } from '../game/data';
import type { PlayableFactionId, VictoryRank } from '../game/types';

export const SHARE_URL = 'https://dalkak3k.vercel.app';
export const SHARE_WATERMARK = 'dalkak3k.vercel.app';

export interface CertificateData {
  nickname: string;
  factionId: PlayableFactionId;
  rank: VictoryRank;
  rankTitle: string;
  turns: number;
  totalScore: number;
  baseScore: number;
  lubuBonus: number;
  troopBonus: number;
  battlesWon: number;
  battlesFought: number;
  totalTroops: number;
  lubuSpawned: boolean;
  lubuDefeated: boolean;
}

export function resolveDisplayNickname(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : '무명 영웅';
}

export function getCertificateFilename(rawNickname: string): string {
  const display = resolveDisplayNickname(rawNickname);
  const safe = display
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .trim();
  return `딸깍삼국지_결산_${safe || '무명영웅'}.png`;
}

export function formatShareText(data: CertificateData): string {
  const displayName = resolveDisplayNickname(data.nickname);
  const faction = FACTIONS[data.factionId];
  const lubuText = data.lubuDefeated
    ? '토벌 완료 (+1,500점)'
    : data.lubuSpawned
      ? '미토벌'
      : '미출현';

  return [
    '[딸깍 삼국지 — 5분만에 천하통일]',
    `${displayName} 군주 (${faction.shortName} · ${faction.ruler}) 천하통일 달성!`,
    `등급: ${data.rank} (${data.rankTitle}) | 최종 점수: ${data.totalScore.toLocaleString('ko-KR')}점`,
    `소요 턴: ${data.turns}턴 | 전투 승리: ${data.battlesWon}/${data.battlesFought} | 최종 병력: ${data.totalTroops.toLocaleString('ko-KR')}명`,
    `여포 토벌: ${lubuText}`,
    `도전하기: ${SHARE_URL}`,
  ].join('\n');
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function generateCertificateCanvas(data: CertificateData): HTMLCanvasElement {
  const width = 1080;
  const height = 1260;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('캔버스 컨텍스트를 초기화할 수 없습니다.');
  }

  const displayName = resolveDisplayNickname(data.nickname);
  const faction = FACTIONS[data.factionId];
  const serifFont = "'Noto Serif KR', 'Batang', Georgia, serif";
  const sansFont = "'IBM Plex Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

  // 1. Aged Hanji Parchment Background
  const bgGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    80,
    width * 0.5,
    height * 0.5,
    width * 0.85
  );
  bgGrad.addColorStop(0, '#faf3e2');
  bgGrad.addColorStop(0.68, '#efe2c6');
  bgGrad.addColorStop(1, '#ddca9f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle mulberry fiber strokes
  ctx.save();
  ctx.strokeStyle = 'rgba(155, 130, 88, 0.2)';
  ctx.lineWidth = 1.6;
  const fibers = [
    [95, 120, 148, 124],
    [830, 195, 892, 189],
    [130, 560, 185, 566],
    [910, 620, 965, 613],
    [220, 980, 290, 974],
    [760, 1020, 835, 1026],
  ];
  for (const [x1, y1, x2, y2] of fibers) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, y1 - 8, x2, y2);
    ctx.stroke();
  }
  ctx.restore();

  // Soft ink-wash mountain silhouettes along bottom edge
  ctx.save();
  const mGrad = ctx.createLinearGradient(0, height - 270, 0, height - 48);
  mGrad.addColorStop(0, 'rgba(92, 79, 62, 0.16)');
  mGrad.addColorStop(1, 'rgba(92, 79, 62, 0.02)');
  ctx.fillStyle = mGrad;
  ctx.beginPath();
  ctx.moveTo(46, height - 56);
  ctx.quadraticCurveTo(185, height - 240, 320, height - 150);
  ctx.quadraticCurveTo(465, height - 265, 625, height - 145);
  ctx.quadraticCurveTo(790, height - 255, 945, height - 135);
  ctx.lineTo(width - 46, height - 56);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. Antique Scroll Double Frame & Corner Accents
  ctx.strokeStyle = '#99825c';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  ctx.save();
  ctx.strokeStyle = 'rgba(153, 130, 92, 0.65)';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(52, 52, width - 104, height - 104);
  ctx.restore();

  // Corner brass brackets
  ctx.fillStyle = '#8b6f41';
  const corners = [
    [36, 36],
    [width - 52, 36],
    [36, height - 52],
    [width - 52, height - 52],
  ];
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx, cy, 16, 16);
  }

  // 3. Top Header: Cinnabar Seal + Official Title
  const sealX = 96;
  const sealY = 98;
  drawRoundedRect(ctx, sealX, sealY, 84, 84, 10);
  ctx.fillStyle = '#9e2a22';
  ctx.fill();
  ctx.strokeStyle = '#6b1a14';
  ctx.lineWidth = 3;
  ctx.stroke();

  drawRoundedRect(ctx, sealX + 8, sealY + 8, 68, 68, 6);
  ctx.strokeStyle = 'rgba(250, 243, 227, 0.65)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = '#faf3e3';
  ctx.font = `900 46px ${serifFont}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('統', sealX + 42, sealY + 45);

  // Title text
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#7a5221';
  ctx.font = `700 24px ${sansFont}`;
  ctx.fillText('천하통일 인증서', sealX + 108, sealY + 26);

  ctx.fillStyle = '#1f1a14';
  ctx.font = `900 44px ${serifFont}`;
  ctx.fillText('딸깍 삼국지', sealX + 106, sealY + 74);

  ctx.fillStyle = '#5c4c38';
  ctx.font = `600 22px ${sansFont}`;
  ctx.fillText('5분만에 천하통일', sealX + 350, sealY + 72);

  // Top-right Red Cinnabar Rank Stamp (도장)
  ctx.save();
  ctx.translate(width - 178, 174);
  ctx.rotate(0.06);
  drawRoundedRect(ctx, -74, -74, 148, 148, 16);
  ctx.fillStyle = '#a3261d';
  ctx.fill();
  ctx.strokeStyle = '#6c1610';
  ctx.lineWidth = 4;
  ctx.stroke();

  drawRoundedRect(ctx, -62, -62, 124, 124, 10);
  ctx.strokeStyle = 'rgba(250, 243, 227, 0.78)';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.fillStyle = '#faf3e3';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 20px ${sansFont}`;
  ctx.fillText('통일 등급', 0, -34);

  ctx.font = `900 72px ${serifFont}`;
  ctx.fillText(data.rank, 0, 20);
  ctx.restore();

  // Divider below header
  ctx.strokeStyle = '#ccb792';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, 232);
  ctx.lineTo(width - 96, 232);
  ctx.stroke();

  // 4. Lord Nickname & Faction Plaque
  const heroY = 266;
  drawRoundedRect(ctx, 96, heroY, width - 192, 184, 14);
  ctx.fillStyle = 'rgba(251, 246, 234, 0.92)';
  ctx.fill();
  ctx.strokeStyle = '#c6b18b';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Faction color ribbon pill on left side of hero block
  drawRoundedRect(ctx, 124, heroY + 28, 14, 128, 7);
  ctx.fillStyle = faction.color;
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = faction.darkColor;
  ctx.font = `700 26px ${sansFont}`;
  ctx.fillText(`${faction.shortName} · ${faction.ruler} 세력`, 162, heroY + 64);

  ctx.fillStyle = '#1f1a14';
  ctx.font = `900 56px ${serifFont}`;
  ctx.fillText(displayName, 162, heroY + 128);

  ctx.fillStyle = '#6c5a42';
  ctx.font = `600 22px ${sansFont}`;
  ctx.fillText(`칭호: ${data.rankTitle}`, 162, heroY + 164);

  // 5. Final Achievement Score Banner
  const scoreY = 482;
  drawRoundedRect(ctx, 96, scoreY, width - 192, 178, 14);
  ctx.fillStyle = '#f3e4bf';
  ctx.fill();
  ctx.strokeStyle = '#bfa165';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#6b4f1b';
  ctx.font = `700 24px ${sansFont}`;
  ctx.fillText('최종 업적 점수', width / 2, scoreY + 46);

  ctx.fillStyle = '#1d1711';
  ctx.font = `900 66px ${serifFont}`;
  ctx.fillText(`${data.totalScore.toLocaleString('ko-KR')}점`, width / 2, scoreY + 116);

  ctx.fillStyle = '#6a542d';
  ctx.font = `600 21px ${sansFont}`;
  ctx.fillText(
    `기본 ${data.baseScore.toLocaleString('ko-KR')}  +  여포 토벌 ${data.lubuBonus.toLocaleString('ko-KR')}  +  잔여 병력 ${data.troopBonus.toLocaleString('ko-KR')}`,
    width / 2,
    scoreY + 154
  );

  // 6. 2x2 Battlefield Statistics Cards
  const gridY = 694;
  const colGap = 28;
  const rowGap = 24;
  const cardW = (width - 192 - colGap) / 2;
  const cardH = 152;

  const statCards: Array<{
    label: string;
    value: string;
    accent?: string;
    highlightBg?: string;
  }> = [
    {
      label: '소요 턴',
      value: `${data.turns}턴`,
    },
    {
      label: '전투 승리',
      value: `${data.battlesWon} / ${data.battlesFought}회`,
    },
    {
      label: '최종 총병력',
      value: `${data.totalTroops.toLocaleString('ko-KR')}명`,
    },
    {
      label: '여포 토벌',
      value: data.lubuDefeated ? '토벌 완료 (+1,500)' : data.lubuSpawned ? '미토벌' : '미출현',
      accent: data.lubuDefeated ? '#581c5c' : '#5e503f',
      highlightBg: data.lubuDefeated ? '#f1e4f2' : undefined,
    },
  ];

  statCards.forEach((card, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 96 + col * (cardW + colGap);
    const y = gridY + row * (cardH + rowGap);

    drawRoundedRect(ctx, x, y, cardW, cardH, 12);
    ctx.fillStyle = card.highlightBg ?? 'rgba(247, 239, 221, 0.94)';
    ctx.fill();
    ctx.strokeStyle = data.lubuDefeated && idx === 3 ? '#8d5391' : '#d1be9a';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#6c5c46';
    ctx.font = `600 23px ${sansFont}`;
    ctx.fillText(card.label, x + 30, y + 52);

    ctx.fillStyle = card.accent ?? '#1f1a14';
    ctx.font = `900 ${idx === 3 && data.lubuDefeated ? 34 : 42}px ${serifFont}`;
    ctx.fillText(card.value, x + 30, y + 114);
  });

  // 7. Bottom Watermark Footer
  const footerY = height - 116;
  ctx.strokeStyle = '#cbb792';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(160, footerY - 34);
  ctx.lineTo(width - 160, footerY - 34);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64543e';
  ctx.font = `700 26px ${sansFont}`;
  ctx.fillText(SHARE_WATERMARK, width / 2, footerY + 12);

  ctx.fillStyle = '#86745a';
  ctx.font = `500 18px ${sansFont}`;
  ctx.fillText('15개 중원 성지 천하통일 공식 기록', width / 2, footerY + 44);

  return canvas;
}

const IN_APP_BROWSER_REGEX =
  /KAKAOTALK|NAVER|Instagram|\bLine\b|FBAN|FBAV|FB_IAB|DaumApps|MicroMessenger/i;

/**
 * Detects KakaoTalk, Naver, Instagram, Line, Facebook, and similar in-app WebViews
 * where programmatic `<a download>` on `blob:`/`data:` URLs fails with "unsupported format".
 */
export function isInAppBrowser(userAgent?: string): boolean {
  const ua =
    typeof userAgent === 'string'
      ? userAgent
      : typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string'
        ? navigator.userAgent
        : '';
  if (!ua) return false;
  return IN_APP_BROWSER_REGEX.test(ua);
}

export interface CertificatePreviewAsset {
  dataUrl: string;
  filename: string;
  file: File | null;
  canNativeShareFile: boolean;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const base64 = dataUrl.split(',')[1] ?? '';
  const byteStr = atob(base64);
  const arr = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) {
    arr[i] = byteStr.charCodeAt(i);
  }
  return new Blob([arr], { type: 'image/png' });
}

function createPngFileSafe(blob: Blob, filename: string): File | null {
  if (typeof File === 'undefined') return null;
  try {
    return new File([blob], filename, { type: 'image/png' });
  } catch {
    return null;
  }
}

export function canSharePngFile(file: File | null): boolean {
  if (!file || typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    return Boolean(navigator.canShare({ files: [file] }));
  } catch {
    return false;
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

export function generateCertificateBlob(data: CertificateData): Promise<Blob> {
  const canvas = generateCertificateCanvas(data);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      try {
        resolve(dataUrlToBlob(canvas.toDataURL('image/png')));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('이미지 생성에 실패했습니다.'));
      }
    }, 'image/png');
  });
}

/**
 * Generates an inline `data:image/png;base64,...` image and optional `File`
 * for the long-press preview modal in KakaoTalk / in-app browsers.
 */
export function generateCertificatePreviewAsset(data: CertificateData): CertificatePreviewAsset {
  const canvas = generateCertificateCanvas(data);
  const dataUrl = canvas.toDataURL('image/png');
  const filename = getCertificateFilename(data.nickname);
  const blob = dataUrlToBlob(dataUrl);
  const file = createPngFileSafe(blob, filename);
  const canNativeShareFile = canSharePngFile(file);

  return {
    dataUrl,
    filename,
    file,
    canNativeShareFile,
  };
}

export async function downloadCertificateImage(data: CertificateData): Promise<string> {
  const blob = await generateCertificateBlob(data);
  const filename = getCertificateFilename(data.nickname);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return filename;
}

export async function shareCertificateFile(
  file: File,
  data: CertificateData
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!canSharePngFile(file)) {
    return 'unsupported';
  }
  try {
    await navigator.share({
      title: '딸깍 삼국지 — 5분만에 천하통일',
      text: formatShareText(data),
      files: [file],
    });
    return 'shared';
  } catch (err) {
    if (isAbortError(err)) {
      return 'cancelled';
    }
    return 'unsupported';
  }
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to execCommand fallback
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export async function shareCertificateRecord(
  data: CertificateData
): Promise<'shared' | 'copied' | 'cancelled'> {
  const shareText = formatShareText(data);
  const title = '딸깍 삼국지 — 5분만에 천하통일';

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    // Step 1: Attempt PNG file share ONLY if navigator.canShare({ files: [pngFile] }) explicitly confirms support
    if (typeof navigator.canShare === 'function') {
      try {
        const filename = getCertificateFilename(data.nickname);
        const blob = await generateCertificateBlob(data);
        const file = createPngFileSafe(blob, filename);
        if (canSharePngFile(file) && file) {
          await navigator.share({
            title,
            text: shareText,
            url: SHARE_URL,
            files: [file],
          });
          return 'shared';
        }
      } catch (fileErr) {
        if (isAbortError(fileErr)) {
          return 'cancelled';
        }
        // Gracefully fall through to text share if file sharing fails in WebView
      }
    }

    // Step 2: Text-only Web Share fallback
    try {
      await navigator.share({
        title,
        text: shareText,
        url: SHARE_URL,
      });
      return 'shared';
    } catch (err) {
      if (isAbortError(err)) {
        return 'cancelled';
      }
      // Fall back to clipboard copy on unsupported / restricted environments
    }
  }

  // Step 3: Clipboard fallback
  await copyTextToClipboard(shareText);
  return 'copied';
}
