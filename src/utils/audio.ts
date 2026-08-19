/**
 * Hugi Voice & Video Calling and Chat Notification Sounds Engine
 * Implemented completely using Web Audio API Oscillators & Gains
 * for zero-dependency, high-fidelity, and instant playback.
 */

// 1. Play a soft, high-fidelity double-chime for incoming messages
export const playChimeNotification = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First tone (Crisp and high)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    // Second tone (Harmonious sub-chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(440, now); // A4
    osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
    gain2.gain.setValueAtTime(0.05, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.3);

    osc2.start(now);
    osc2.stop(now + 0.4);
  } catch (e) {
    console.warn("Failed to play chat chime notification:", e);
  }
};

// 2. Play a realistic telecom ringback tone ("trut... trut...") for the Caller
export class RingbackPlayer {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  start() {
    this.stop(); // Clean any previous state
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      const playTone = () => {
        if (!this.ctx) return;
        this.stopNodes();

        const now = this.ctx.currentTime;
        
        // Cambodian/US ringback standard: 400Hz + 450Hz dual frequency
        this.osc1 = this.ctx.createOscillator();
        this.osc2 = this.ctx.createOscillator();
        this.gainNode = this.ctx.createGain();

        this.osc1.type = "sine";
        this.osc1.frequency.setValueAtTime(400, now);

        this.osc2.type = "sine";
        this.osc2.frequency.setValueAtTime(450, now);

        // Soft, comfortable gain
        this.gainNode.gain.setValueAtTime(0.06, now);
        this.gainNode.gain.setValueAtTime(0.06, now + 1.2);
        this.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

        this.osc1.connect(this.gainNode);
        this.osc2.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);

        this.osc1.start(now);
        this.osc1.stop(now + 1.5);

        this.osc2.start(now);
        this.osc2.stop(now + 1.5);
      };

      // Play immediately
      playTone();

      // Repeat every 4 seconds (1.5s sound, 2.5s silence)
      this.intervalId = setInterval(playTone, 4000);
    } catch (e) {
      console.warn("Failed to start Ringback player:", e);
    }
  }

  private stopNodes() {
    try {
      if (this.osc1) {
        this.osc1.stop();
        this.osc1.disconnect();
        this.osc1 = null;
      }
      if (this.osc2) {
        this.osc2.stop();
        this.osc2.disconnect();
        this.osc2 = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
    } catch (e) {}
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stopNodes();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

// 3. Play a classic telephone ringing tone for the Receiver
export class RingtonePlayer {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  start() {
    this.stop();
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      const playTone = () => {
        if (!this.ctx) return;
        this.stopNodes();

        const now = this.ctx.currentTime;
        
        // High quality dual-chirp phone ring
        this.osc1 = this.ctx.createOscillator();
        this.osc2 = this.ctx.createOscillator();
        this.gainNode = this.ctx.createGain();

        // Harmonious bell-ring: 880Hz (A5) and 1046.5Hz (C6)
        this.osc1.type = "sine";
        this.osc1.frequency.setValueAtTime(880, now);
        // Create tremolo/vibrato effect by wrapping frequency
        this.osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
        this.osc1.frequency.exponentialRampToValueAtTime(880, now + 0.6);

        this.osc2.type = "sine";
        this.osc2.frequency.setValueAtTime(1046.5, now);
        this.osc2.frequency.exponentialRampToValueAtTime(1400, now + 0.3);
        this.osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.6);

        this.gainNode.gain.setValueAtTime(0.08, now);
        this.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        this.osc1.connect(this.gainNode);
        this.osc2.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);

        this.osc1.start(now);
        this.osc1.stop(now + 1.2);

        this.osc2.start(now);
        this.osc2.stop(now + 1.2);
      };

      // Play immediately
      playTone();

      // Repeat every 3 seconds
      this.intervalId = setInterval(playTone, 3000);
    } catch (e) {
      console.warn("Failed to start Ringtone player:", e);
    }
  }

  private stopNodes() {
    try {
      if (this.osc1) {
        this.osc1.stop();
        this.osc1.disconnect();
        this.osc1 = null;
      }
      if (this.osc2) {
        this.osc2.stop();
        this.osc2.disconnect();
        this.osc2 = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
    } catch (e) {}
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stopNodes();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
