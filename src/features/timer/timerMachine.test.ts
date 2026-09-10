import { describe, expect, it } from 'vitest';
import {
  createTimerState,
  phaseDurationSeconds,
  progressRatio,
  syncIdleSettings,
  transitionAfterCompletion,
  transitionAfterSkip,
} from './timerMachine';
import type { TimerSettings } from '../../types';

const settings: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
};

describe('timerMachine', () => {
  it('uses configured durations for each phase', () => {
    expect(phaseDurationSeconds('focus', settings)).toBe(1500);
    expect(phaseDurationSeconds('shortBreak', settings)).toBe(300);
    expect(phaseDurationSeconds('longBreak', settings)).toBe(900);
  });

  it('moves from focus to a long break after the configured interval', () => {
    let state = createTimerState(settings);
    for (let count = 1; count <= 3; count += 1) {
      state = transitionAfterCompletion(state, settings);
      expect(state.phase).toBe('shortBreak');
      state = transitionAfterCompletion(state, settings);
      expect(state.phase).toBe('focus');
    }state = transitionAfterCompletion(state, settings);
    expect(state.phase).toBe('longBreak');
    expect(state.completedFocusCount).toBe(4);
  });

  it('skips focus without increasing completed sessions', () => {
    const state = createTimerState(settings, 'focus', 2, 'session-id');
    const next = transitionAfterSkip(state, settings);
    expect(next.phase).toBe('shortBreak');
    expect(next.completedFocusCount).toBe(2);
  });

  it('updates duration only while idle', () => {
    const idle = createTimerState(settings);
    const changed = syncIdleSettings(idle, { ...settings, focusMinutes: 40 });
    expect(changed.remainingSeconds).toBe(2400);

    const running = { ...idle, status: 'running' as const, endsAt: new Date().toISOString() };
    expect(syncIdleSettings(running, { ...settings, focusMinutes: 40 })).toBe(running);
  });

  it('calculates progress and clamps it', () => {
    const state = { ...createTimerState(settings), remainingSeconds: 750 };
    expect(progressRatio(state)).toBe(0.5);
    expect(progressRatio({ ...state, remainingSeconds: 0 })).toBe(1);
    expect(progressRatio({ ...state, remainingSeconds: 2000 })).toBe(0);
  });
});
