import React, { createContext, useState, ReactNode } from "react";

import { noteColors } from "./theme";

interface AppState {
  data: any[];
  setData: React.Dispatch<React.SetStateAction<any[]>>;
  stickyColor: string;
  setStickyColor: React.Dispatch<React.SetStateAction<string>>;
  stickySelected: boolean;
  setStickySelected: React.Dispatch<React.SetStateAction<boolean>>;
  boards: number[];
  addBoard: () => void;
}

export const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [stickyColor, setStickyColor] = useState<string>(noteColors[0]);
  const [stickySelected, setStickySelected] = useState<boolean>(false);
  const [boards, setBoards] = useState<number[]>([0]);

  const addBoard = () => {
    setBoards((ids) => [...ids, ids.length ? Math.max(...ids) + 1 : 0]);
  };

  return (
    <AppContext.Provider value={{ data, setData, stickyColor, setStickyColor, stickySelected, setStickySelected, boards, addBoard }}>
      {children}
    </AppContext.Provider>
  );
};
