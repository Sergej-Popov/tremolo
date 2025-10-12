export type Tool = 'select' | 'draw' | 'frame';

export interface Selection {
  sticky: boolean;
  frame: boolean;
  code: boolean;
  image: boolean;
  board: boolean;
}

export interface HistoryMeta {
  type?: string;
  action?: string;
}

export interface HistoryEntry extends HistoryMeta {
  state: string;
}

export interface ImageBackgroundSettings {
  removed: boolean;
  tolerance: number | null;
  feather: number;
  color: string | null;
}
