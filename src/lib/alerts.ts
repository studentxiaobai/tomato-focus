import type { TimerPhase } from '../types';
import { phaseLabel } from '../features/timer/timerMachine';

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export function playCompletionTone(phase: TimerPhase): void {
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const startAt = context.currentTime;
  const notes = phase === 'focus' ? [523.25, 659.25, 783.99] : [392, 523.25];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startAt + index * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.18, startAt + index * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + index * 0.18 + 0.32);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startAt + index * 0.18);
    oscillator.stop(startAt + index * 0.18 + 0.34);
  });
  window.setTimeout(() => void context.close(), 1300);
}

export function showCompletionNotification(phase: TimerPhase): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const next = phase === 'focus' ? '该休息一下了。' : '准备好后，开始下一轮专注。';
  new Notification(`${phaseLabel(phase)}结束`, { body: next, icon: '/tomato.svg' });
}
