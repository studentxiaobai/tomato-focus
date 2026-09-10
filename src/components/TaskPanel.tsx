import { useState, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Circle,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import type { Task } from '../types';

interface TaskPanelProps {
  tasks: Task[];
  selectedTaskId: string | null;
  mobileOpen?: boolean;
  onSelect: (taskId: string | null) => void;
  onAdd: (title: string, estimatedPomodoros: number) => Promise<Task>;
  onEdit: (taskId: string, patch: Partial<Task>) => Promise<void>;
  onRemove: (taskId: string) => Promise<void>;
  onMove: (taskId: string, direction: -1 | 1) => Promise<void>;
}

export function TaskPanel({
  tasks,
  selectedTaskId,
  mobileOpen = false,
  onSelect,
  onAdd,
  onEdit,
  onRemove,
  onMove,
}: TaskPanelProps) {
  const { notify } = useToast();
  const [title, setTitle] = useState('');
  const [estimate, setEstimate] = useState(1);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEstimate, setEditEstimate] = useState(1);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const task = await onAdd(title, Math.max(1, estimate));
      onSelect(task.id);
      setTitle('');
      setEstimate(1);
    } catch (error) {
      notify(error instanceof Error ? error.message : '任务添加失败。', 'error');
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(task: Task) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditEstimate(task.estimatedPomodoros);
  }

  async function saveEdit(taskId: string) {
    if (!editTitle.trim()) return;
    try {
      await onEdit(taskId, { title: editTitle, estimatedPomodoros: Math.max(1, editEstimate) });
      setEditingId(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : '任务修改失败。', 'error');
    }
  }

  async function toggleTask(task: Task) {
    try {
      await onEdit(task.id, { isCompleted: !task.isCompleted });
      if (!task.isCompleted && selectedTaskId === task.id) onSelect(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : '任务状态更新失败。', 'error');
    }
  }

  async function removeTask(task: Task) {
    if (!window.confirm(`删除任务“${task.title}”？已有学习记录不会被删除。`)) return;
    try {
      await onRemove(task.id);
      if (selectedTaskId === task.id) onSelect(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : '任务删除失败。', 'error');
    }
  }

  return (
    <section className={`tasks-panel glass-panel ${mobileOpen ? 'mobile-panel--open' : ''}`} aria-label="任务清单">
      <header className="panel-heading panel-heading--bordered">
        <div>
          <p className="eyebrow">TODAY'S PLAN</p>
          <h2>任务清单</h2>
        </div>
        <span className="count-pill">{tasks.filter((task) => !task.isCompleted).length} 待完成</span>
      </header>

      <form className="task-create" onSubmit={handleAdd}>
        <div className="task-create__main">
          <ListChecks size={17} />
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="添加一个具体任务…"
            maxLength={120}
          />
        </div>
        <div className="task-create__actions">
          <label>
            预计
            <input
              type="number"
              min="1"
              max="99"
              value={estimate}
              onChange={(event) => setEstimate(Number(event.target.value))}
              aria-label="预计番茄数量"
            />
            个
          </label>
          <button type="submit" disabled={busy || !title.trim()} aria-label="添加任务">
            <Plus size={18} />
          </button>
        </div>
      </form>

      <div className="task-list">
        {tasks.length === 0 && (
          <div className="empty-state">
            <Circle size={26} />
            <strong>还没有任务</strong>
            <span>把一个目标拆小，然后开始第一轮专注。</span>
          </div>
        )}

        {tasks.map((task, index) => {
          const selected = task.id === selectedTaskId;
          const editing = task.id === editingId;
          return (
            <article
              className={`task-item ${selected ? 'task-item--selected' : ''} ${task.isCompleted ? 'task-item--done' : ''}`}
              key={task.id}
            >
              {editing ? (
                <div className="task-edit">
                  <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={120} />
                  <div>
                    <label>
                      预计
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={editEstimate}
                        onChange={(event) => setEditEstimate(Number(event.target.value))}
                      />
                    </label>
                    <button type="button" onClick={() => void saveEdit(task.id)} aria-label="保存修改">
                      <Check size={16} />
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} aria-label="取消修改">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    className="task-check"
                    type="button"
                    onClick={() => void toggleTask(task)}
                    aria-label={task.isCompleted ? '恢复任务' : '完成任务'}
                  >
                    {task.isCompleted && <Check size={14} />}
                  </button>
                  <button className="task-content" type="button" onClick={() => onSelect(selected ? null : task.id)}>
                    <strong>{task.title}</strong>
                    <span>
                      {task.completedPomodoros} / {task.estimatedPomodoros} 个番茄
                      {selected ? ' · 当前专注' : ''}
                    </span>
                  </button>
                  <div className="task-menu">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => void onMove(task.id, -1)}
                      aria-label="上移任务"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={index === tasks.length - 1}
                      onClick={() => void onMove(task.id, 1)}
                      aria-label="下移任务"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button type="button" onClick={() => beginEdit(task)} aria-label="编辑任务">
                      <Pencil size={15} />
                    </button>
                    <button type="button" onClick={() => void removeTask(task)} aria-label="删除任务">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
