// Call sound management utility
class CallSoundManager {
  private outgoingRingtone: HTMLAudioElement | null = null;
  private incomingRingtone: HTMLAudioElement | null = null;
  private connectedBeep: HTMLAudioElement | null = null;
  private endedBeep: HTMLAudioElement | null = null;

  constructor() {
    // Using open-source ringtone URLs (can be replaced with custom assets)
    // These are free notification sounds that work across browsers
    this.outgoingRingtone = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    this.incomingRingtone = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    this.connectedBeep = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    this.endedBeep = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');

    // Configure audio elements
    if (this.outgoingRingtone) {
      this.outgoingRingtone.loop = true;
      this.outgoingRingtone.volume = 0.5;
    }
    if (this.incomingRingtone) {
      this.incomingRingtone.loop = true;
      this.incomingRingtone.volume = 0.7;
    }
    if (this.connectedBeep) {
      this.connectedBeep.volume = 0.3;
    }
    if (this.endedBeep) {
      this.endedBeep.volume = 0.3;
    }
  }

  playOutgoingRingtone() {
    this.stopAll();
    this.outgoingRingtone?.play().catch(err => console.warn('Could not play outgoing ringtone:', err));
  }

  playIncomingRingtone() {
    this.stopAll();
    this.incomingRingtone?.play().catch(err => console.warn('Could not play incoming ringtone:', err));
  }

  playConnectedBeep() {
    this.stopAll();
    this.connectedBeep?.play().catch(err => console.warn('Could not play connected beep:', err));
  }

  playEndedBeep() {
    this.stopAll();
    this.endedBeep?.play().catch(err => console.warn('Could not play ended beep:', err));
  }

  stopAll() {
    [this.outgoingRingtone, this.incomingRingtone, this.connectedBeep, this.endedBeep].forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  }

  cleanup() {
    this.stopAll();
    this.outgoingRingtone = null;
    this.incomingRingtone = null;
    this.connectedBeep = null;
    this.endedBeep = null;
  }
}

export const callSounds = new CallSoundManager();
