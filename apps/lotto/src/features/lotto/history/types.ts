export type DrawRecord = {
  id: string;
  drawnAt: string; // ISO-8601 UTC
  mainNumbers: [number, number, number, number, number, number];
  bonusNumber: number;
};

export type DrawHistoryRepository = {
  list(now: Date): DrawRecord[];
  save(record: DrawRecord, now: Date): DrawRecord[];
  clear(): void;
  persistence: 'local' | 'memory';
};
