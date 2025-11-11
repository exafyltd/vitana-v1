// Curated Unsplash photos for realistic profile avatars
// Using professional wellness-themed portraits

export const UNSPLASH_PROFILE_PHOTOS = [
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1590086782957-93c06ef21604?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1546539782-6fc531453083?w=600&h=600&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1557862921-37829c790f19?w=600&h=600&fit=crop&crop=faces',
];

export function getUnsplashProfilePhoto(index: number): string {
  return UNSPLASH_PROFILE_PHOTOS[index % UNSPLASH_PROFILE_PHOTOS.length];
}
