export type Tool = 'select' | 'draw' | 'frame';

export interface Selection {
  sticky: boolean;
  frame: boolean;
  code: boolean;
  image: boolean;
  board: boolean;
}

export type { HistoryEntry, HistoryMeta } from '@core/history';

export interface ImageBackgroundSettings {
  removed: boolean;
  tolerance: number | null;
  feather: number;
  color: string | null;
}
