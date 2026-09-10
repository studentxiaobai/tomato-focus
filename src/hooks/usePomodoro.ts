import { useCallback, useEffect, useRef, useState } from 'react';
import { playCompletionTone, requestNotificationPermission, showCompletionNotification } from '../lib/alerts';
import type { FocusCompletion, TimerSettings } from '../types';
import {
  createTimerState,
  phaseDurationSeconds,
  progressRatio,
  syncIdleSettings,
  transitionAfterCompletion,
  transitionAfterSkip,
  type TimerState,
} from '../features/timer/timerMachine';

interface UsePomodoroOptions {
  storageKey: string;
  settings: TimerSettings;
  selectedTaskId: string | null;
  timezone: string;
  onFocusComplete: (completion: FocusCompletion) => Promise<void> | void;
  onError: (message: string) => void;
}

function loadPersistedState(storageKey: string, settings: TimerSettings): TimerState {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return createTimerState(settings);
    const parsed = JSON.parse(raw) as TimerState;
    if (parsed.version !== 1 || !['focus', 'shortBreak', 'longBreak'].includes(parsed.phase)) {
      return createTimerState(settings);
    }
    return parsed;
  } catch {
    return createTimerState(settings);
  }
}

export function usePomodoro({
  storageKey,
  settings,
  selectedTaskId,
  timezone,
  onFocusComplete,
  onError,
}: UsePomodoroOptions) {
  const [state, setState] = useState<TimerState>(() => loadPersistedState(storageKey, settings));
  const stateRef = useRef(state);
  const settingsRef = useRef(settings);
  const selectedTaskRef = useRef(selectedTaskId);
  const completionHandlerRef = useRef(onFocusComplete);
  const errorHandlerRef = useRef(onError);

  useEffect(() => {
    settingsRef.current = settings;
    selectedTaskRef.current = selectedTaskId;
    completionHandlerRef.current = onFocusComplete;
    errorHandlerRef.current = onError;
  }, [onError, onFocusComplete, selectedTaskId, settings]);

  const commit = useCallback(
    (next: TimerState) => {
      stateRef.current = next;
      setState(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  useEffect(() => {
    stateRef.current = state;
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  useEffect(() => {
    const next = syncIdleSettings(stateRef.current, settings);
    if (next !== stateRef.current) commit(next);
  }, [commit, settings]);

  const finishCurrentPhase = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== 'running') return;
    const completedAt = current.endsAt ?? new Date().toISOString();
    const next = transitionAfterCompletion(current, settingsRef.current);
    commit(next);
    playCompletionTone(current.phase);
    showCompletionNotification(current.phase);

    if (current.phase === 'focus') {
      void Promise.resolve(
        completionHandlerRef.current({
          id: current.sessionId,
          taskId: selectedTaskRef.current,
          durationSeconds: current.durationSeconds,
          completedAt,
          timezone,
        }),
      ).catch((error: unknown) => {
        errorHandlerRef.current(error instanceof Error ? error.message : '学习记录保存失败。');
      });
    }
  }, [commit, timezone]);

  useEffect(() => {
    const tick = () => {
      const current = stateRef.current;
      if (current.status !== 'running' || !current.endsAt) return;
      const remainingSeconds = Math.max(
        0,
        Math.ceil((new Date(current.endsAt).getTime() - Date.now()) / 1000),
      );
      if (remainingSeconds <= 0) {
        finishCurrentPhase();
        return;
      }
      if (remainingSeconds !== current.remainingSeconds) {
        commit({ ...current, remainingSeconds });
      }
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [commit, finishCurrentPhase]);

  const start = useCallback(async () => {
    const current = stateRef.current;
    if (current.status === 'running') return;
    if (current.status === 'idle') void requestNotificationPermission();
    commit({
      ...current,
      status: 'running',
      endsAt: new Date(Date.now() + current.remainingSeconds * 1000).toISOString(),
    });
  }, [commit]);

  const pause = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== 'running' || !current.endsAt) return;
    commit({
      ...current,
      status: 'paused',
      remainingSeconds: Math.max(
        0,
        Math.ceil((new Date(current.endsAt).getTime() - Date.now()) / 1000),
      ),
      endsAt: null,
    });
  }, [commit]);

  const reset = useCallback(() => {
    const current = stateRef.current;
    const durationSeconds = phaseDurationSeconds(current.phase, settingsRef.current);
    commit({
      ...current,
      status: 'idle',
      durationSeconds,
      remainingSeconds: durationSeconds,
      endsAt: null,
      sessionId: current.phase === 'focus' ? crypto.randomUUID() : current.sessionId,
    });
  }, [commit]);

  const skip = useCallback(() => {
    commit(transitionAfterSkip(stateRef.current, settingsRef.current));
  }, [commit]);

  return {
    state,
    progress: progressRatio(state),
    start,
    pause,
    reset,
    skip,
  };
}
