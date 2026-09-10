export const demoCoverUrl = import.meta.env.DEV ? '/demo-assets/demo-cover.jpg' : null;
export const demoMusicUrl = import.meta.env.DEV ? '/demo-assets/demo-music.mp3' : null;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
];

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 20 * 1024 * 1024;
export const MAX_TRACKS = 50;

export function isAllowedAudio(file: File): boolean {
  return AUDIO_TYPES.includes(file.type) || /\.(mp3|m4a|wav|ogg)$/i.test(file.name);
}

export function validateImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return '封面仅支持 JPEG、PNG 或 WebP 格式。';
  if (file.size > IMAGE_MAX_BYTES) return '封面文件不能超过 10 MB。';
  return null;
}

export function validateAudio(file: File): string | null {
  if (!isAllowedAudio(file)) return `${file.name} 不是支持的音频格式。`;
  if (file.size > AUDIO_MAX_BYTES) return `${file.name} 超过 20 MB。`;
  return null;
}

export function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'audio/mpeg') return 'mp3';
  return 'bin';
}
