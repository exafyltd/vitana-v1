export type ButtonState = 'neutral' | 'active' | 'disabled' | 'processing';
export type ButtonType = 'mic' | 'camera' | 'screen' | 'sparkles';

export interface ButtonStateMetadata {
  timestamp: number;
  error?: string;
}

export interface ButtonStates {
  mic: ButtonState;
  camera: ButtonState;
  screen: ButtonState;
  sparkles: ButtonState;
}
