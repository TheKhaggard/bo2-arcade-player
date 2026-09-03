export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = true;
    this.ambienceTimer = null;
    this.beat = 0;
    this.musicTimer = null;
    this.musicActive = false;
    this.musicPaused = false;
    this.musicStep = 0;
    this.musicStage = "moonTemple";
  }

  async unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.42;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
    this.startAmbience();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(enabled ? 0.42 : 0, this.context.currentTime, 0.025);
    }
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  async startMusic(stage = "moonTemple") {
    await this.unlock();
    this.stopMusic();
    if (!this.context) return;
    this.musicStage = stage;
    this.musicActive = true;
    this.musicPaused = false;
    this.musicStep = 0;
    this.musicPulse();
    this.musicTimer = window.setInterval(() => this.musicPulse(), 240);
  }

  stopMusic() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicActive = false;
    this.musicPaused = false;
    this.musicStep = 0;
  }

  setMusicPaused(paused) {
    this.musicPaused = Boolean(paused);
  }

  musicPulse() {
    if (!this.musicActive || this.musicPaused) return;
    const patterns = {
      moonTemple: [55, 0, 55, 65.41, 49, 0, 61.74, 55],
      infernalForge: [49, 49, 0, 51.91, 46.25, 46.25, 0, 55],
      moonGate: [65.41, 0, 82.41, 73.42, 61.74, 0, 73.42, 55],
      venomMarsh: [46.25, 0, 51.91, 46.25, 43.65, 0, 49, 41.2],
    };
    const pattern = patterns[this.musicStage] ?? patterns.moonTemple;
    const step = this.musicStep;
    const frequency = pattern[step % pattern.length];
    if (frequency) {
      this.tone({ frequency, endFrequency: frequency * 0.96, duration: 0.21, gain: 0.042, type: "sawtooth" });
      if (step % 4 === 2) {
        this.tone({ frequency: frequency * 2, endFrequency: frequency * 1.92, duration: 0.12, gain: 0.018, type: "square" });
      }
    }
    if (step % 4 === 0) {
      this.noise(0.055, 0.035);
      this.tone({ frequency: 72, endFrequency: 38, duration: 0.12, gain: 0.052, type: "sine" });
    } else if (step % 4 === 2) {
      this.noise(0.025, 0.018);
    }
    if (step % 8 === 7) {
      this.tone({ frequency: frequency ? frequency * 3 : 146.84, endFrequency: 82.41, duration: 0.3, gain: 0.018, type: "triangle" });
    }
    this.musicStep += 1;
  }

  tone({ frequency = 120, endFrequency = frequency, duration = 0.12, gain = 0.12, type = "square", delay = 0 }) {
    if (!this.enabled || !this.context || !this.master) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  noise(duration = 0.09, gain = 0.13) {
    if (!this.enabled || !this.context || !this.master) return;
    const count = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, count, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < count; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / count);
    const source = this.context.createBufferSource();
    const envelope = this.context.createGain();
    envelope.gain.value = gain;
    source.buffer = buffer;
    source.connect(envelope);
    envelope.connect(this.master);
    source.start();
  }

  play(name) {
    if (name === "punch") {
      this.noise(0.07, 0.17);
      this.tone({ frequency: 118, endFrequency: 48, duration: 0.1, gain: 0.15, type: "sawtooth" });
    } else if (name === "kick") {
      this.noise(0.11, 0.2);
      this.tone({ frequency: 92, endFrequency: 34, duration: 0.16, gain: 0.19, type: "square" });
    } else if (name === "block") {
      this.tone({ frequency: 520, endFrequency: 180, duration: 0.08, gain: 0.1, type: "square" });
    } else if (name === "jump") {
      this.tone({ frequency: 90, endFrequency: 220, duration: 0.14, gain: 0.08, type: "triangle" });
    } else if (name === "round") {
      this.tone({ frequency: 82, endFrequency: 62, duration: 0.42, gain: 0.12, type: "sawtooth" });
      this.tone({ frequency: 164, endFrequency: 124, duration: 0.42, gain: 0.07, type: "square", delay: 0.08 });
    } else if (name === "fight") {
      this.tone({ frequency: 170, endFrequency: 70, duration: 0.28, gain: 0.18, type: "sawtooth" });
    } else if (name === "win") {
      [110, 165, 220].forEach((frequency, index) => {
        this.tone({ frequency, endFrequency: frequency * 1.25, duration: 0.35, gain: 0.1, type: "square", delay: index * 0.12 });
      });
    } else if (name === "finish") {
      this.tone({ frequency: 74, endFrequency: 36, duration: 0.72, gain: 0.2, type: "sawtooth" });
      this.tone({ frequency: 148, endFrequency: 72, duration: 0.62, gain: 0.12, type: "square", delay: 0.08 });
    } else if (name === "finisher") {
      this.noise(0.34, 0.22);
      [55, 82.4, 110, 164.8].forEach((frequency, index) => {
        this.tone({ frequency, endFrequency: frequency * 1.8, duration: 0.62, gain: 0.11, type: "sawtooth", delay: index * 0.1 });
      });
    }
  }

  startAmbience() {
    if (this.ambienceTimer || !this.context) return;
    this.ambienceTimer = window.setInterval(() => {
      if (!this.enabled || this.musicActive) return;
      const pattern = [55, 55, 65.4, 49];
      const frequency = pattern[this.beat % pattern.length];
      this.tone({ frequency, endFrequency: frequency * 0.88, duration: 0.7, gain: 0.025, type: "sawtooth" });
      if (this.beat % 2 === 0) this.noise(0.035, 0.018);
      this.beat += 1;
    }, 720);
  }
}
