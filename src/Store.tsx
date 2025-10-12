import React, { createContext, useState, ReactNode } from "react";
import { setDebugMode, defaultBackgroundFeather } from './d3-ext';

import { noteColors } from "./theme";

export type FrameLineStyle = 'solid' | 'dashed' | 'dotted';

export interface HistoryEntry {
  state: string;
  type?: string;
  action?: string;
}

interface AppState {
  data: any[];
  setData: React.Dispatch<React.SetStateAction<any[]>>;
  stickyColor: string;
  setStickyColor: React.Dispatch<React.SetStateAction<string>>;
  frameColor: string;
  setFrameColor: React.Dispatch<React.SetStateAction<string>>;
  frameLineStyle: FrameLineStyle;
  setFrameLineStyle: React.Dispatch<React.SetStateAction<FrameLineStyle>>;
  stickyAlign: 'left' | 'center' | 'right';
  setStickyAlign: React.Dispatch<React.SetStateAction<'left' | 'center' | 'right'>>;
  stickySelected: boolean;
  setStickySelected: React.Dispatch<React.SetStateAction<boolean>>;
  frameSelected: boolean;
  setFrameSelected: React.Dispatch<React.SetStateAction<boolean>>;
  codeSelected: boolean;
  setCodeSelected: React.Dispatch<React.SetStateAction<boolean>>;
  imageSelected: boolean;
  setImageSelected: React.Dispatch<React.SetStateAction<boolean>>;
  imageBackgroundRemoved: boolean;
  setImageBackgroundRemoved: React.Dispatch<React.SetStateAction<boolean>>;
  imageBackgroundTolerance: number | null;
  setImageBackgroundTolerance: React.Dispatch<React.SetStateAction<number | null>>;
  imageBackgroundFeather: number;
  setImageBackgroundFeather: React.Dispatch<React.SetStateAction<number>>;
  imageBackgroundColor: string | null;
  setImageBackgroundColor: React.Dispatch<React.SetStateAction<string | null>>;
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
  frameMode: boolean;
  setFrameMode: React.Dispatch<React.SetStateAction<boolean>>;
  brushWidth: number | 'auto';
  setBrushWidth: React.Dispatch<React.SetStateAction<number | 'auto'>>;
  brushColor: string;
  setBrushColor: React.Dispatch<React.SetStateAction<string>>;
  past: HistoryEntry[];
  future: HistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
  pushHistory: (state: any[], type?: string, action?: string) => void;
  undo: () => void;
  redo: () => void;
  registerSerializer: (fn: () => any[]) => void;
  getSnapshot: () => any[];
}

export const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [stickyColor, setStickyColor] = useState<string>(noteColors[0]);
  const [frameColor, setFrameColor] = useState<string>('#ffffff');
  const [frameLineStyle, setFrameLineStyle] = useState<FrameLineStyle>('solid');
  const [stickyAlign, setStickyAlign] = useState<'left' | 'center' | 'right'>('center');
  const [stickySelected, setStickySelected] = useState<boolean>(false);
  const [frameSelected, setFrameSelected] = useState<boolean>(false);
  const [codeSelected, setCodeSelected] = useState<boolean>(false);
  const [imageSelected, setImageSelected] = useState<boolean>(false);
  const [imageBackgroundRemoved, setImageBackgroundRemoved] = useState<boolean>(false);
  const [imageBackgroundTolerance, setImageBackgroundTolerance] = useState<number | null>(null);
  const [imageBackgroundFeather, setImageBackgroundFeather] = useState<number>(defaultBackgroundFeather);
  const [imageBackgroundColor, setImageBackgroundColor] = useState<string | null>(null);
  const [codeLanguage, setCodeLanguage] = useState<string>('typescript');
  const [codeTheme, setCodeTheme] = useState<string>('github-dark');
  const [codeFontSize, setCodeFontSize] = useState<number>(14);
  const [boards, setBoards] = useState<number[]>([]);
  const [boardSelected, setBoardSelected] = useState<boolean>(false);
  const [debug, setDebug] = useState<boolean>(false);
  const [drawingMode, setDrawingMode] = useState<boolean>(false);
  const [frameMode, setFrameMode] = useState<boolean>(false);
  const [brushWidth, setBrushWidth] = useState<number | 'auto'>('auto');
  const [brushColor, setBrushColor] = useState<string>(noteColors[noteColors.length - 1]);

  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const serializerRef = React.useRef<() => any[]>(() => []);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const registerSerializer = (fn: () => any[]) => {
    serializerRef.current = fn;
  };

  const getSnapshot = () => serializerRef.current();

  const pushHistory = (state: any[], type?: string, action?: string) => {
    const snapshot = JSON.stringify(state);
    setPast((p) => {
      if (p.length && p[p.length - 1].state === snapshot) return p;
      return [...p, { state: snapshot, type, action }];
    });
    setFuture([]);
  };

  const undo = () => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      const newPast = p.slice(0, -1);
      const current = JSON.stringify(serializerRef.current());
      setFuture((f) => {
        if (f.length && f[f.length - 1].state === current) return f;
        return [...f, { state: current, type: prev.type, action: prev.action }];
      });
      window.dispatchEvent(new CustomEvent('loadboard', { detail: { items: JSON.parse(prev.state), fromHistory: true } }));
      return newPast;
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[f.length - 1];
      const newFuture = f.slice(0, -1);
      const current = JSON.stringify(serializerRef.current());
      setPast((p) => {
        if (p.length && p[p.length - 1].state === current) return p;
        return [...p, { state: current, type: next.type, action: next.action }];
      });
      window.dispatchEvent(new CustomEvent('loadboard', { detail: { items: JSON.parse(next.state), fromHistory: true } }));
      return newFuture;
    });
  };

  const addBoard = () => {
    setBoards((ids) => [...ids, ids.length ? Math.max(...ids) + 1 : 0]);
  };

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        setDebug((prev) => !prev);
        e.preventDefault();
        return;
      }
      if (e.key === 'b') {
        setFrameMode(false);
        setDrawingMode((prev) => !prev);
      }
      if (e.key === 'f') {
        setDrawingMode(false);
        setFrameMode((prev) => !prev);
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
    const disable = () => setFrameMode(false);
    window.addEventListener('createsticky', disable as EventListener);
    window.addEventListener('createcodeblock', disable as EventListener);
    window.addEventListener('createline', disable as EventListener);
    window.addEventListener('createboard', disable as EventListener);
    return () => {
      window.removeEventListener('createsticky', disable as EventListener);
      window.removeEventListener('createcodeblock', disable as EventListener);
      window.removeEventListener('createline', disable as EventListener);
      window.removeEventListener('createboard', disable as EventListener);
    };
  }, []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
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
      frameColor,
      setFrameColor,
      frameLineStyle,
      setFrameLineStyle,
      stickyAlign,
      setStickyAlign,
      stickySelected,
      setStickySelected,
      frameSelected,
      setFrameSelected,
      codeSelected,
      setCodeSelected,
      imageSelected,
      setImageSelected,
      imageBackgroundRemoved,
      setImageBackgroundRemoved,
      imageBackgroundTolerance,
      setImageBackgroundTolerance,
      imageBackgroundFeather,
      setImageBackgroundFeather,
      imageBackgroundColor,
      setImageBackgroundColor,
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
      frameMode,
      setFrameMode,
      brushWidth,
      setBrushWidth,
      brushColor,
      setBrushColor,
      past,
      future,
      canUndo,
      canRedo,
      pushHistory,
      undo,
      redo,
      registerSerializer,
      getSnapshot,
    }}>
      {children}
    </AppContext.Provider>
  );
};
