// Web Audio API procedural sound synthesizer for 「딸깍 삼국지 — 5분만에 천하통일」

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  /**
   * Ensures a running AudioContext and invokes `schedule(ctx, baseTime)`.
   * Handles mobile browser first-touch suspension by resuming and scheduling
   * with a short (+10ms) lookahead so the initial transient is never clipped.
   */
  private withReadyContext(schedule: (ctx: AudioContext, baseTime: number) => void): void {
    if (this.muted || typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      const ctx = this.ctx;

      if (ctx.state === 'suspended') {
        const resumeResult = ctx.resume();
        if (resumeResult && typeof resumeResult.then === 'function') {
          void resumeResult
            .then(() => {
              if (!this.muted && ctx.state === 'running') {
                schedule(ctx, ctx.currentTime + 0.01);
              }
            })
            .catch(() => {
              // Autoplay blocked or context closed
            });
          return;
        }
        schedule(ctx, ctx.currentTime + 0.01);
        return;
      }

      schedule(ctx, ctx.currentTime + 0.004);
    } catch {
      // Gracefully ignore Web Audio errors on unsupported devices
    }
  }

  /** Helper: schedules a crisp bandpass-filtered noise click burst */
  private scheduleNoiseBurst(
    ctx: AudioContext,
    startTime: number,
    durationSec: number,
    centerFreq: number,
    qValue: number,
    peakGain: number
  ): void {
    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      // Sharp front transient with crisp exponential decay (wooden clapper / tactile switch feel)
      const env = Math.exp(-i / Math.max(1, sampleCount * 0.28));
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, startTime);
    filter.Q.setValueAtTime(qValue, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0001, peakGain), startTime);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + durationSec);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(startTime);
    noise.stop(startTime + durationSec + 0.004);
  }

  /** Helper: schedules a crisp downward-sweeping tactile triangle tone */
  private scheduleClickTone(
    ctx: AudioContext,
    startTime: number,
    durationSec: number,
    startFreq: number,
    endFreq: number,
    peakGain: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + durationSec);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.005);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /**
   * 시그니처 2박자 「딸-깍」 효과음
   * 1타('딸', 0ms): 12ms 밴드패스 노이즈 + 1500Hz → 520Hz 삼각파(18ms)
   * 2타('깍', +45ms): 10ms 맑은 노이즈 + 2300Hz → 880Hz 삼각파(20ms)
   */
  playDdalkkak(): void {
    this.withReadyContext((ctx, now) => {
      // 1타 ('딸', 0ms)
      this.scheduleNoiseBurst(ctx, now, 0.012, 2600, 2.4, 0.25);
      this.scheduleClickTone(ctx, now, 0.018, 1500, 520, 0.27);

      // 2타 ('깍', +45ms)
      const secondHit = now + 0.045;
      this.scheduleNoiseBurst(ctx, secondHit, 0.01, 3800, 2.8, 0.29);
      this.scheduleClickTone(ctx, secondHit, 0.02, 2300, 880, 0.31);
    });
  }

  /**
   * 일반 UI용 가벼운 단발 「딸깍」 효과음
   * 자주 눌러도 피로감이 적은 부드러운 단발 클릭 (1700Hz → 680Hz, 14ms + 약한 노이즈)
   */
  playClick(): void {
    this.withReadyContext((ctx, now) => {
      this.scheduleNoiseBurst(ctx, now, 0.009, 2400, 2.2, 0.1);
      this.scheduleClickTone(ctx, now, 0.014, 1700, 680, 0.15);
    });
  }

  /**
   * 시작 화면 진입 전용: 선명한 시그니처 「딸-깍」 직후 120ms 뒤에 은은한 대북 여운 연결
   */
  playSplashStart(): void {
    this.withReadyContext((ctx, now) => {
      // 1타 ('딸', 0ms)
      this.scheduleNoiseBurst(ctx, now, 0.012, 2600, 2.4, 0.25);
      this.scheduleClickTone(ctx, now, 0.018, 1500, 520, 0.27);

      // 2타 ('깍', +45ms)
      const secondHit = now + 0.045;
      this.scheduleNoiseBurst(ctx, secondHit, 0.01, 3800, 2.8, 0.29);
      this.scheduleClickTone(ctx, secondHit, 0.02, 2300, 880, 0.31);

      // 은은한 대북 여운 (+120ms) — '딸-깍'을 덮지 않고 자연스럽게 이어짐
      const drumAt = now + 0.12;
      this.scheduleDrumAt(ctx, drumAt, 0.52);
    });
  }

  /** Internal war drum scheduler with adjustable intensity scale */
  private scheduleDrumAt(ctx: AudioContext, startTime: number, volumeScale = 1): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, startTime);
    osc.frequency.exponentialRampToValueAtTime(48, startTime + 0.24);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.45 * volumeScale, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.34);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.36);

    // Subtle skin slap transient
    const slapOsc = ctx.createOscillator();
    const slapGain = ctx.createGain();
    slapOsc.type = 'sine';
    slapOsc.frequency.setValueAtTime(280, startTime);
    slapOsc.frequency.exponentialRampToValueAtTime(95, startTime + 0.06);
    slapGain.gain.setValueAtTime(0.22 * volumeScale, startTime);
    slapGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.07);
    slapOsc.connect(slapGain);
    slapGain.connect(ctx.destination);
    slapOsc.start(startTime);
    slapOsc.stop(startTime + 0.08);
  }

  /** 대북 (War Taiko Drum) — game start, recruit & events */
  playDrum(delaySec = 0): void {
    this.withReadyContext((ctx, now) => {
      this.scheduleDrumAt(ctx, now + Math.max(0, delaySec), 1);
    });
  }

  /** 격돌음 (Battle Clash) — sword steel ring + low impact */
  playClash(): void {
    this.withReadyContext((ctx, now) => {
      // Noise burst for steel clash
      const bufferSize = Math.floor(ctx.sampleRate * 0.22);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.32));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.Q.setValueAtTime(3.2, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.32, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);

      // Metallic overtone
      const ring = ctx.createOscillator();
      const ringGain = ctx.createGain();
      ring.type = 'sawtooth';
      ring.frequency.setValueAtTime(1180, now);
      ring.frequency.exponentialRampToValueAtTime(720, now + 0.16);
      ringGain.gain.setValueAtTime(0.11, now);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      ring.connect(ringGain);
      ringGain.connect(ctx.destination);
      ring.start(now);
      ring.stop(now + 0.18);

      // Low thud
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(125, now);
      thud.frequency.exponentialRampToValueAtTime(42, now + 0.15);
      thudGain.gain.setValueAtTime(0.3, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.start(now);
      thud.stop(now + 0.18);
    });
  }

  /** 화공음 (Fire Attack) — roaring flame whoosh */
  playFire(): void {
    this.withReadyContext((ctx, now) => {
      const bufferSize = Math.floor(ctx.sampleRate * 0.55);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = Math.sin((i / bufferSize) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * env;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(1450, now + 0.18);
      filter.frequency.exponentialRampToValueAtTime(240, now + 0.55);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0.42, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    });
  }

  /** 여포 출현 경고음 (Lu Bu Dramatic Shock) */
  playLuBuAlert(): void {
    this.playFire();
    this.withReadyContext((ctx, now) => {
      const freqs = [110, 155.56, 220]; // dark tritone-like power shock
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 0.92, now + 0.72);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
      });
    });
  }

  /** 승전보 팡파르 (Oriental Pentatonic Victory Fanfare) */
  playFanfare(): void {
    this.withReadyContext((ctx, now) => {
      // Pentatonic C5-D5-E5-G5-C6
      const notes = [523.25, 587.33, 659.25, 783.99, 1046.5];
      const times = [0, 0.11, 0.22, 0.34, 0.48];
      const durs = [0.14, 0.14, 0.14, 0.18, 0.65];

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = now + times[i];
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.24, t + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, t + durs[i]);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + durs[i] + 0.02);
      });
    });
  }

  /** 패배 종소리 */
  playDefeat(): void {
    this.withReadyContext((ctx, now) => {
      const notes = [392.0, 349.23, 293.66, 220.0];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const t = now + i * 0.18;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    });
  }

  /** 가벼운 선택음 (단발 '딸깍'으로 통일) */
  playSelect(): void {
    this.playClick();
  }

  /** 테스트용 내부 AudioContext 초기화 */
  resetForTest(): void {
    this.ctx = null;
    this.muted = false;
  }
}

export const sound = new SoundEngine();

/** 시그니처 2박자 「딸-깍」 효과음 */
export function playDdalkkak(): void {
  sound.playDdalkkak();
}

/** 일반 UI용 가벼운 단발 「딸깍」 효과음 */
export function playClick(): void {
  sound.playClick();
}
