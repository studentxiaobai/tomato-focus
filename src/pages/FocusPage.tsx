import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { BarChart3, ListChecks, Music2, RotateCw, Timer } from 'lucide-react';
import { MusicPlayer } from '../components/MusicPlayer';
import { StatsPanel } from '../components/StatsPanel';
import { TaskPanel } from '../components/TaskPanel';
import { TimerPanel } from '../components/TimerPanel';
import { WorkspaceHeader } from '../components/WorkspaceHeader';
import { LoadingScreen } from '../components/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usePomodoro } from '../hooks/usePomodoro';
import { useWorkspace } from '../hooks/useWorkspace';
import { demoCoverUrl } from '../lib/media';
import { getBrowserTimezone } from '../lib/time';
import type { TimerSettings } from '../types';

type MobilePanel = 'tasks' | 'music' | 'stats' | null;

const fallbackSettings: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
};

const emptyStats = {
  totalSeconds: 0,
  todaySeconds: 0,
  weekSeconds: 0,
  completedPomodoros: 0,
  trend: [],
};

export function FocusPage() {
  const { user, signOut } = useAuth();
  const { notify } = useToast();
  const workspace = useWorkspace(user!.id);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() =>
    localStorage.getItem(`tomato.selected-task.${user!.id}`),
  );
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const settings = workspace.data?.profile.settings ?? fallbackSettings;
  const timezone = workspace.data?.profile.timezone ?? getBrowserTimezone();
  const tasks = workspace.data?.tasks ?? [];
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId && !task.isCompleted) ?? null,
    [selectedTaskId, tasks],
  );

  const timer = usePomodoro({
    storageKey: `tomato.timer.v1.${user!.id}`,
    settings,
    selectedTaskId: selectedTask?.id ?? null,
    timezone,
    onFocusComplete: workspace.recordFocus,
    onError: (message) => notify(message, 'error'),
  });

  useEffect(() => {
    const storageKey = `tomato.selected-task.${user!.id}`;
    if (selectedTaskId) localStorage.setItem(storageKey, selectedTaskId);
    else localStorage.removeItem(storageKey);
  }, [selectedTaskId, user!.id]);

  useEffect(() => {
    if (workspace.data && selectedTaskId && !selectedTask) setSelectedTaskId(null);
  }, [selectedTask, selectedTaskId, workspace.data]);

  if (workspace.loading && !workspace.data) return <LoadingScreen />;

  if (workspace.error || !workspace.data) {
    return (
      <main className="center-page center-page--error">
        <section className="error-card glass-panel">
          <h1>暂时无法打开专注空间</h1>
          <p>{workspace.error || '请稍后重试。'}</p>
          <button className="primary-button" type="button" onClick={() => void workspace.refresh()}>
            <RotateCw size={18} /> 重新加载
          </button>
        </section>
      </main>
    );
  }

  const { profile, tracks, stats } = workspace.data;
  const coverUrl = profile.backgroundUrl || demoCoverUrl;
  const backgroundStyle = coverUrl
    ? ({ '--cover-image': `url("${coverUrl}")` } as CSSProperties)
    : undefined;

  async function handleLogout() {
    try {
      await signOut();
    } catch (error) {
      notify(error instanceof Error ? error.message : '退出失败。', 'error');
    }
  }

  function openMobilePanel(panel: Exclude<MobilePanel, null>) {
    if (panel === 'stats') setStatsOpen(true);
    else setMobilePanel(panel);
  }

  return (
    <main className={`focus-page ${coverUrl ? 'focus-page--has-cover' : ''}`} style={backgroundStyle}>
      <div className="focus-page__cover" />
      <div className="focus-page__scrim" />

      <WorkspaceHeader
        profile={profile}
        stats={stats}
        onUploadCover={workspace.replaceCover}
        onRename={workspace.saveDisplayName}
        onOpenStats={() => setStatsOpen(true)}
        onLogout={handleLogout}
      />

      <TimerPanel
        state={timer.state}
        progress={timer.progress}
        settings={settings}
        selectedTask={selectedTask}
        stats={stats}
        onStart={() => void timer.start()}
        onPause={timer.pause}
        onReset={timer.reset}
        onSkip={timer.skip}
        onSaveSettings={workspace.saveSettings}
      />

      <TaskPanel
        tasks={tasks}
        selectedTaskId={selectedTask?.id ?? null}
        mobileOpen={mobilePanel === 'tasks'}
        onSelect={setSelectedTaskId}
        onAdd={workspace.addTask}
        onEdit={workspace.editTask}
        onRemove={workspace.removeTask}
        onMove={workspace.moveTask}
      />

      <MusicPlayer
        tracks={tracks}
        mobileOpen={mobilePanel === 'music'}
        onUpload={workspace.addMusicFiles}
        onRemove={workspace.removeMusicTrack}
      />

      <StatsPanel stats={stats} open={statsOpen} onClose={() => setStatsOpen(false)} />

      {mobilePanel && <button className="mobile-backdrop" type="button" onClick={() => setMobilePanel(null)} aria-label="关闭面板" />}
      {statsOpen && <button className="mobile-backdrop mobile-backdrop--stats" type="button" onClick={() => setStatsOpen(false)} aria-label="关闭统计" />}

      <nav className="mobile-nav" aria-label="移动端导航">
        <button className={timer.state.status === 'running' ? 'mobile-nav--active' : ''} type="button" onClick={() => { setMobilePanel(null); setStatsOpen(false); }}>
          <Timer size={20} /><span>计时</span>
        </button>
        <button className={mobilePanel === 'tasks' ? 'mobile-nav--active' : ''} type="button" onClick={() => openMobilePanel('tasks')}>
          <ListChecks size={20} /><span>任务</span>
        </button>
        <button className={mobilePanel === 'music' ? 'mobile-nav--active' : ''} type="button" onClick={() => openMobilePanel('music')}>
          <Music2 size={20} /><span>音乐</span>
        </button>
        <button className={statsOpen ? 'mobile-nav--active' : ''} type="button" onClick={() => openMobilePanel('stats')}>
          <BarChart3 size={20} /><span>统计</span>
        </button>
      </nav>
    </main>
  );
}

