export const playNotificationBell = () => {
  try {
    // Try to play audio file first
    const audio = new Audio('/sounds/notification-bell.mp3');
    audio.volume = 0.7;
    audio.play().catch(e => {
      console.warn('Could not play bell audio file, generating synthetic bell:', e);
      
      // Fallback: generate synthetic bell sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Create a pleasant bell sound (880Hz + 1320Hz for harmonics)
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator1.frequency.value = 880; // A5
      oscillator2.frequency.value = 1320; // E6
      oscillator1.type = 'sine';
      oscillator2.type = 'sine';
      
      // Envelope: quick attack, medium decay
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.5);
      oscillator2.stop(audioContext.currentTime + 0.5);
      
      console.log('🔔 Synthetic bell sound played');
    });
  } catch (error) {
    console.warn('⚠️ Could not play bell sound:', error);
  }
};
