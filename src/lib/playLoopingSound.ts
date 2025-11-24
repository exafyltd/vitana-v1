export function playLoopingSound(path: string, volume = 0.05) {
  const audio = new Audio(path);
  audio.loop = true;
  audio.volume = volume;
  audio.play().catch(() => {});
  
  return {
    audio,
    stop: () => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      audio.load();
      audio.remove();
    }
  };
}
