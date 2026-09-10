export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
}

export interface Profile {
  id: string;
  displayName: string;
  timezone: string;
  settings: TimerSettings;
  backgroundPath: string | null;
  backgroundUrl: string | null;
}

export interface Task {
  id: string;
  title: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  isCompleted: boolean;
  position: number;
  createdAt: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  storagePath: string;
  sortOrder: number;
  durationSeconds: number | null;
  signedUrl: string;
  isDemo?: boolean;
}

export interface StudyTrendPoint {
  date: string;
  seconds: number;
}

export interface StudyStats {
  totalSeconds: number;
  todaySeconds: number;
  weekSeconds: number;
  completedPomodoros: number;
  trend: StudyTrendPoint[];
}

export interface WorkspaceData {
  profile: Profile;
  tasks: Task[];
  tracks: MusicTrack[];
  stats: StudyStats;
}

export interface FocusCompletion {
  id: string;
  taskId: string | null;
  durationSeconds: number;
  completedAt: string;
  timezone: string;
}
