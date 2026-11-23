// Web Audio API procedural sound synthesizer for 「딸깍 삼국지 — 5분만에 천하통일」

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** 대북 (War Taiko Drum) — game start & recruit */
  playDrum(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.24);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);

    // Subtle skin slap transient
    const slapOsc = ctx.createOscillator();
    const slapGain = ctx.createGain();
    slapOsc.type = 'sine';
    slapOsc.frequency.setValueAtTime(280, now);
    slapOsc.frequency.exponentialRampToValueAtTime(95, now + 0.06);
    slapGain.gain.setValueAtTime(0.22, now);
    slapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    slapOsc.connect(slapGain);
    slapGain.connect(ctx.destination);
    slapOsc.start(now);
    slapOsc.stop(now + 0.08);
  }

  /** 격돌음 (Battle Clash) — sword steel ring + low impact */
  playClash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

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
  }

  /** 화공음 (Fire Attack) — roaring flame whoosh */
  playFire(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

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
  }

  /** 여포 출현 경고음 (Lu Bu Dramatic Shock) */
  playLuBuAlert(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.playFire();
    const now = ctx.currentTime;

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
  }

  /** 승전보 팡파르 (Oriental Pentatonic Victory Fanfare) */
  playFanfare(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Pentatonic C5-D5-E5-G5-A5-C6
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
  }

  /** 패배 종소리 */
  playDefeat(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
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
  }

  /** 가벼운 선택음 */
  playSelect(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.045);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const sound = new SoundEngine();
