// Global registry to track all active looping sounds
const activeLoopingSounds = new Set<{
  audio: HTMLAudioElement;
  stop: () => void;
  path: string;
}>();

export function playLoopingSound(path: string, volume = 0.05) {
  const audio = new Audio(path);
  audio.loop = true;
  audio.volume = volume;
  audio.play().catch(() => {});

  const instance = {
    audio,
    path,
    stop: () => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      audio.load();
      audio.remove();
      activeLoopingSounds.delete(instance);
    }
  };

  activeLoopingSounds.add(instance);
  return instance;
}

/**
 * Stop all looping sounds matching a specific path
 * Useful for cleanup when navigating away or forcing cleanup
 */
export function stopAllLoopingSoundsForPath(path: string) {
  for (const instance of Array.from(activeLoopingSounds)) {
    if (instance.path === path) {
      instance.stop();
    }
  }
}
