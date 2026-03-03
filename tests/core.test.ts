import { describe, it, expect } from 'vitest';
import {
  PRIORITY_CONFIG,
  REPEAT_CONFIG,
  QUICK_TIMES,
  DEFAULT_SETTINGS,
  Priority,
  RepeatType,
} from '../lib/task-types';

// ─── PRIORITY CONFIG ───────────────────────────────────────────────────────────

describe('PRIORITY_CONFIG', () => {
  it('should have all three priority levels', () => {
    expect(Object.keys(PRIORITY_CONFIG)).toEqual(['high', 'medium', 'low']);
  });

  it('each priority should have label, emoji, color, and bgColor', () => {
    (['high', 'medium', 'low'] as Priority[]).forEach((p) => {
      const cfg = PRIORITY_CONFIG[p];
      expect(cfg.label).toBeTruthy();
      expect(cfg.emoji).toBeTruthy();
      expect(cfg.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(cfg.bgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

// ─── REPEAT CONFIG ────────────────────────────────────────────────────────────

describe('REPEAT_CONFIG', () => {
  it('should have all five repeat types', () => {
    const keys = Object.keys(REPEAT_CONFIG);
    expect(keys).toContain('once');
    expect(keys).toContain('daily');
    expect(keys).toContain('weekly');
    expect(keys).toContain('monthly');
    expect(keys).toContain('custom');
  });

  it('each repeat type should have label, emoji, and description', () => {
    (['once', 'daily', 'weekly', 'monthly', 'custom'] as RepeatType[]).forEach((r) => {
      const cfg = REPEAT_CONFIG[r];
      expect(cfg.label).toBeTruthy();
      expect(cfg.emoji).toBeTruthy();
      expect(cfg.description).toBeTruthy();
    });
  });
});

// ─── QUICK TIMES ──────────────────────────────────────────────────────────────

describe('QUICK_TIMES', () => {
  it('should have 4 quick time options', () => {
    expect(QUICK_TIMES).toHaveLength(4);
  });

  it('each quick time should have valid hour (0-23) and minute (0-59)', () => {
    QUICK_TIMES.forEach((qt) => {
      expect(qt.hour).toBeGreaterThanOrEqual(0);
      expect(qt.hour).toBeLessThanOrEqual(23);
      expect(qt.minute).toBeGreaterThanOrEqual(0);
      expect(qt.minute).toBeLessThanOrEqual(59);
      expect(qt.label).toBeTruthy();
    });
  });
});

// ─── DEFAULT SETTINGS ─────────────────────────────────────────────────────────

describe('DEFAULT_SETTINGS', () => {
  it('should have voiceSpeed of 1.0', () => {
    expect(DEFAULT_SETTINGS.voiceSpeed).toBe(1.0);
  });

  it('should have soundEnabled true by default', () => {
    expect(DEFAULT_SETTINGS.soundEnabled).toBe(true);
  });

  it('should have highContrast false by default', () => {
    expect(DEFAULT_SETTINGS.highContrast).toBe(false);
  });

  it('should have doNotDisturb disabled by default', () => {
    expect(DEFAULT_SETTINGS.doNotDisturbEnabled).toBe(false);
  });

  it('doNotDisturbStart should be 22:00', () => {
    expect(DEFAULT_SETTINGS.doNotDisturbStart).toEqual({ hour: 22, minute: 0 });
  });

  it('doNotDisturbEnd should be 08:00', () => {
    expect(DEFAULT_SETTINGS.doNotDisturbEnd).toEqual({ hour: 8, minute: 0 });
  });
});

// ─── DO NOT DISTURB LOGIC ─────────────────────────────────────────────────────

describe('Do Not Disturb logic', () => {
  function isInDoNotDisturb(
    taskHour: number,
    taskMinute: number,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number
  ): boolean {
    const taskMinutes = taskHour * 60 + taskMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return startMinutes <= endMinutes
      ? taskMinutes >= startMinutes && taskMinutes <= endMinutes
      : taskMinutes >= startMinutes || taskMinutes <= endMinutes;
  }

  it('should block notification at 23:00 when DND is 22:00–08:00', () => {
    expect(isInDoNotDisturb(23, 0, 22, 0, 8, 0)).toBe(true);
  });

  it('should block notification at 07:00 when DND is 22:00–08:00', () => {
    expect(isInDoNotDisturb(7, 0, 22, 0, 8, 0)).toBe(true);
  });

  it('should allow notification at 10:00 when DND is 22:00–08:00', () => {
    expect(isInDoNotDisturb(10, 0, 22, 0, 8, 0)).toBe(false);
  });

  it('should allow notification at 15:00 when DND is 22:00–08:00', () => {
    expect(isInDoNotDisturb(15, 0, 22, 0, 8, 0)).toBe(false);
  });

  it('should block notification within same-day DND range (09:00–17:00)', () => {
    expect(isInDoNotDisturb(12, 0, 9, 0, 17, 0)).toBe(true);
  });

  it('should allow notification outside same-day DND range (09:00–17:00)', () => {
    expect(isInDoNotDisturb(18, 0, 9, 0, 17, 0)).toBe(false);
  });
});

// ─── TASK ID GENERATION ───────────────────────────────────────────────────────

describe('Task ID generation', () => {
  function generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('should start with "task_"', () => {
    expect(generateId()).toMatch(/^task_\d+_[a-z0-9]+$/);
  });
});

// ─── TIME FORMATTING ──────────────────────────────────────────────────────────

describe('Time formatting', () => {
  function formatTime(hour: number, minute: number): string {
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, '0');
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:${m} ${ampm}`;
  }

  it('should format 9:00 as "9:00 AM"', () => {
    expect(formatTime(9, 0)).toBe('9:00 AM');
  });

  it('should format 12:00 as "12:00 PM"', () => {
    expect(formatTime(12, 0)).toBe('12:00 PM');
  });

  it('should format 0:00 as "12:00 AM"', () => {
    expect(formatTime(0, 0)).toBe('12:00 AM');
  });

  it('should format 18:30 as "6:30 PM"', () => {
    expect(formatTime(18, 30)).toBe('6:30 PM');
  });

  it('should pad minutes with leading zero', () => {
    expect(formatTime(9, 5)).toBe('9:05 AM');
  });
});
