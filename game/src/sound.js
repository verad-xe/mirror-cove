// sound.js — SoundFX: every sound in Mirror Cove is synthesized with WebAudio.
// No audio files, no network loads. The context is created lazily on the first
// user gesture (the Start button) so browsers allow playback.

export class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  // Create (or resume) the AudioContext. Safe to call repeatedly.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = !!m;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // One enveloped oscillator tone.
  tone(freq, t0, dur, type = 'sine', vol = 0.3, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + t0;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Short filtered noise burst (used for the buzzer's grit).
  noise(t0, dur, vol = 0.15, freq = 900) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + t0;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  click() {
    this.tone(660, 0, 0.07, 'triangle', 0.18);
  }

  // Two-note discovery chime: E6 then B6 with a soft sparkle.
  found() {
    this.tone(1318.5, 0, 0.22, 'sine', 0.32);
    this.tone(1975.5, 0.09, 0.34, 'sine', 0.3);
    this.tone(2637, 0.18, 0.3, 'triangle', 0.12);
  }

  // Low square-wave buzzer for a wrong click.
  miss() {
    this.tone(160, 0, 0.22, 'square', 0.22, 110);
    this.tone(120, 0.02, 0.24, 'sawtooth', 0.12, 90);
    this.noise(0, 0.12, 0.06, 500);
  }

  // Sparkly rising arpeggio when a hint reveals a difference.
  hint() {
    const notes = [1046.5, 1318.5, 1568, 2093];
    notes.forEach((f, i) => this.tone(f, i * 0.07, 0.28, 'sine', 0.2));
  }

  // Little tick for the final ten seconds.
  tick() {
    this.tone(1180, 0, 0.05, 'square', 0.1);
  }

  // Level-clear fanfare.
  clear() {
    const seq = [523.25, 659.25, 783.99, 1046.5];
    seq.forEach((f, i) => this.tone(f, i * 0.11, 0.3, 'triangle', 0.28));
    this.tone(1318.5, 0.46, 0.5, 'sine', 0.26);
    this.tone(1568, 0.46, 0.5, 'triangle', 0.12);
  }

  // Final victory: the clear fanfare plus a higher flourish.
  victory() {
    this.clear();
    const seq = [1046.5, 1318.5, 1568, 2093];
    seq.forEach((f, i) => this.tone(f, 0.75 + i * 0.1, 0.4, 'sine', 0.2));
  }

  // Descending tones when time runs out.
  fail() {
    const seq = [392, 329.63, 261.63, 196];
    seq.forEach((f, i) => this.tone(f, i * 0.16, 0.3, 'sawtooth', 0.16));
  }

  pause() {
    this.tone(440, 0, 0.1, 'sine', 0.15);
    this.tone(440, 0.14, 0.1, 'sine', 0.15);
  }
}
