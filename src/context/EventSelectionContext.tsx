import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface EventSelectionContextType {
  selectedEventId: string | null;
  selectEvent: (id: string | null) => void;
  toggleEvent: (id: string) => void;
  clearSelection: () => void;
}

const EventSelectionContext = createContext<EventSelectionContextType | undefined>(undefined);

export const EventSelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const selectEvent = useCallback((id: string | null) => {
    setSelectedEventId(id);
  }, []);

  const toggleEvent = useCallback((id: string) => {
    setSelectedEventId(prev => prev === id ? null : id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  return (
    <EventSelectionContext.Provider value={{ selectedEventId, selectEvent, toggleEvent, clearSelection }}>
      {children}
    </EventSelectionContext.Provider>
  );
};

export const useEventSelection = () => {
  const context = useContext(EventSelectionContext);
  if (context === undefined) {
    throw new Error('useEventSelection must be used within an EventSelectionProvider');
  }
  return context;
};
