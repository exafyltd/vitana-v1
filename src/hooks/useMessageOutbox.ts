import { useState, useCallback, useEffect, useRef } from 'react';
import type { SendMessageArgs } from './useHybridMessages';

interface QueuedMessage extends SendMessageArgs {
  id: string;
  timestamp: number;
  actionButtons?: any[];
}

/**
 * Lightweight message outbox for queuing and retrying failed sends
 * Handles offline scenarios and network failures gracefully
 */
export function useMessageOutbox() {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [isFlushing, setIsFlushing] = useState(false);
  const sendMessageRef = useRef<((args: SendMessageArgs) => Promise<any>) | null>(null);

  // Set the send function reference
  const setSendFunction = useCallback((sendFn: (args: SendMessageArgs) => Promise<any>) => {
    sendMessageRef.current = sendFn;
  }, []);

  // Add a message to the outbox
  const addToOutbox = useCallback((message: SendMessageArgs & { actionButtons?: any[] }) => {
    const queuedMessage: QueuedMessage = {
      ...message,
      id: `queued-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    
    setQueue(prev => [...prev, queuedMessage]);
    console.log('📦 Message queued for retry:', queuedMessage.id);
    
    return queuedMessage.id;
  }, []);

  // Flush the outbox - attempt to send all queued messages
  const flush = useCallback(async () => {
    if (isFlushing || queue.length === 0 || !sendMessageRef.current) {
      return;
    }

    console.log('🔄 Flushing outbox with', queue.length, 'messages');
    setIsFlushing(true);

    const messagesToSend = [...queue];
    const failedMessages: QueuedMessage[] = [];

    for (const message of messagesToSend) {
      try {
        await sendMessageRef.current({
          context: message.context,
          threadId: message.threadId,
          content: message.content,
          type: message.type,
          contentData: message.contentData,
          recipientId: message.recipientId,
          parentMessageId: message.parentMessageId,
        });
        
        console.log('✅ Queued message sent successfully:', message.id);
      } catch (error) {
        console.error('❌ Failed to send queued message:', message.id, error);
        failedMessages.push(message);
      }
    }

    // Update queue to only contain failed messages
    setQueue(failedMessages);
    setIsFlushing(false);

    if (failedMessages.length === 0) {
      console.log('✅ All queued messages sent successfully');
    } else {
      console.log('⚠️', failedMessages.length, 'messages still in queue');
    }
  }, [isFlushing, queue]);

  // Auto-flush when coming back online
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network restored, flushing outbox');
      flush();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [flush]);

  // Clear a specific message from the queue
  const removeFromOutbox = useCallback((messageId: string) => {
    setQueue(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  return {
    queue,
    queueLength: queue.length,
    isFlushing,
    addToOutbox,
    flush,
    removeFromOutbox,
    setSendFunction,
  };
}
