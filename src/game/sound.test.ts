import assert from 'node:assert/strict';
import test from 'node:test';
import { playClick, playDdalkkak, sound } from './sound';

interface RecordedParamOp {
  method: 'setValueAtTime' | 'linearRampToValueAtTime' | 'exponentialRampToValueAtTime';
  value: number;
  time: number;
}

interface MockOscRecord {
  type: OscillatorType;
  freqOps: RecordedParamOp[];
  startTime: number | null;
  stopTime: number | null;
}

interface MockNoiseRecord {
  sampleLength: number;
  startTime: number | null;
  stopTime: number | null;
}

interface MockGainRecord {
  gainOps: RecordedParamOp[];
}

function createFakeParam(ops: RecordedParamOp[]) {
  return {
    setValueAtTime(value: number, time: number) {
      ops.push({ method: 'setValueAtTime', value, time });
    },
    linearRampToValueAtTime(value: number, time: number) {
      ops.push({ method: 'linearRampToValueAtTime', value, time });
    },
    exponentialRampToValueAtTime(value: number, time: number) {
      ops.push({ method: 'exponentialRampToValueAtTime', value, time });
    },
  };
}

class MockAudioContext {
  static instances: MockAudioContext[] = [];
  static initialState: AudioContextState = 'running';

  sampleRate = 44100;
  currentTime = 1.0;
  state: AudioContextState;
  destination = {};

  oscillators: MockOscRecord[] = [];
  noises: MockNoiseRecord[] = [];
  gains: MockGainRecord[] = [];
  filters: Array<{ type: BiquadFilterType; freqOps: RecordedParamOp[]; qOps: RecordedParamOp[] }> =
    [];
  resumeCalls = 0;

  constructor() {
    this.state = MockAudioContext.initialState;
    MockAudioContext.instances.push(this);
  }

  resume(): Promise<void> {
    this.resumeCalls += 1;
    this.state = 'running';
    return Promise.resolve();
  }

  createBuffer(_channels: number, length: number, _sampleRate: number) {
    const channelData = new Float32Array(length);
    return {
      length,
      getChannelData: () => channelData,
    };
  }

  createBufferSource() {
    const rec: MockNoiseRecord = { sampleLength: 0, startTime: null, stopTime: null };
    this.noises.push(rec);
    return {
      set buffer(buf: { length: number }) {
        rec.sampleLength = buf.length;
      },
      connect: () => undefined,
      start: (t = 0) => {
        rec.startTime = t;
      },
      stop: (t = 0) => {
        rec.stopTime = t;
      },
    };
  }

  createBiquadFilter() {
    const rec = {
      type: 'lowpass' as BiquadFilterType,
      freqOps: [] as RecordedParamOp[],
      qOps: [] as RecordedParamOp[],
    };
    this.filters.push(rec);
    return {
      get type() {
        return rec.type;
      },
      set type(v: BiquadFilterType) {
        rec.type = v;
      },
      frequency: createFakeParam(rec.freqOps),
      Q: createFakeParam(rec.qOps),
      connect: () => undefined,
    };
  }

  createOscillator() {
    const rec: MockOscRecord = {
      type: 'sine',
      freqOps: [],
      startTime: null,
      stopTime: null,
    };
    this.oscillators.push(rec);
    return {
      get type() {
        return rec.type;
      },
      set type(v: OscillatorType) {
        rec.type = v;
      },
      frequency: createFakeParam(rec.freqOps),
      connect: () => undefined,
      start: (t = 0) => {
        rec.startTime = t;
      },
      stop: (t = 0) => {
        rec.stopTime = t;
      },
    };
  }

  createGain() {
    const rec: MockGainRecord = { gainOps: [] };
    this.gains.push(rec);
    return {
      gain: createFakeParam(rec.gainOps),
      connect: () => undefined,
    };
  }
}

function setupMockWindow(initialState: AudioContextState = 'running') {
  MockAudioContext.instances = [];
  MockAudioContext.initialState = initialState;
  sound.resetForTest();
  (globalThis as unknown as { window: Record<string, unknown> }).window = {
    AudioContext: MockAudioContext,
  };
}

