import React from 'react';
import { eventBus } from '../../services/EventBus';
import type { HistoryEntry } from '../types';

type HistoryEventDetail = { items: unknown[]; fromHistory: true };

export const useHistoryBridge = () => {
  return React.useCallback((entry: HistoryEntry | null) => {
    if (!entry) return;
    let items: unknown[];
    try {
      const parsed = JSON.parse(entry.state);
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      items = [];
    }
    eventBus.dispatch<HistoryEventDetail>('loadboard', { items, fromHistory: true });
  }, []);
};
