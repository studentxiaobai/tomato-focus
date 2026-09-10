import { useRef, useState, type ChangeEvent } from 'react';
import { BarChart3, Check, ImagePlus, LogOut, Pencil, UserRound } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { formatStudyDuration } from '../lib/time';
import type { Profile, StudyStats } from '../types';

interface WorkspaceHeaderProps {
  profile: Profile;
  stats: StudyStats;
  onUploadCover: (file: File) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onOpenStats: () => void;
  onLogout: () => Promise<void>;
}

export function WorkspaceHeader({
  profile,
  stats,
  onUploadCover,
  onRename,
  onOpenStats,
  onLogout,
}: WorkspaceHeaderProps) {
  const { notify } = useToast();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profile.displayName);

  async function handleCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await onUploadCover(file);
      notify('封面已更新。', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : '封面上传失败。', 'error');
    } finally {
      event.target.value = '';
    }
  }

  async function saveName() {
    const nextName = name.trim();
    if (!nextName) return;
    try {
      await onRename(nextName);
      setEditingName(false);
      notify('称呼已更新。', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : '称呼修改失败。', 'error');
    }
  }

  return (
    <header className="workspace-header glass-panel">
      <div className="workspace-brand">
        <span className="brand-lockup__mark"><UserRound size={19} /></span>
        <div>
          <strong>番茄闹钟</strong>
          <span>累计学习 {formatStudyDuration(stats.totalSeconds)}</span>
        </div>
      </div>

      <div className="workspace-header__actions">
        <button className="header-stat-button" type="button" onClick={onOpenStats}>
          <BarChart3 size={18} />
          <span>学习统计</span>
        </button>
        <button className="profile-button" type="button" onClick={() => setMenuOpen((value) => !value)}>
          <span className="profile-avatar">{profile.displayName.slice(0, 1).toUpperCase()}</span>
          <span>{profile.displayName}</span>
        </button>
      </div>

      {menuOpen && (
        <div className="profile-menu glass-panel">
          <div className="profile-menu__name">
            {editingName ? (
              <>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} autoFocus />
                <button type="button" onClick={() => void saveName()} aria-label="保存称呼">
                  <Check size={16} />
                </button>
              </>
            ) : (
              <>
                <div>
                  <span>当前称呼</span>
                  <strong>{profile.displayName}</strong>
                </div>
                <button type="button" onClick={() => { setName(profile.displayName); setEditingName(true); }} aria-label="编辑称呼">
                  <Pencil size={16} />
                </button>
              </>
            )}
          </div>
          <button type="button" onClick={() => coverInputRef.current?.click()}>
            <ImagePlus size={17} /> 更换背景图片
          </button>
          <button type="button" onClick={() => void onLogout()}>
            <LogOut size={17} /> 退出登录
          </button>
          <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void handleCover(event)} />
        </div>
      )}
    </header>
  );
}
