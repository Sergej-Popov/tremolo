export interface HistoryMeta {
  type?: string;
  action?: string;
}

export interface HistoryEntry extends HistoryMeta {
  state: string;
}
