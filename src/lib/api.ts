import { AUDIO_MAX_BYTES, IMAGE_MAX_BYTES, MAX_TRACKS, fileExtension, validateAudio, validateImage } from './media';
import { getLocalDateKey } from './time';
import { supabase } from './supabase';
import type {
  FocusCompletion,
  MusicTrack,
  Profile,
  StudyStats,
  Task,
  TimerSettings,
  WorkspaceData,
} from '../types';

const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  timezone: string | null;
  focus_minutes: number | null;
  short_break_minutes: number | null;
  long_break_minutes: number | null;
  long_break_every: number | null;
  background_path: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  estimated_pomodoros: number;
  completed_pomodoros: number;
  is_completed: boolean;
  position: number;
  created_at: string;
};

type TrackRow = {
  id: string;
  title: string;
  storage_path: string;
  sort_order: number;
  duration_seconds: number | null;
};

function proxiedMediaUrl(value: string | null): string {
  if (!value) return '';
  if (typeof window === 'undefined') return value;
  try {
    const parsed = new URL(value);
    if (parsed.hostname.endsWith('.supabase.co')) {
      return `${window.location.origin}/api/supabase${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return value;
  }
  return value;
}

function getClient() {
  if (!supabase) throw new Error('尚未配置 Supabase 连接信息。');
  return supabase;
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name || '学习者',
    timezone: row.timezone || 'Asia/Shanghai',
    settings: {
      focusMinutes: row.focus_minutes ?? DEFAULT_SETTINGS.focusMinutes,
      shortBreakMinutes: row.short_break_minutes ?? DEFAULT_SETTINGS.shortBreakMinutes,
      longBreakMinutes: row.long_break_minutes ?? DEFAULT_SETTINGS.longBreakMinutes,
      longBreakEvery: row.long_break_every ?? DEFAULT_SETTINGS.longBreakEvery,
    },
    backgroundPath: row.background_path,
    backgroundUrl: null,
  };
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    estimatedPomodoros: row.estimated_pomodoros,
    completedPomodoros: row.completed_pomodoros,
    isCompleted: row.is_completed,
    position: row.position,
    createdAt: row.created_at,
  };
}

function mapTrack(row: TrackRow, signedUrl: string): MusicTrack {
  return {
    id: row.id,
    title: row.title,
    storagePath: row.storage_path,
    sortOrder: row.sort_order,
    durationSeconds: row.duration_seconds,
    signedUrl,
  };
}

async function ensureProfile(userId: string): Promise<ProfileRow> {
  const client = getClient();
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (data) return data as ProfileRow;

  const { data: created, error: createError } = await client
    .from('profiles')
    .insert({
      id: userId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
    })
    .select('*')
    .single();
  if (createError) throw createError;
  return created as ProfileRow;
}

async function signedUrlFor(bucket: 'backgrounds' | 'music', path: string): Promise<string | null> {
  const client = getClient();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) return null;
  return proxiedMediaUrl(data.signedUrl);
}

async function loadTasks(userId: string): Promise<Task[]> {
  const client = getClient();
  const { data, error } = await client
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as TaskRow[]).map(mapTask);
}

async function loadTracks(userId: string): Promise<MusicTrack[]> {
  const client = getClient();
  const { data, error } = await client
    .from('music_tracks')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = data as TrackRow[];
  if (rows.length === 0) return [];

  const { data: signed, error: signError } = await client.storage
    .from('music')
    .createSignedUrls(rows.map((row) => row.storage_path), 3600);
  if (signError) throw signError;

  const urlByPath = new Map((signed ?? []).map((item) => [item.path, proxiedMediaUrl(item.signedUrl)]));
  return rows
    .map((row) => mapTrack(row, urlByPath.get(row.storage_path) ?? ''))
    .filter((track) => Boolean(track.signedUrl));
}

function normalizeStats(raw: unknown, fallback: StudyStats): StudyStats {
  if (!raw || typeof raw !== 'object') return fallback;
  const value = raw as Record<string, unknown>;
  const trend = Array.isArray(value.trend) ? value.trend : fallback.trend;
  return {
    totalSeconds: Number(value.total_seconds ?? value.totalSeconds ?? fallback.totalSeconds),
    todaySeconds: Number(value.today_seconds ?? value.todaySeconds ?? fallback.todaySeconds),
    weekSeconds: Number(value.week_seconds ?? value.weekSeconds ?? fallback.weekSeconds),
    completedPomodoros: Number(
      value.completed_pomodoros ?? value.completedPomodoros ?? fallback.completedPomodoros,
    ),
    trend: trend.map((point) => {
      const item = point as Record<string, unknown>;
      return {
        date: String(item.date ?? ''),
        seconds: Number(item.seconds ?? 0),
      };
    }),
  };
}

function dateKeyInTimezone(value: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
}

async function calculateStatsFallback(userId: string, timezone: string): Promise<StudyStats> {
  const client = getClient();
  const { data, error } = await client
    .from('study_sessions')
    .select('duration_seconds,completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Array<{ duration_seconds: number; completed_at: string }>;
  const today = getLocalDateKey();
  const now = new Date();
  const currentDay = now.getDay() || 7;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - currentDay + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const trendMap = new Map<string, number>();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    trendMap.set(getLocalDateKey(date), 0);
  }

  let totalSeconds = 0;
  let todaySeconds = 0;
  let weekSeconds = 0;
  for (const row of rows) {
    const key = dateKeyInTimezone(row.completed_at, timezone);
    totalSeconds += row.duration_seconds;
    if (key === today) todaySeconds += row.duration_seconds;
    if (new Date(row.completed_at) >= startOfWeek) weekSeconds += row.duration_seconds;
    if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + row.duration_seconds);
  }

  return {
    totalSeconds,
    todaySeconds,
    weekSeconds,
    completedPomodoros: rows.length,
    trend: Array.from(trendMap, ([date, seconds]) => ({ date, seconds })),
  };
}

async function loadStats(userId: string, timezone: string): Promise<StudyStats> {
  const client = getClient();
  const { data, error } = await client.rpc('get_study_stats', { p_timezone: timezone });
  if (error) return calculateStatsFallback(userId, timezone);
  return normalizeStats(data, await calculateStatsFallback(userId, timezone));
}

export async function loadWorkspace(userId: string): Promise<WorkspaceData> {
  const profileRow = await ensureProfile(userId);
  const profile = mapProfile(profileRow);

  const [tasks, tracks, stats, backgroundUrl] = await Promise.all([
    loadTasks(userId),
    loadTracks(userId),
    loadStats(userId, profile.timezone),
    profile.backgroundPath ? signedUrlFor('backgrounds', profile.backgroundPath) : Promise.resolve(null),
  ]);

  return {
    profile: { ...profile, backgroundUrl },
    tasks,
    tracks,
    stats,
  };
}

export async function updateProfileSettings(userId: string, settings: TimerSettings): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('profiles')
    .update({
      focus_minutes: settings.focusMinutes,
      short_break_minutes: settings.shortBreakMinutes,
      long_break_minutes: settings.longBreakMinutes,
      long_break_every: settings.longBreakEvery,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('profiles')
    .update({ display_name: displayName.trim(), updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function createTask(
  userId: string,
  title: string,
  estimatedPomodoros: number,
): Promise<Task> {
  const client = getClient();
  const { data: lastTask, error: positionError } = await client
    .from('tasks')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (positionError) throw positionError;

  const { data, error } = await client
    .from('tasks')
    .insert({
      user_id: userId,
      title: title.trim(),
      estimated_pomodoros: estimatedPomodoros,
      position: (lastTask?.position ?? -1) + 1,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapTask(data as TaskRow);
}

export async function updateTask(
  userId: string,
  taskId: string,
  patch: Partial<Pick<Task, 'title' | 'estimatedPomodoros' | 'completedPomodoros' | 'isCompleted' | 'position'>>,
): Promise<void> {
  const client = getClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) payload.title = patch.title.trim();
  if (patch.estimatedPomodoros !== undefined) payload.estimated_pomodoros = patch.estimatedPomodoros;
  if (patch.completedPomodoros !== undefined) payload.completed_pomodoros = patch.completedPomodoros;
  if (patch.isCompleted !== undefined) payload.is_completed = patch.isCompleted;
  if (patch.position !== undefined) payload.position = patch.position;
  const { error } = await client.from('tasks').update(payload).eq('id', taskId).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
  if (error) throw error;
}

export async function completeFocusSession(completion: FocusCompletion): Promise<void> {
  const client = getClient();
  const { error } = await client.rpc('complete_focus_session', {
    p_session_id: completion.id,
    p_task_id: completion.taskId,
    p_duration_seconds: completion.durationSeconds,
    p_completed_at: completion.completedAt,
    p_timezone: completion.timezone,
  });
  if (error) throw error;
}

export async function refreshStats(userId: string, timezone: string): Promise<StudyStats> {
  return loadStats(userId, timezone);
}

export async function uploadCover(
  userId: string,
  file: File,
  currentPath: string | null,
): Promise<{ path: string; url: string }> {
  const validationError = validateImage(file);
  if (validationError) throw new Error(validationError);
  if (file.size > IMAGE_MAX_BYTES) throw new Error('封面文件不能超过 10 MB。');

  const client = getClient();
  const path = `${userId}/cover-${Date.now()}.${fileExtension(file)}`;
  const { error: uploadError } = await client.storage.from('backgrounds').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error: profileError } = await client
    .from('profiles')
    .update({ background_path: path, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (profileError) {
    await client.storage.from('backgrounds').remove([path]);
    throw profileError;
  }

  if (currentPath) await client.storage.from('backgrounds').remove([currentPath]);
  const url = await signedUrlFor('backgrounds', path);
  if (!url) throw new Error('封面已保存，但暂时无法生成预览地址。');
  return { path, url };
}

async function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    const cleanup = () => URL.revokeObjectURL(url);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const value = Number.isFinite(audio.duration) ? Math.round(audio.duration) : null;
      cleanup();
      resolve(value);
    };
    audio.onerror = () => {
      cleanup();
      resolve(null);
    };
    audio.src = url;
  });
}

export async function uploadMusicFiles(
  userId: string,
  files: File[],
  currentTrackCount: number,
): Promise<MusicTrack[]> {
  if (currentTrackCount + files.length > MAX_TRACKS) {
    throw new Error(`播放列表最多保存 ${MAX_TRACKS} 首音乐。`);
  }

  for (const file of files) {
    const validationError = validateAudio(file);
    if (validationError) throw new Error(validationError);
    if (file.size > AUDIO_MAX_BYTES) throw new Error(`${file.name} 超过 20 MB。`);
  }

  const client = getClient();
  const uploaded: MusicTrack[] = [];
  let nextOrder = currentTrackCount;

  for (const file of files) {
    const storagePath = `${userId}/${crypto.randomUUID()}.${fileExtension(file)}`;
    const { error: uploadError } = await client.storage.from('music').upload(storagePath, file, {
      contentType: file.type || 'audio/mpeg',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const durationSeconds = await readAudioDuration(file);
    const { data, error } = await client
      .from('music_tracks')
      .insert({
        user_id: userId,
        title: file.name.replace(/\.[^.]+$/, '') || file.name,
        storage_path: storagePath,
        sort_order: nextOrder,
        duration_seconds: durationSeconds,
      })
      .select('*')
      .single();

    if (error) {
      await client.storage.from('music').remove([storagePath]);
      throw error;
    }

    const signedUrl = await signedUrlFor('music', storagePath);
    if (signedUrl) uploaded.push(mapTrack(data as TrackRow, signedUrl));
    nextOrder += 1;
  }

  return uploaded;
}

export async function deleteMusicTrack(userId: string, track: MusicTrack): Promise<void> {
  if (track.isDemo) return;
  const client = getClient();
  const { error } = await client
    .from('music_tracks')
    .delete()
    .eq('id', track.id)
    .eq('user_id', userId);
  if (error) throw error;
  await client.storage.from('music').remove([track.storagePath]);
}