test('playDdalkkak synthesizes a crisp 2-beat click (0ms and +45ms) with triangle tones and bandpass noise', () => {
  setupMockWindow('running');
  playDdalkkak();

  assert.equal(MockAudioContext.instances.length, 1);
  const ctx = MockAudioContext.instances[0];
  assert.equal(ctx.oscillators.length, 2);
  assert.equal(ctx.noises.length, 2);
  assert.equal(ctx.filters.length, 2);

  // Beat 1: 1500Hz -> 520Hz (18ms), Beat 2 (+45ms): 2300Hz -> 880Hz (20ms)
  const [osc1, osc2] = ctx.oscillators;
  assert.equal(osc1.type, 'triangle');
  assert.equal(osc2.type, 'triangle');
  assert.equal(osc1.freqOps[0].value, 1500);
  assert.equal(osc1.freqOps[1].value, 520);
  assert.equal(osc2.freqOps[0].value, 2300);
  assert.equal(osc2.freqOps[1].value, 880);

  assert.ok(osc1.startTime !== null && osc2.startTime !== null);
  const beatGapMs = Math.round((osc2.startTime - osc1.startTime) * 1000);
  assert.equal(beatGapMs, 45);
  assert.equal(ctx.filters[0].type, 'bandpass');
  assert.equal(ctx.filters[1].type, 'bandpass');
});

test('playClick synthesizes a single softer UI click (1700Hz -> 680Hz, 14ms + subtle noise)', () => {
  setupMockWindow('running');
  playClick();

  const ctx = MockAudioContext.instances[0];
  assert.equal(ctx.oscillators.length, 1);
  assert.equal(ctx.noises.length, 1);
  assert.equal(ctx.oscillators[0].type, 'triangle');
  assert.equal(ctx.oscillators[0].freqOps[0].value, 1700);
  assert.equal(ctx.oscillators[0].freqOps[1].value, 680);

  const durMs = Math.round(
    (ctx.oscillators[0].freqOps[1].time - ctx.oscillators[0].freqOps[0].time) * 1000
  );
  assert.equal(durMs, 14);
});

test('playSplashStart schedules 2-beat ddalkkak followed by soft trailing drum at +120ms', () => {
  setupMockWindow('running');
  sound.playSplashStart();

  const ctx = MockAudioContext.instances[0];
  // 2 triangle click tones + 2 drum oscillators (main body + skin slap)
  assert.equal(ctx.oscillators.length, 4);
  assert.equal(ctx.noises.length, 2);

  const clickStart = ctx.oscillators[0].startTime!;
  const drumStart = ctx.oscillators[2].startTime!;
  assert.equal(Math.round((drumStart - clickStart) * 1000), 120);
});

test('muted state blocks playDdalkkak, playClick, playSplashStart, and all combat/event SFX', () => {
  setupMockWindow('running');
  sound.setMuted(true);
  assert.equal(sound.isMuted(), true);

  playDdalkkak();
  playClick();
  sound.playSplashStart();
  sound.playDrum();
  sound.playClash();
  sound.playFire();
  sound.playFanfare();
  sound.playDefeat();

  assert.equal(MockAudioContext.instances.length, 0);

  // Unmuting restores playback cleanly
  sound.setMuted(false);
  playClick();
  assert.equal(MockAudioContext.instances.length, 1);
  assert.equal(MockAudioContext.instances[0].oscillators.length, 1);
});

test('mobile first-touch suspended AudioContext calls resume() and schedules ddalkkak at +10ms lookahead', async () => {
  setupMockWindow('suspended');
  playDdalkkak();

  assert.equal(MockAudioContext.instances.length, 1);
  const ctx = MockAudioContext.instances[0];
  assert.equal(ctx.resumeCalls, 1);
  // Not scheduled synchronously before resume resolves
  assert.equal(ctx.oscillators.length, 0);

  // Wait a microtask tick for ctx.resume() promise to settle
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(ctx.oscillators.length, 2);
  assert.equal(ctx.noises.length, 2);
  assert.ok(Math.abs(ctx.oscillators[0].startTime! - (ctx.currentTime + 0.01)) < 1e-6);
});
