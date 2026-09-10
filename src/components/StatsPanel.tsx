import { BarChart3, Clock3, Flame, Target, X } from 'lucide-react';
import { formatStudyDuration, formatTrendLabel } from '../lib/time';
import type { StudyStats } from '../types';

interface StatsPanelProps {
  stats: StudyStats;
  open: boolean;
  onClose: () => void;
}

export function StatsPanel({ stats, open, onClose }: StatsPanelProps) {
  const maxSeconds = Math.max(...stats.trend.map((point) => point.seconds), 1);

  return (
    <aside className={`stats-drawer glass-panel ${open ? 'stats-drawer--open' : ''}`} aria-hidden={!open}>
      <header className="panel-heading panel-heading--bordered">
        <div>
          <p className="eyebrow">YOUR PROGRESS</p>
          <h2>学习统计</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="关闭统计">
          <X size={18} />
        </button>
      </header>

      <div className="stats-hero">
        <Clock3 size={21} />
        <span>累计学习时长</span>
        <strong>{formatStudyDuration(stats.totalSeconds)}</strong>
      </div>

      <div className="stats-grid">
        <article>
          <span>今日</span>
          <strong>{formatStudyDuration(stats.todaySeconds)}</strong>
        </article>
        <article>
          <span>本周</span>
          <strong>{formatStudyDuration(stats.weekSeconds)}</strong>
        </article>
        <article>
          <Flame size={17} />
          <span>完成番茄</span>
          <strong>{stats.completedPomodoros} 个</strong>
        </article>
        <article>
          <Target size={17} />
          <span>近七日目标</span>
          <strong>{formatStudyDuration(stats.trend.reduce((sum, point) => sum + point.seconds, 0))}</strong>
        </article>
      </div>

      <section className="trend-card">
        <header>
          <div>
            <BarChart3 size={18} />
            <strong>最近 7 天</strong>
          </div>
          <span>每日专注时长</span>
        </header>
        <div className="trend-chart">
          {stats.trend.map((point) => (
            <div className="trend-column" key={point.date}>
              <span className="trend-value">{point.seconds > 0 ? Math.round(point.seconds / 60) : ''}</span>
              <div className="trend-track">
                <i style={{ height: `${Math.max(point.seconds > 0 ? 6 : 2, (point.seconds / maxSeconds) * 100)}%` }} />
              </div>
              <small>{formatTrendLabel(point.date)}</small>
            </div>
          ))}
        </div>
      </section>

      <p className="stats-footnote">只有完整结束的专注阶段会计入统计，跳过的阶段不会保存。</p>
    </aside>
  );
}
