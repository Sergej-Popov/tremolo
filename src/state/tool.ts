import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Tool } from './types';

interface ToolContextValue {
  tool: Tool;
  setTool: React.Dispatch<React.SetStateAction<Tool>>;
}

const ToolContext = createContext<ToolContextValue | undefined>(undefined);

export const ToolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tool, setTool] = useState<Tool>('select');

  const value = useMemo(() => ({ tool, setTool }), [tool]);

  return <ToolContext.Provider value={value}>{children}</ToolContext.Provider>;
};

export const useTool = (): ToolContextValue => {
  const context = useContext(ToolContext);
  if (!context) {
    throw new Error('useTool must be used within a ToolProvider');
  }
  return context;
};
