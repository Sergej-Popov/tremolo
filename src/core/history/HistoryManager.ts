import type { HistoryEntry, HistoryMeta } from './types';

const serialize = (snapshot: unknown[]): string => JSON.stringify(snapshot);

export class HistoryManager {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private present: HistoryEntry | null = null;

  push(snapshot: unknown[], meta: HistoryMeta = {}): void {
    const state = serialize(snapshot);
    if (this.present && this.present.state === state) {
      if (meta.type || meta.action) {
        this.present = {
          state: this.present.state,
          type: meta.type ?? this.present.type,
          action: meta.action ?? this.present.action,
        };
      }
      return;
    }
    if (this.present) {
      this.past = [...this.past, this.present];
    }
    this.present = { state, type: meta.type, action: meta.action };
    this.future = [];
  }

  undo(): HistoryEntry | null {
    if (!this.canUndo()) {
      return null;
    }
    if (this.present) {
      this.future = [...this.future, this.present];
    }
    const previous = this.past[this.past.length - 1] ?? null;
    this.past = this.past.slice(0, -1);
    this.present = previous;
    return this.present;
  }

  redo(): HistoryEntry | null {
    if (!this.canRedo()) {
      return null;
    }
    const next = this.future[this.future.length - 1] ?? null;
    if (next) {
      if (this.present) {
        this.past = [...this.past, this.present];
      }
      this.future = this.future.slice(0, -1);
    }
    this.present = next;
    return this.present;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  getPast(): HistoryEntry[] {
    return [...this.past];
  }

  getFuture(): HistoryEntry[] {
    return [...this.future];
  }
}
