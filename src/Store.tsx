import React, { createContext, useState, ReactNode } from "react";

interface AppState {
  data: any[];
  setData: React.Dispatch<React.SetStateAction<any[]>>;
}

export const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<any[]>([]);

  return (
    <AppContext.Provider value={{ data, setData }}>
      {children}
    </AppContext.Provider>
  );
};
