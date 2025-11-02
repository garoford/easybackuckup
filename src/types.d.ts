export interface ElectronAPI {
  systemCheck: () => Promise<SystemCheckResult>;
  snapshotsList: (target: string) => Promise<BtrfsSnapshot[]>;
  snapshotsCreate: (rootTarget: string, homeTarget: string, prefix: string) => Promise<SnapshotCreateResult>;
  snapshotsRestore: (rootSnapshotPath: string) => Promise<RestoreResult>;
  snapshotsDelete: (snapshotPath: string) => Promise<{ ok: boolean; error?: string }>;
  configGet: () => Promise<AppConfig>;
  configSet: (config: Partial<AppConfig>) => Promise<boolean>;
  configReset: () => Promise<AppConfig>;
  timersEnable: (schedule: string, retention: TimerRetention, rootTarget: string, homeTarget: string, prefix: string) => Promise<{ ok: boolean; error?: string }>;
  timersDisable: () => Promise<{ ok: boolean; error?: string }>;
  timersStatus: () => Promise<TimerStatus>;
  logsGet: () => Promise<string>;
  logsClear: () => Promise<boolean>;
}

export interface AppConfig {
  rootTarget: string;
  homeTarget: string;
  prefix: string;
  exclusions: string[];
  timer: {
    enabled: boolean;
    schedule: 'hourly' | 'daily' | 'weekly';
    retention: TimerRetention;
  };
}

export interface TimerRetention {
  type: 'count' | 'age';
  value: number;
}

export interface BtrfsSnapshot {
  path: string;
  name: string;
  type: 'root' | 'home';
  timestamp: Date;
  readonly: boolean;
}

export interface SystemCheckResult {
  btrfsOk: boolean;
  subvols: {
    root: boolean;
    home: boolean;
  };
  space: {
    free: string;
    used: string;
    total: string;
  };
  timers?: TimerStatus;
  error?: string;
}

export interface SnapshotCreateResult {
  ok: boolean;
  logs: string[];
  rootName?: string;
  homeName?: string;
  error?: string;
}

export interface RestoreResult {
  ok: boolean;
  logs: string[];
  note: string;
  error?: string;
}

export interface TimerStatus {
  enabled: boolean;
  active: boolean;
  lastRun?: string;
  nextRun?: string;
  status: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
