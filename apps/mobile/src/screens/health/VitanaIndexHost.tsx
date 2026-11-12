/**
 * The app-wide home of the Vitana Index sheet. The sheet listens for the
 * `vitana:open-index` bus event, and the Index card in Talk to Vitana (and any
 * other surface) emits that event. It used to be mounted only by HealthScreen,
 * so on every other screen nothing listened and the card's button fell through
 * to an unported web path. The signed-in layout mounts it here once; HealthScreen
 * then leaves its own copy out (`VitanaIndexSheetUnlessHosted`) so the event
 * never opens two sheets.
 */
import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import { VitanaIndexSheet } from './VitanaIndexSheet';

const HostedContext = createContext(false);

export function VitanaIndexHost({ children }: { children: ReactNode }): ReactElement {
  return (
    <HostedContext.Provider value={true}>
      {children}
      <VitanaIndexSheet />
    </HostedContext.Provider>
  );
}

/** Mounts the sheet only where no app-wide host is above it (standalone renders, tests). */
export function VitanaIndexSheetUnlessHosted(): ReactElement | null {
  const hosted = useContext(HostedContext);
  return hosted ? null : <VitanaIndexSheet />;
}
