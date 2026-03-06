// Since we can't easily rely on uploading or downloading external .wav or .mp3
// audio assets in this environment, we can generate nice UI sound effects
// synthetically using the Web Audio API.

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  playKeystroke() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    // Subtle click/thock sound
    osc.type = 'triangle';

    // Slight randomization for natural feel
    const baseFreq = 150 + Math.random() * 50;
    osc.frequency.setValueAtTime(baseFreq, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.05);
  }

  playError() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.1);
  }

  playShatter() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    // A white noise burst for shatter/explosion
    const bufferSize = this.audioCtx.sampleRate * 0.15; // 150ms
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.audioCtx.createBufferSource();
    noiseSource.buffer = buffer;

    // Filter to make it sound "crunchy"
    const bandpass = this.audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 4000 + Math.random() * 2000;

    const gainNode = this.audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.15);

    noiseSource.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    noiseSource.start();
  }
}

export const soundManager = new SoundManager();
