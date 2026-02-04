import { useState, useCallback, useRef, useEffect } from 'react';
import { OrbVoiceClient } from '@/lib/OrbVoiceClient';

type ConnectionState = 'disconnected' | 'connecting' | 'ready';

interface UseOrbVoiceClientReturn {
  connectionState: ConnectionState;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  error: string | null;
  volumeLevel: number;
  transcript: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  startListening: () => Promise<void>;
  stopListening: () => void;
  sendMessage: (text: string) => void;
  endTurn: () => void;
}

export function useOrbVoiceClient(): UseOrbVoiceClientReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcript, setTranscript] = useState('');

  const clientRef = useRef<OrbVoiceClient | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stop();
        clientRef.current = null;
      }
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      setConnectionState('connecting');

      // Create new client with callbacks
      const client = new OrbVoiceClient('de', {
        onConnectionStateChange: (state) => {
          setConnectionState(state);
        },
        onListeningChange: (listening) => {
          setIsListening(listening);
        },
        onSpeakingChange: (speaking) => {
          setIsSpeaking(speaking);
        },
        onProcessingChange: (processing) => {
          setIsProcessing(processing);
        },
        onTranscript: (text) => {
          setTranscript(text);
        },
        onError: (err) => {
          setError(err);
        },
        onVolumeChange: (volume) => {
          setVolumeLevel(volume);
        },
      });

      clientRef.current = client;
      await client.start();
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      setConnectionState('disconnected');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stop();
      clientRef.current = null;
    }
    setConnectionState('disconnected');
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setVolumeLevel(0);
  }, []);

  const startListening = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.startListening();
    }
  }, []);

  const stopListening = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stopListening();
      // Signal end of turn when user stops listening
      clientRef.current.endTurn();
    }
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (clientRef.current && text.trim()) {
      clientRef.current.sendTextMessage(text);
    }
  }, []);

  const endTurn = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.endTurn();
    }
  }, []);

  return {
    connectionState,
    isListening,
    isProcessing,
    isSpeaking,
    error,
    volumeLevel,
    transcript,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendMessage,
    endTurn,
  };
}
