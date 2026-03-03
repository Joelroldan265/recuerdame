// Tipos compartidos — NO importar desde contextos para evitar imports circulares

export type Priority = 'high' | 'medium' | 'low';
export type RepeatType = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface CustomDate {
  day: number;
  month: number;
  year: number;
}

export interface ReminderTime {
  hour: number;
  minute: number;
}

/** Intervalo de repetición post-recordatorio en minutos. 0 = sin repetición. */
export type SnoozeInterval = 0 | 5 | 10 | 15;

export interface Task {
  id: string;
  text: string;
  priority: Priority;
  repeatType: RepeatType;
  customDate?: CustomDate;
  reminderTime: ReminderTime;
  snoozeInterval: SnoozeInterval; // 0 = sin repetición, 5/10/15 = cada N minutos
  snoozeNotificationIds?: string[]; // IDs de notificaciones de snooze programadas
  completed: boolean;
  createdAt: string; // ISO string para serialización con AsyncStorage
  completedAt?: string; // ISO string
  notificationId?: string; // ID de la notificación principal programada
}

export interface Settings {
  voiceSpeed: number; // 0.5 – 2.0
  soundEnabled: boolean;
  highContrast: boolean;
  doNotDisturbEnabled: boolean;
  doNotDisturbStart: ReminderTime; // hora inicio no molestar
  doNotDisturbEnd: ReminderTime;   // hora fin no molestar
}

export const DEFAULT_SETTINGS: Settings = {
  voiceSpeed: 1.0,
  soundEnabled: true,
  highContrast: false,
  doNotDisturbEnabled: false,
  doNotDisturbStart: { hour: 22, minute: 0 },
  doNotDisturbEnd: { hour: 8, minute: 0 },
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; emoji: string; color: string; bgColor: string }> = {
  high: { label: 'Alta', emoji: '🔴', color: '#FF5A1F', bgColor: '#FFF3EE' },
  medium: { label: 'Media', emoji: '🟡', color: '#E3A008', bgColor: '#FFFBEB' },
  low: { label: 'Baja', emoji: '🟢', color: '#0E9F6E', bgColor: '#ECFDF5' },
};

export const REPEAT_CONFIG: Record<RepeatType, { label: string; emoji: string; description: string }> = {
  once: { label: 'Una vez', emoji: '1️⃣', description: 'Solo este recordatorio' },
  daily: { label: 'Diaria', emoji: '📅', description: 'Todos los días' },
  weekly: { label: 'Semanal', emoji: '📆', description: 'Una vez por semana' },
  monthly: { label: 'Mensual', emoji: '🗓️', description: 'Una vez al mes' },
  custom: { label: 'Fecha específica', emoji: '📌', description: 'Elige un día' },
};

export const SNOOZE_OPTIONS: Array<{ label: string; description: string; value: SnoozeInterval }> = [
  { label: 'Sin repetir', description: 'Solo una vez', value: 0 },
  { label: 'Cada 5 min', description: 'Te recuerdo 3 veces más', value: 5 },
  { label: 'Cada 10 min', description: 'Te recuerdo 3 veces más', value: 10 },
  { label: 'Cada 15 min', description: 'Te recuerdo 3 veces más', value: 15 },
];

export const QUICK_TIMES: Array<{ label: string; hour: number; minute: number }> = [
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '9:00 PM', hour: 21, minute: 0 },
];
