export function playSound(path: string, volume = 0.08) {
  const audio = new Audio(path);
  audio.volume = volume;
  audio.play().catch(() => {});
}
