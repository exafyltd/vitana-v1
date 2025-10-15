export const playNotificationBell = () => {
  const audio = new Audio('/sounds/notification-bell.mp3');
  audio.volume = 0.7;
  audio.play().catch(e => console.warn('Could not play bell:', e));
};
