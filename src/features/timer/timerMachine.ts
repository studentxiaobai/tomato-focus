import type { TimerPhase, TimerSettings, TimerStatus } from '../../types';

export interface TimerState {
  version: 1;
  phase: TimerPhase;
  status: TimerStatus;
  durationSeconds: number;
  remainingSeconds: number;
  endsAt: string | null;
  completedFocusCount: number;
  sessionId: string;
}

export function phaseDurationSeconds(phase: TimerPhase, settings: TimerSettings): number {
  if (phase === 'focus') return Math.max(1, settings.focusMinutes) * 60;
  if (phase === 'shortBreak') return Math.max(1, settings.shortBreakMinutes) * 60;
  return Math.max(1, settings.longBreakMinutes) * 60;
}

export function phaseLabel(phase: TimerPhase): string {
  if (phase === 'focus') return '专注';
  if (phase === 'shortBreak') return '短休息';
  return '长休息';
}

export function createTimerState(
  settings: TimerSettings,
  phase: TimerPhase = 'focus',
  completedFocusCount = 0,
  sessionId: string = crypto.randomUUID(),
): TimerState {
  const durationSeconds = phaseDurationSeconds(phase, settings);
  return {
    version: 1,
    phase,
    status: 'idle',
    durationSeconds,
    remainingSeconds: durationSeconds,
    endsAt: null,
    completedFocusCount,
    sessionId,
  };
}

export function syncIdleSettings(state: TimerState, settings: TimerSettings): TimerState {
  if (state.status !== 'idle') return state;
  const durationSeconds = phaseDurationSeconds(state.phase, settings);
  if (durationSeconds === state.durationSeconds) return state;
  return { ...state, durationSeconds, remainingSeconds: durationSeconds };
}

export function transitionAfterCompletion(state: TimerState, settings: TimerSettings): TimerState {
  if (state.phase === 'focus') {
    const completedFocusCount = state.completedFocusCount + 1;
    const nextPhase: TimerPhase =
      completedFocusCount % Math.max(1, settings.longBreakEvery) === 0 ? 'longBreak' : 'shortBreak';
    return createTimerState(settings, nextPhase, completedFocusCount, state.sessionId);
  }
  return createTimerState(settings, 'focus', state.completedFocusCount);
}

export function transitionAfterSkip(state: TimerState, settings: TimerSettings): TimerState {
  if (state.phase === 'focus') {
    return createTimerState(settings, 'shortBreak', state.completedFocusCount, state.sessionId);
  }
  return createTimerState(settings, 'focus', state.completedFocusCount);
}

export function progressRatio(state: TimerState): number {
  if (state.durationSeconds <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - state.remainingSeconds / state.durationSeconds));
}

