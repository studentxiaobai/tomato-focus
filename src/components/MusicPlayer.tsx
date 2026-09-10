import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FolderUp,
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat2,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { demoMusicUrl, isAllowedAudio } from '../lib/media';
import { formatClock } from '../lib/time';
import type { MusicTrack } from '../types';

interface MusicPlayerProps {
  tracks: MusicTrack[];
  mobileOpen?: boolean;
  onUpload: (files: File[]) => Promise<MusicTrack[]>;
  onRemove: (track: MusicTrack) => Promise<void>;
}

const demoTrack: MusicTrack | null = demoMusicUrl
  ? {
      id: 'demo-track',
      title: '偏爱（开发预览）',
      storagePath: 'demo',
      sortOrder: 0,
      durationSeconds: null,
      signedUrl: demoMusicUrl,
      isDemo: true,
    }
  : null;

export function MusicPlayer({ tracks, mobileOpen = false, onUpload, onRemove }: MusicPlayerProps) {
  const { notify } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attemptedAutoplay = useRef(false);
  const playAfterTrackChange = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [muted, setMuted] = useState(false);
  const [repeat, setRepeat] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [uploading, setUploading] = useState(false);

  const playlist = useMemo(
    () => (tracks.length > 0 ? tracks : demoTrack ? [demoTrack] : []),
    [tracks],
  );
  const current = playlist[Math.min(currentIndex, Math.max(0, playlist.length - 1))] ?? null;

  useEffect(() => {
    const input = folderInputRef.current;
    if (!input) return;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    try {
      await audio.play();
      setPlaying(true);
      setNeedsGesture(false);
    } catch {
      setPlaying(false);
      setNeedsGesture(true);
    }
  }, [current]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) void play();
    else {
      audio.pause();
      setPlaying(false);
    }
  }, [current, play]);

  const selectTrack = useCallback((index: number) => {
    setCurrentIndex(index);
    setCurrentTime(0);
    setDuration(0);
    playAfterTrackChange.current = true;
  }, []);

  const nextTrack = useCallback(
    (autoplay = playing) => {
      if (playlist.length === 0) return;
      const nextIndex = (currentIndex + 1) % playlist.length;
      setCurrentIndex(nextIndex);
      setCurrentTime(0);
      setDuration(0);
      playAfterTrackChange.current = autoplay;
    },
    [currentIndex, playlist.length, playing],
  );

  const previousTrack = useCallback(() => {
    if (playlist.length === 0) return;
    setCurrentIndex((currentIndex - 1 + playlist.length) % playlist.length);
    setCurrentTime(0);
    setDuration(0);
    playAfterTrackChange.current = playing;
  }, [currentIndex, playlist.length, playing]);

  useEffect(() => {
    if (currentIndex >= playlist.length && playlist.length > 0) setCurrentIndex(0);
    if (playlist.length === 0) {
      setPlaying(false);
      setCurrentIndex(0);
    }
  }, [currentIndex, playlist.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    setCurrentTime(0);
    setDuration(current?.durationSeconds ?? 0);
    if (playAfterTrackChange.current) {
      playAfterTrackChange.current = false;
      void play();
    }
  }, [current?.id, current?.durationSeconds, play]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || attemptedAutoplay.current || !current) return;
    attemptedAutoplay.current = true;
    const timer = window.setTimeout(() => void play(), 650);
    return () => window.clearTimeout(timer);
  }, [current, play]);

  useEffect(() => {
    if (!needsGesture) return;
    const resume = () => void play();
    window.addEventListener('pointerdown', resume, { once: true });
    return () => window.removeEventListener('pointerdown', resume);
  }, [needsGesture, play]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [muted, volume]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList).filter(isAllowedAudio);
    if (files.length === 0) {
      notify('所选文件夹中没有支持的音频文件。', 'error');
      return;
    }
    setUploading(true);
    try {
      const uploaded = await onUpload(files);
      notify(`已添加 ${uploaded.length} 首音乐。`, 'success');
      attemptedAutoplay.current = false;
    } catch (error) {
      notify(error instanceof Error ? error.message : '音频上传失败。', 'error');
    } finally {
      setUploading(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function remove(track: MusicTrack) {
    if (track.isDemo) return;
    try {
      await onRemove(track);
      notify('音乐已从播放列表移除。', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : '音乐删除失败。', 'error');
    }
  }

  return (
    <section className={`player-panel glass-panel ${mobileOpen ? 'mobile-panel--open' : ''}`} aria-label="音乐播放器">
      <audio
        ref={audioRef}
        src={current?.signedUrl}
        loop={repeat && playlist.length === 1}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || current?.durationSeconds || 0)}
        onEnded={() => nextTrack(repeat)}
      />

      <header className="player-heading">
        <div className="album-mark">
          {playing ? <Music2 size={20} /> : <ListMusic size={20} />}
        </div>
        <div>
          <p className="eyebrow">FOCUS SOUND</p>
          <strong>{current?.title || '还没有音乐'}</strong>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={() => setShowPlaylist((value) => !value)}
          aria-label="展开播放列表"
        >
          <ListMusic size={18} />
        </button>
      </header>

      <div className="player-progress">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          disabled={!duration}
          onChange={(event) => {
            const value = Number(event.target.value);
            setCurrentTime(value);
            if (audioRef.current) audioRef.current.currentTime = value;
          }}
          aria-label="播放进度"
        />
        <div>
          <span>{formatClock(currentTime)}</span>
          <span>{duration ? formatClock(duration) : '--:--'}</span>
        </div>
      </div>

      <div className="player-controls">
        <button type="button" onClick={previousTrack} disabled={playlist.length < 2} aria-label="上一首">
          <SkipBack size={18} />
        </button>
        <button className="player-play" type="button" onClick={togglePlayback} disabled={!current} aria-label={playing ? '暂停' : '播放'}>
          {playing ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}
        </button>
        <button type="button" onClick={() => nextTrack(playing)} disabled={playlist.length < 2} aria-label="下一首">
          <SkipForward size={18} />
        </button>
        <button
          className={repeat ? 'control-active' : ''}
          type="button"
          onClick={() => setRepeat((value) => !value)}
          aria-label="循环播放"
          aria-pressed={repeat}
        >
          <Repeat2 size={18} />
        </button>
        <div className="volume-control">
          <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? '取消静音' : '静音'}>
            {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(event) => {
              setVolume(Number(event.target.value));
              setMuted(false);
            }}
            aria-label="音量"
          />
        </div>
      </div>

      {needsGesture && current && (
        <button className="autoplay-prompt" type="button" onClick={() => void play()}>
          浏览器已暂停自动播放，点击这里继续音乐
        </button>
      )}

      {showPlaylist && (
        <div className="playlist">
          {playlist.map((track, index) => (
            <div className={`playlist__item ${index === currentIndex ? 'playlist__item--active' : ''}`} key={track.id}>
              <button type="button" onClick={() => selectTrack(index)}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{track.title}</strong>
              </button>
              {!track.isDemo && (
                <button type="button" onClick={() => void remove(track)} aria-label={`删除 ${track.title}`}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
          {playlist.length === 0 && <p>上传音乐后，它们会出现在这里。</p>}
        </div>
      )}

      <div className="player-upload">
        <button type="button" onClick={() => folderInputRef.current?.click()} disabled={uploading}>
          <FolderUp size={17} /> {uploading ? '正在上传…' : '上传文件夹'}
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>多选文件</button>
        <input
          ref={folderInputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.ogg"
          multiple
          hidden
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.ogg"
          multiple
          hidden
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>
    </section>
  );
}

