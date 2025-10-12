import React, { createContext, useContext, useMemo, useState } from 'react';

export type FrameLineStyle = 'solid' | 'dashed' | 'dotted';

interface FrameContextValue {
  frameColor: string;
  setFrameColor: React.Dispatch<React.SetStateAction<string>>;
  frameLineStyle: FrameLineStyle;
  setFrameLineStyle: React.Dispatch<React.SetStateAction<FrameLineStyle>>;
}

const FrameContext = createContext<FrameContextValue | undefined>(undefined);

export const FrameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [frameColor, setFrameColor] = useState<string>('#ffffff');
  const [frameLineStyle, setFrameLineStyle] = useState<FrameLineStyle>('solid');

  const value = useMemo(
    () => ({ frameColor, setFrameColor, frameLineStyle, setFrameLineStyle }),
    [frameColor, frameLineStyle]
  );

  return <FrameContext.Provider value={value}>{children}</FrameContext.Provider>;
};

export const useFrame = (): FrameContextValue => {
  const context = useContext(FrameContext);
  if (!context) {
    throw new Error('useFrame must be used within a FrameProvider');
  }
  return context;
};
