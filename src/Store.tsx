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
  codeSelected: boolean;
  setCodeSelected: React.Dispatch<React.SetStateAction<boolean>>;
  codeLanguage: string;
  setCodeLanguage: React.Dispatch<React.SetStateAction<string>>;
  codeTheme: string;
  setCodeTheme: React.Dispatch<React.SetStateAction<string>>;
  codeFontSize: number;
  setCodeFontSize: React.Dispatch<React.SetStateAction<number>>;
  boards: number[];
  setBoards: React.Dispatch<React.SetStateAction<number[]>>;
  addBoard: () => void;
  boardSelected: boolean;
  setBoardSelected: React.Dispatch<React.SetStateAction<boolean>>;
  debug: boolean;
  setDebug: React.Dispatch<React.SetStateAction<boolean>>;
  drawingMode: boolean;
  setDrawingMode: React.Dispatch<React.SetStateAction<boolean>>;
  brushWidth: number | 'auto';
  setBrushWidth: React.Dispatch<React.SetStateAction<number | 'auto'>>;
  brushColor: string;
  setBrushColor: React.Dispatch<React.SetStateAction<string>>;
  pushHistory: (state: any[]) => void;
  undo: () => void;
  redo: () => void;
  registerSerializer: (fn: () => any[]) => void;
}

export const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [stickyColor, setStickyColor] = useState<string>(noteColors[0]);
  const [stickyAlign, setStickyAlign] = useState<'left' | 'center' | 'right'>('center');
  const [stickySelected, setStickySelected] = useState<boolean>(false);
  const [codeSelected, setCodeSelected] = useState<boolean>(false);
  const [codeLanguage, setCodeLanguage] = useState<string>('typescript');
  const [codeTheme, setCodeTheme] = useState<string>('github-dark');
  const [codeFontSize, setCodeFontSize] = useState<number>(14);
  const [boards, setBoards] = useState<number[]>([]);
  const [boardSelected, setBoardSelected] = useState<boolean>(false);
  const [debug, setDebug] = useState<boolean>(false);
  const [drawingMode, setDrawingMode] = useState<boolean>(false);
  const [brushWidth, setBrushWidth] = useState<number | 'auto'>('auto');
  const [brushColor, setBrushColor] = useState<string>(noteColors[noteColors.length - 1]);

  const [past, setPast] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const serializerRef = React.useRef<() => any[]>(() => []);

  const registerSerializer = (fn: () => any[]) => {
    serializerRef.current = fn;
  };

  const pushHistory = (state: any[]) => {
    setPast((p) => [...p, JSON.stringify(state)]);
    setFuture([]);
  };

  const undo = () => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      const newPast = p.slice(0, -1);
      setFuture((f) => [...f, JSON.stringify(serializerRef.current())]);
      window.dispatchEvent(new CustomEvent('loadboard', { detail: JSON.parse(prev) }));
      return newPast;
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[f.length - 1];
      const newFuture = f.slice(0, -1);
      setPast((p) => [...p, JSON.stringify(serializerRef.current())]);
      window.dispatchEvent(new CustomEvent('loadboard', { detail: JSON.parse(next) }));
      return newFuture;
    });
  };

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

  React.useEffect(() => {
    const disable = () => setDrawingMode(false);
    window.addEventListener('createsticky', disable as EventListener);
    window.addEventListener('createcodeblock', disable as EventListener);
    window.addEventListener('createline', disable as EventListener);
    return () => {
      window.removeEventListener('createsticky', disable as EventListener);
      window.removeEventListener('createcodeblock', disable as EventListener);
      window.removeEventListener('createline', disable as EventListener);
    };
  }, []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return (
    <AppContext.Provider value={{
      data,
      setData,
      stickyColor,
      setStickyColor,
      stickyAlign,
      setStickyAlign,
      stickySelected,
      setStickySelected,
      codeSelected,
      setCodeSelected,
      codeLanguage,
      setCodeLanguage,
      codeTheme,
      setCodeTheme,
      codeFontSize,
      setCodeFontSize,
      boards,
      setBoards,
      addBoard,
      boardSelected,
      setBoardSelected,
      debug,
      setDebug,
      drawingMode,
      setDrawingMode,
      brushWidth,
      setBrushWidth,
      brushColor,
      setBrushColor,
      pushHistory,
      undo,
      redo,
      registerSerializer,
    }}>
      {children}
    </AppContext.Provider>
  );
};
