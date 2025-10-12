import React, { createContext, useContext, useMemo, useState } from 'react';
import { defaultBackgroundFeather } from '../d3-ext';
import type { ImageBackgroundSettings } from './types';

interface ImageContextValue {
  background: ImageBackgroundSettings;
  setBackground: React.Dispatch<React.SetStateAction<ImageBackgroundSettings>>;
  setBackgroundRemoved: (value: boolean) => void;
  setBackgroundTolerance: (value: number | null) => void;
  setBackgroundFeather: (value: number) => void;
  setBackgroundColor: (value: string | null) => void;
}

const initialBackground: ImageBackgroundSettings = {
  removed: false,
  tolerance: null,
  feather: defaultBackgroundFeather,
  color: null,
};

const ImageContext = createContext<ImageContextValue | undefined>(undefined);

export const ImageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [background, setBackground] = useState<ImageBackgroundSettings>(initialBackground);

  const setBackgroundRemoved = React.useCallback((value: boolean) => {
    setBackground((prev) => ({ ...prev, removed: value }));
  }, []);

  const setBackgroundTolerance = React.useCallback((value: number | null) => {
    setBackground((prev) => ({ ...prev, tolerance: value }));
  }, []);

  const setBackgroundFeather = React.useCallback((value: number) => {
    setBackground((prev) => ({ ...prev, feather: value }));
  }, []);

  const setBackgroundColor = React.useCallback((value: string | null) => {
    setBackground((prev) => ({ ...prev, color: value }));
  }, []);

  const value = useMemo(
    () => ({
      background,
      setBackground,
      setBackgroundRemoved,
      setBackgroundTolerance,
      setBackgroundFeather,
      setBackgroundColor,
    }),
    [background, setBackgroundRemoved, setBackgroundTolerance, setBackgroundFeather, setBackgroundColor]
  );

  return <ImageContext.Provider value={value}>{children}</ImageContext.Provider>;
};

export const useImage = (): ImageContextValue => {
  const context = useContext(ImageContext);
  if (!context) {
    throw new Error('useImage must be used within an ImageProvider');
  }
  return context;
};
