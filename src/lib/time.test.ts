import { describe, expect, it } from 'vitest';
import { formatClock, formatStudyDuration, getLocalDateKey } from './time';

describe('time formatting', () => {
  it('formats countdown values', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3661)).toBe('01:01:01');
  });

  it('formats learning durations in Chinese', () => {
    expect(formatStudyDuration(45)).toBe('45 秒');
    expect(formatStudyDuration(600)).toBe('10 分钟');
    expect(formatStudyDuration(3900)).toBe('1 小时 5 分钟');
  });

  it('builds a stable local date key', () => {
    expect(getLocalDateKey(new Date(2026, 8, 10, 12))).toBe('2026-09-10');
  });
});
