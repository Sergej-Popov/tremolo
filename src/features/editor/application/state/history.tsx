import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import { HistoryManager } from '@core/history';
import type { HistoryEntry } from './types';
import { useHistoryBridge } from './hooks/useHistoryBridge';

interface HistoryContextValue {
  pushHistory: (snapshot: unknown[], type?: string, action?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  registerSnapshotProvider: (fn: () => unknown[]) => void;
  getSnapshot: () => unknown[];
  past: HistoryEntry[];
  future: HistoryEntry[];
}

const HistoryContext = createContext<HistoryContextValue | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const managerRef = useRef(new HistoryManager());
  const snapshotProviderRef = useRef<() => unknown[]>(() => []);
  const [version, setVersion] = useState(0);
  const applyHistoryEntry = useHistoryBridge();

  const sync = React.useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  const pushHistory = React.useCallback(
    (snapshot: unknown[], type?: string, action?: string) => {
      managerRef.current.push(snapshot, { type, action });
      sync();
    },
    [sync]
  );

  const undo = React.useCallback(() => {
    const entry = managerRef.current.undo();
    if (entry) {
      applyHistoryEntry(entry);
    }
    sync();
  }, [applyHistoryEntry, sync]);

  const redo = React.useCallback(() => {
    const entry = managerRef.current.redo();
    if (entry) {
      applyHistoryEntry(entry);
    }
    sync();
  }, [applyHistoryEntry, sync]);

  const registerSnapshotProvider = React.useCallback((fn: () => unknown[]) => {
    snapshotProviderRef.current = fn;
  }, []);

  const getSnapshot = React.useCallback(() => snapshotProviderRef.current(), []);

  const past = React.useMemo(() => managerRef.current.getPast(), [version]);
  const future = React.useMemo(() => managerRef.current.getFuture(), [version]);
  const canUndo = managerRef.current.canUndo();
  const canRedo = managerRef.current.canRedo();

  const value = useMemo(
    () => ({
      pushHistory,
      undo,
      redo,
      canUndo,
      canRedo,
      registerSnapshotProvider,
      getSnapshot,
      past,
      future,
    }),
    [pushHistory, undo, redo, canUndo, canRedo, registerSnapshotProvider, getSnapshot, past, future]
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
};

export const useHistory = (): HistoryContextValue => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};
