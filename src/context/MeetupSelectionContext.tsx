import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface MeetupSelectionContextType {
  selectedMeetupId: string | null;
  selectMeetup: (id: string | null) => void;
  toggleMeetup: (id: string) => void;
  clearSelection: () => void;
}

const MeetupSelectionContext = createContext<MeetupSelectionContextType | undefined>(undefined);

export const MeetupSelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedMeetupId, setSelectedMeetupId] = useState<string | null>(null);

  const selectMeetup = useCallback((id: string | null) => {
    setSelectedMeetupId(id);
  }, []);

  const toggleMeetup = useCallback((id: string) => {
    setSelectedMeetupId(prev => prev === id ? null : id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMeetupId(null);
  }, []);

  return (
    <MeetupSelectionContext.Provider value={{ selectedMeetupId, selectMeetup, toggleMeetup, clearSelection }}>
      {children}
    </MeetupSelectionContext.Provider>
  );
};

export const useMeetupSelection = () => {
  const context = useContext(MeetupSelectionContext);
  if (context === undefined) {
    throw new Error('useMeetupSelection must be used within a MeetupSelectionProvider');
  }
  return context;
};
