// Call sound management utility
class CallSoundManager {
  private outgoingRingtone: HTMLAudioElement | null = null;
  private incomingRingtone: HTMLAudioElement | null = null;
  private connectedBeep: HTMLAudioElement | null = null;
  private endedBeep: HTMLAudioElement | null = null;
  private isPrimed: boolean = false;

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

  // Prime audio on first user interaction to satisfy browser autoplay policies
  async prime(): Promise<boolean> {
    if (this.isPrimed) {
      console.log('🔊 Audio already primed');
      return true;
    }

    try {
      console.log('🔊 Priming audio system...');
      // Play and immediately pause each audio element to unlock autoplay
      const audioElements = [
        this.outgoingRingtone,
        this.incomingRingtone,
        this.connectedBeep,
        this.endedBeep
      ];

      for (const audio of audioElements) {
        if (audio) {
          audio.muted = true;
          await audio.play();
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        }
      }

      this.isPrimed = true;
      console.log('✅ Audio system primed successfully');
      return true;
    } catch (err) {
      console.error('❌ Failed to prime audio system:', err);
      return false;
    }
  }

  playOutgoingRingtone() {
    console.log('🔊 Playing outgoing ringtone...');
    this.stopAll();
    this.outgoingRingtone?.play()
      .then(() => console.log('✅ Outgoing ringtone playing'))
      .catch(err => {
        console.error('❌ Could not play outgoing ringtone:', err);
        if (!this.isPrimed) {
          console.warn('⚠️ Audio not primed. Call prime() on user interaction first.');
        }
      });
  }

  playIncomingRingtone() {
    console.log('🔊 Playing incoming ringtone...');
    this.stopAll();
    this.incomingRingtone?.play()
      .then(() => console.log('✅ Incoming ringtone playing'))
      .catch(err => {
        console.error('❌ Could not play incoming ringtone:', err);
        if (!this.isPrimed) {
          console.warn('⚠️ Audio not primed. Call prime() on user interaction first.');
        }
      });
  }

  playConnectedBeep() {
    console.log('🔊 Playing connected beep...');
    this.stopAll();
    this.connectedBeep?.play()
      .then(() => console.log('✅ Connected beep played'))
      .catch(err => console.error('❌ Could not play connected beep:', err));
  }

  playEndedBeep() {
    console.log('🔊 Playing ended beep...');
    this.stopAll();
    this.endedBeep?.play()
      .then(() => console.log('✅ Ended beep played'))
      .catch(err => console.error('❌ Could not play ended beep:', err));
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
