import React, { createContext, useContext, useMemo, useState } from 'react';

interface BoardsContextValue {
  data: unknown[];
  setData: React.Dispatch<React.SetStateAction<unknown[]>>;
  boards: number[];
  setBoards: React.Dispatch<React.SetStateAction<number[]>>;
  addBoard: () => void;
}

const BoardsContext = createContext<BoardsContextValue | undefined>(undefined);

export const BoardsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<unknown[]>([]);
  const [boards, setBoards] = useState<number[]>([]);

  const addBoard = React.useCallback(() => {
    setBoards((ids) => {
      const nextId = ids.length ? Math.max(...ids) + 1 : 0;
      return [...ids, nextId];
    });
  }, []);

  const value = useMemo(
    () => ({ data, setData, boards, setBoards, addBoard }),
    [data, boards, addBoard]
  );

  return <BoardsContext.Provider value={value}>{children}</BoardsContext.Provider>;
};

export const useBoards = (): BoardsContextValue => {
  const context = useContext(BoardsContext);
  if (!context) {
    throw new Error('useBoards must be used within a BoardsProvider');
  }
  return context;
};
