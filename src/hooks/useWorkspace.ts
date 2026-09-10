import { useCallback, useEffect, useState } from 'react';
import {
  completeFocusSession,
  createTask,
  deleteMusicTrack,
  deleteTask,
  loadWorkspace,
  refreshStats,
  updateDisplayName,
  updateProfileSettings,
  updateTask,
  uploadCover,
  uploadMusicFiles,
} from '../lib/api';
import type { FocusCompletion, MusicTrack, Task, TimerSettings, WorkspaceData } from '../types';

export function useWorkspace(userId: string) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await loadWorkspace(userId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '无法加载你的专注空间。');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveSettings = useCallback(
    async (settings: TimerSettings) => {
      await updateProfileSettings(userId, settings);
      setData((current) => (current ? { ...current, profile: { ...current.profile, settings } } : current));
    },
    [userId],
  );

  const saveDisplayName = useCallback(
    async (displayName: string) => {
      await updateDisplayName(userId, displayName);
      setData((current) =>
        current ? { ...current, profile: { ...current.profile, displayName: displayName.trim() } } : current,
      );
    },
    [userId],
  );

  const addTask = useCallback(
    async (title: string, estimatedPomodoros: number) => {
      const task = await createTask(userId, title, estimatedPomodoros);
      setData((current) =>
        current ? { ...current, tasks: [...current.tasks, task].sort((a, b) => a.position - b.position) } : current,
      );
      return task;
    },
    [userId],
  );

  const editTask = useCallback(
    async (taskId: string, patch: Partial<Task>) => {
      await updateTask(userId, taskId, patch);
      setData((current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
            }
          : current,
      );
    },
    [userId],
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      await deleteTask(userId, taskId);
      setData((current) =>
        current ? { ...current, tasks: current.tasks.filter((task) => task.id !== taskId) } : current,
      );
    },
    [userId],
  );

  const moveTask = useCallback(
    async (taskId: string, direction: -1 | 1) => {
      if (!data) return;
      const sorted = [...data.tasks].sort((a, b) => a.position - b.position);
      const index = sorted.findIndex((task) => task.id === taskId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;
      const current = sorted[index];
      const target = sorted[targetIndex];
      await Promise.all([
        updateTask(userId, current.id, { position: target.position }),
        updateTask(userId, target.id, { position: current.position }),
      ]);
      const next = sorted.map((task) => {
        if (task.id === current.id) return { ...task, position: target.position };
        if (task.id === target.id) return { ...task, position: current.position };
        return task;
      });
      setData((state) => (state ? { ...state, tasks: next } : state));
    },
    [data, userId],
  );

  const recordFocus = useCallback(
    async (completion: FocusCompletion) => {
      await completeFocusSession(completion);
      const stats = await refreshStats(userId, completion.timezone);
      setData((current) => {
        if (!current) return current;
        const tasks = completion.taskId
          ? current.tasks.map((task) =>
              task.id === completion.taskId
                ? { ...task, completedPomodoros: task.completedPomodoros + 1 }
                : task,
            )
          : current.tasks;
        return { ...current, tasks, stats };
      });
    },
    [userId],
  );

  const replaceCover = useCallback(
    async (file: File) => {
      if (!data) throw new Error('页面尚未准备完成。');
      const result = await uploadCover(userId, file, data.profile.backgroundPath);
      setData((current) =>
        current
          ? {
              ...current,
              profile: { ...current.profile, backgroundPath: result.path, backgroundUrl: result.url },
            }
          : current,
      );
    },
    [data, userId],
  );

  const addMusicFiles = useCallback(
    async (files: File[]) => {
      if (!data) throw new Error('页面尚未准备完成。');
      const tracks = await uploadMusicFiles(userId, files, data.tracks.length);
      setData((current) => (current ? { ...current, tracks: [...current.tracks, ...tracks] } : current));
      return tracks;
    },
    [data, userId],
  );

  const removeMusicTrack = useCallback(
    async (track: MusicTrack) => {
      await deleteMusicTrack(userId, track);
      setData((current) =>
        current ? { ...current, tracks: current.tracks.filter((item) => item.id !== track.id) } : current,
      );
    },
    [userId],
  );

  const reloadStats = useCallback(async () => {
    if (!data) return;
    const stats = await refreshStats(userId, data.profile.timezone);
    setData((current) => (current ? { ...current, stats } : current));
  }, [data, userId]);

  return {
    data,
    loading,
    error,
    refresh,
    saveSettings,
    saveDisplayName,
    addTask,
    editTask,
    removeTask,
    moveTask,
    recordFocus,
    replaceCover,
    addMusicFiles,
    removeMusicTrack,
    reloadStats,
  };
}
