import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMOTION_BADGES,
  EMOTION_LABELS,
  LORD_DIALOGUES,
  LUBU_TAUNT_LINES,
  PORTRAIT_CROPS,
  pickLordLine,
  type LordReactionTrigger,
  type PortraitEmotion,
} from './portraits';
import type { PlayableFactionId } from './types';

test('PORTRAIT_CROPS defines valid title-pc.png crops for wei, shu, wu, and lubu', () => {
  const keys = ['wei', 'shu', 'wu', 'lubu'] as const;
  for (const key of keys) {
    const cfg = PORTRAIT_CROPS[key];
    assert.equal(cfg.imageUrl, '/title-pc.png');
    assert.ok(cfg.bgPosition.includes('%'));
    assert.ok(cfg.bgSize.includes('%'));
    assert.ok(cfg.ringColor.startsWith('#'));
    assert.ok(cfg.rulerName.length > 0);
  }
});

test('EMOTION_BADGES and EMOTION_LABELS cover all 7 portrait emotions accurately', () => {
  const expected: Record<PortraitEmotion, string | null> = {
    idle: null,
    attack: '⚔️',
    defend: '🛡️',
    victory: '✨',
    defeat: '💧',
    fire: '🔥',
    appear: '⚡',
  };

  for (const [emotion, badge] of Object.entries(expected) as [PortraitEmotion, string | null][]) {
    assert.equal(EMOTION_BADGES[emotion], badge);
    assert.ok(EMOTION_LABELS[emotion].length > 0);
  }
});

test('pickLordLine returns non-empty faction-specific Korean dialogue for every reaction trigger', () => {
  const factions: PlayableFactionId[] = ['shu', 'wei', 'wu'];
  const triggers: LordReactionTrigger[] = [
    'idle',
    'recruit',
    'attack_win',
    'attack_lose',
    'defend_win',
    'defend_lose',
    'fire',
    'lubu_spawn',
    'lubu_defeated',
  ];

  for (const faction of factions) {
    for (const trigger of triggers) {
      assert.ok(LORD_DIALOGUES[faction][trigger].length > 0);
      const line = pickLordLine(faction, trigger, 0);
      assert.ok(line.length > 4);
    }
  }

  assert.ok(LUBU_TAUNT_LINES.againstPlayer.includes('방천화극'));
  assert.ok(LUBU_TAUNT_LINES.againstRival.includes('여포'));
});
