import { Platform } from 'react-native';

class AudioController {
  private soundEnabled: boolean = true;
  private audioCtx: any = null;

  constructor() {
    this.initContext();
  }

  private initContext() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      } catch {
        // AudioContext not supported
      }
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  private ensureUnlocked() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  /**
   * Play a clean synthesized tone using Web Audio API
   */
  public playTone(freq: number, type: OscillatorType = 'sine', durationSec = 0.15, gainVal = 0.1) {
    if (!this.soundEnabled || !this.audioCtx) return;
    this.ensureUnlocked();

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationSec);
    } catch {
      // Audio error suppressed
    }
  }

  // Common Game Sound Effects
  public playTap() {
    this.playTone(600, 'sine', 0.08, 0.08);
  }

  public playCorrect() {
    if (!this.soundEnabled || !this.audioCtx) return;
    this.ensureUnlocked();
    // Two-tone rising chime (C5 -> G5)
    this.playTone(523.25, 'triangle', 0.12, 0.12);
    setTimeout(() => {
      this.playTone(783.99, 'triangle', 0.25, 0.15);
    }, 100);
  }

  public playIncorrect() {
    if (!this.soundEnabled || !this.audioCtx) return;
    this.ensureUnlocked();
    // Gentle low bonk (F#3)
    this.playTone(185.0, 'sawtooth', 0.18, 0.06);
  }

  public playVictory() {
    if (!this.soundEnabled || !this.audioCtx) return;
    this.ensureUnlocked();
    // Arpeggio fanfare (C - E - G - C)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.22, 0.15);
      }, idx * 120);
    });
  }

  public playCannonShoot() {
    // Low frequency pop
    this.playTone(140, 'square', 0.15, 0.12);
  }

  public playRhythmBeat(isAccent = false) {
    if (isAccent) {
      this.playTone(880, 'sine', 0.06, 0.15);
    } else {
      this.playTone(440, 'sine', 0.04, 0.08);
    }
  }
}

export const soundManager = new AudioController();
