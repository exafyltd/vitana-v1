export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  timestamp: Date;
  type: 'chat' | 'system' | 'reaction';
  emoji?: string;
}

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  handRaised: boolean;
  joinedAt: Date;
}

export interface StreamMetadata {
  viewerCount: number;
  peakViewers: number;
  totalMessages: number;
  reactions: {
    heart: number;
    thumbsUp: number;
  };
}
