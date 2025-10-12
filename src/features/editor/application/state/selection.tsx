import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Selection } from './types';

interface SelectionContextValue {
  selection: Selection;
  setSelection: React.Dispatch<React.SetStateAction<Selection>>;
  updateSelection: (next: Partial<Selection>) => void;
}

const defaultSelection: Selection = {
  sticky: false,
  frame: false,
  code: false,
  image: false,
  board: false,
};

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selection, setSelection] = useState<Selection>(defaultSelection);

  const updateSelection = React.useCallback((next: Partial<Selection>) => {
    setSelection((prev) => ({ ...prev, ...next }));
  }, []);

  const value = useMemo(
    () => ({ selection, setSelection, updateSelection }),
    [selection, updateSelection]
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
};

export const useSelection = (): SelectionContextValue => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
};
