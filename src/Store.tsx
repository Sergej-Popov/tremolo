import React, { createContext, useState, ReactNode } from "react";
import { setDebugMode } from './d3-ext';

import { noteColors } from "./theme";

interface AppState {
  data: any[];
  setData: React.Dispatch<React.SetStateAction<any[]>>;
  stickyColor: string;
  setStickyColor: React.Dispatch<React.SetStateAction<string>>;
  stickyAlign: 'left' | 'center' | 'right';
  setStickyAlign: React.Dispatch<React.SetStateAction<'left' | 'center' | 'right'>>;
  stickySelected: boolean;
  setStickySelected: React.Dispatch<React.SetStateAction<boolean>>;
  boards: number[];
  addBoard: () => void;
  debug: boolean;
  setDebug: React.Dispatch<React.SetStateAction<boolean>>;
  drawingMode: boolean;
  setDrawingMode: React.Dispatch<React.SetStateAction<boolean>>;
  brushWidth: number | 'auto';
  setBrushWidth: React.Dispatch<React.SetStateAction<number | 'auto'>>;
}

export const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [stickyColor, setStickyColor] = useState<string>(noteColors[0]);
  const [stickyAlign, setStickyAlign] = useState<'left' | 'center' | 'right'>('center');
  const [stickySelected, setStickySelected] = useState<boolean>(false);
  const [boards, setBoards] = useState<number[]>([0]);
  const [debug, setDebug] = useState<boolean>(false);
  const [drawingMode, setDrawingMode] = useState<boolean>(false);
  const [brushWidth, setBrushWidth] = useState<number | 'auto'>('auto');

  const addBoard = () => {
    setBoards((ids) => [...ids, ids.length ? Math.max(...ids) + 1 : 0]);
  };

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'd') {
        setDebug((prev) => !prev);
      }
      if (e.key === 'b') {
        setDrawingMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  React.useEffect(() => {
    setDebugMode(debug);
  }, [debug]);

  return (
    <AppContext.Provider value={{ data, setData, stickyColor, setStickyColor, stickyAlign, setStickyAlign, stickySelected, setStickySelected, boards, addBoard, debug, setDebug, drawingMode, setDrawingMode, brushWidth, setBrushWidth }}>
      {children}
    </AppContext.Provider>
  );
};
