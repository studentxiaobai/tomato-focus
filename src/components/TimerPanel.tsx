import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Check, Pause, Play, RotateCcw, Settings2, SkipForward, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { phaseLabel } from '../features/timer/timerMachine';
import type { TimerState } from '../features/timer/timerMachine';
import { formatClock, formatStudyDuration } from '../lib/time';
import type { StudyStats, Task, TimerSettings } from '../types';

interface TimerPanelProps {
  state: TimerState;
  progress: number;
  settings: TimerSettings;
  selectedTask: Task | null;
  stats: StudyStats;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onSaveSettings: (settings: TimerSettings) => Promise<void>;
}

export function TimerPanel({
  state,
  progress,
  settings,
  selectedTask,
  stats,
  onStart,
  onPause,
  onReset,
  onSkip,
  onSaveSettings,
}: TimerPanelProps) {
  const { notify } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(settings), [settings]);

  async function handleSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings({
        focusMinutes: Math.min(180, Math.max(1, Number(form.focusMinutes) || 25)),
        shortBreakMinutes: Math.min(60, Math.max(1, Number(form.shortBreakMinutes) || 5)),
        longBreakMinutes: Math.min(120, Math.max(1, Number(form.longBreakMinutes) || 15)),
        longBreakEvery: Math.min(12, Math.max(1, Number(form.longBreakEvery) || 4)),
      });
      setEditing(false);
      notify('计时设置已保存。', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : '计时设置保存失败。', 'error');
    } finally {
      setSaving(false);
    }
  }

  const circleStyle = { '--timer-progress': `${Math.round(progress * 360)}deg` } as CSSProperties;

  return (
    <section className={`timer-panel glass-panel timer-panel--${state.phase}`} aria-label="番茄计时器">
      <header className="panel-heading">
        <div>
          <p className="eyebrow">POMODORO</p>
          <h2>{phaseLabel(state.phase)}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="计时设置"
          onClick={() => setEditing((value) => !value)}
        >
          {editing ? <X size={18} /> : <Settings2 size={18} />}
        </button>
      </header>

      {editing ? (
        <form className="timer-settings" onSubmit={handleSettings}>
          <div className="settings-grid">
            <label>
              <span>专注</span>
              <input
                type="number"
                min="1"
                max="180"
                value={form.focusMinutes}
                onChange={(event) => setForm({ ...form, focusMinutes: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>短休</span>
              <input
                type="number"
                min="1"
                max="60"
                value={form.shortBreakMinutes}
                onChange={(event) => setForm({ ...form, shortBreakMinutes: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>长休</span>
              <input
                type="number"
                min="1"
                max="120"
                value={form.longBreakMinutes}
                onChange={(event) => setForm({ ...form, longBreakMinutes: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>长休间隔</span>
              <input
                type="number"
                min="1"
                max="12"
                value={form.longBreakEvery}
                onChange={(event) => setForm({ ...form, longBreakEvery: Number(event.target.value) })}
              />
            </label>
          </div>
          <p className="settings-hint">运行中的计时不会立即改变，下一轮起使用新时长。</p>
          <button className="primary-button primary-button--compact" type="submit" disabled={saving}>
            <Check size={17} /> {saving ? '保存中…' : '保存设置'}
          </button>
        </form>
      ) : (
        <>
          <div className="timer-dial" style={circleStyle}>
            <div className="timer-dial__inner">
              <strong>{formatClock(state.remainingSeconds)}</strong>
              <span>{state.status === 'running' ? '保持专注' : state.status === 'paused' ? '已暂停' : '准备开始'}</span>
            </div>
          </div>

          <div className="timer-context">
            <span>当前任务</span>
            <strong>{selectedTask?.title || '暂未选择任务'}</strong>
          </div>

          <div className="timer-actions">
            {state.status === 'running' ? (
              <button className="timer-main-button" type="button" onClick={onPause}>
                <Pause size={20} fill="currentColor" /> 暂停
              </button>
            ) : (
              <button className="timer-main-button" type="button" onClick={onStart}>
                <Play size={20} fill="currentColor" /> {state.status === 'paused' ? '继续' : '开始'}
              </button>
            )}
            <button className="icon-button icon-button--large" type="button" onClick={onReset} aria-label="重置本轮">
              <RotateCcw size={19} />
            </button>
            <button className="icon-button icon-button--large" type="button" onClick={onSkip} aria-label="跳过当前阶段">
              <SkipForward size={19} />
            </button>
          </div>

          <div className="timer-summary">
            <span><small>累计</small>{formatStudyDuration(stats.totalSeconds)}</span>
            <span><small>今日</small>{formatStudyDuration(stats.todaySeconds)}</span>
          </div>
        </>
      )}
    </section>
  );
}

