import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePomodoro } from './usePomodoro';
import type { TimerSettings } from '../types';

const settings: TimerSettings = {
  focusMinutes: 1,
  shortBreakMinutes: 1,
  longBreakMinutes: 2,
  longBreakEvery: 4,
};

function renderTimer(storageKey: string, onFocusComplete: ReturnType<typeof vi.fn>) {
  return renderHook(() =>
    usePomodoro({
      storageKey,
      settings,
      selectedTaskId: 'task-1',
      timezone: 'Asia/Shanghai',
      onFocusComplete,
      onError: vi.fn(),
    }),
  );
}

describe('usePomodoro', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-10T08:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('finishes a focus phase only once after a page is reopened', async () => {
    const storageKey = 'timer-test';
    const onFocusComplete = vi.fn().mockResolvedValue(undefined);
    const first = renderTimer(storageKey, onFocusComplete);

    await act(async () => {
      await first.result.current.start();
    });
    expect(first.result.current.state.status).toBe('running');
    first.unmount();

    vi.setSystemTime(new Date('2026-09-10T08:01:05.000Z'));
    const reopened = renderTimer(storageKey, onFocusComplete);

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(onFocusComplete).toHaveBeenCalledTimes(1);
    expect(onFocusComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-1',
        durationSeconds: 60,
        timezone: 'Asia/Shanghai',
      }),
    );
    expect(reopened.result.current.state.phase).toBe('shortBreak');

    reopened.unmount();
    renderTimer(storageKey, onFocusComplete);
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(onFocusComplete).toHaveBeenCalledTimes(1);
  });
});
