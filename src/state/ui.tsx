import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { noteColors } from '../constants/theme';
import { setDebugMode } from '../d3-ext';

export type StickyAlign = 'left' | 'center' | 'right';

interface UIContextValue {
  stickyColor: string;
  setStickyColor: React.Dispatch<React.SetStateAction<string>>;
  stickyAlign: StickyAlign;
  setStickyAlign: React.Dispatch<React.SetStateAction<StickyAlign>>;
  debug: boolean;
  setDebug: React.Dispatch<React.SetStateAction<boolean>>;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stickyColor, setStickyColor] = useState<string>(noteColors[0]);
  const [stickyAlign, setStickyAlign] = useState<StickyAlign>('center');
  const [debug, setDebug] = useState<boolean>(false);

  useEffect(() => {
    setDebugMode(debug);
  }, [debug]);

  const value = useMemo(
    () => ({ stickyColor, setStickyColor, stickyAlign, setStickyAlign, debug, setDebug }),
    [stickyColor, stickyAlign, debug]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = (): UIContextValue => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
