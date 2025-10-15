export type StreamType = 'audio' | 'video' | 'screen';

export type InputMode = 
  | { type: 'text'; streams: [] }
  | { type: 'voice'; streams: ['audio'] }
  | { type: 'camera'; streams: ['audio', 'video'] }
  | { type: 'screen'; streams: ['audio', 'screen'] }
  | { type: 'multi'; streams: StreamType[] };
