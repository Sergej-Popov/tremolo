import React, { createContext, useContext, useMemo, useState } from 'react';
import { noteColors } from '@shared/constants';

export type BrushWidth = number | 'auto';

interface DrawingContextValue {
  brushWidth: BrushWidth;
  setBrushWidth: React.Dispatch<React.SetStateAction<BrushWidth>>;
  brushColor: string;
  setBrushColor: React.Dispatch<React.SetStateAction<string>>;
}

const DrawingContext = createContext<DrawingContextValue | undefined>(undefined);

export const DrawingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brushWidth, setBrushWidth] = useState<BrushWidth>('auto');
  const [brushColor, setBrushColor] = useState<string>(noteColors[noteColors.length - 1]);

  const value = useMemo(
    () => ({ brushWidth, setBrushWidth, brushColor, setBrushColor }),
    [brushWidth, brushColor]
  );

  return <DrawingContext.Provider value={value}>{children}</DrawingContext.Provider>;
};

export const useDrawing = (): DrawingContextValue => {
  const context = useContext(DrawingContext);
  if (!context) {
    throw new Error('useDrawing must be used within a DrawingProvider');
  }
  return context;
};
