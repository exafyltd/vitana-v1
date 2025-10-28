import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { VTIDMetadata, ActiveVTIDContext as IActiveVTIDContext } from '@/types/command-hub';

const ActiveVTIDContext = createContext<IActiveVTIDContext | undefined>(undefined);

const STORAGE_KEY = 'dev_active_vtid';

export function ActiveVTIDProvider({ children }: { children: ReactNode }) {
  const [activeVTID, setActiveVTIDState] = useState<VTIDMetadata | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (activeVTID) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeVTID));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeVTID]);

  const setActiveVTID = (vtid: VTIDMetadata | null) => {
    setActiveVTIDState(vtid);
  };

  const clearVTID = () => {
    setActiveVTIDState(null);
  };

  return (
    <ActiveVTIDContext.Provider value={{ activeVTID, setActiveVTID, clearVTID }}>
      {children}
    </ActiveVTIDContext.Provider>
  );
}

export function useActiveVTID() {
  const context = useContext(ActiveVTIDContext);
  if (!context) {
    throw new Error('useActiveVTID must be used within ActiveVTIDProvider');
  }
  return context;
}
