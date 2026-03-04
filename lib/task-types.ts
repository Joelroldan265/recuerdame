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

/** Minutos de anticipación antes de la hora del recordatorio. 0 = justo a la hora. */
export type AdvanceMinutes = 0 | 5 | 10 | 15 | 30;

export interface Task {
  id: string;
  text: string;
  priority: Priority;
  repeatType: RepeatType;
  customDate?: CustomDate;
  reminderTime: ReminderTime;
  snoozeInterval: SnoozeInterval; // 0 = sin repetición, 5/10/15 = cada N minutos
  snoozeNotificationIds?: string[]; // IDs de notificaciones de snooze programadas
  advanceMinutes: AdvanceMinutes; // 0 = justo a la hora, 5/10/15/30 = N min antes
  completed: boolean;
  createdAt: string; // ISO string para serialización con AsyncStorage
  completedAt?: string; // ISO string
  notificationId?: string; // ID de la notificación principal programada
}

/** Tiempo de espera en ms antes de leer el recordatorio al desbloquear. */
export type UnlockReadDelay = 0 | 1000 | 3000 | 5000 | 10000;

/** Nombre del archivo de sonido de alarma (sin extensión). */
export type AlarmSound = 'alarm_classic' | 'alarm_urgent' | 'alarm_gentle' | 'alarm_bell' | 'alarm_digital';

export interface Settings {
  voiceSpeed: number; // 0.5 – 2.0
  soundEnabled: boolean;
  highContrast: boolean;
  doNotDisturbEnabled: boolean;
  doNotDisturbStart: ReminderTime; // hora inicio no molestar
  doNotDisturbEnd: ReminderTime;   // hora fin no molestar
  unlockReadDelay: UnlockReadDelay; // ms antes de leer al desbloquear
  alarmSound: AlarmSound; // sonido de alarma para prioridad alta
}

export const DEFAULT_SETTINGS: Settings = {
  voiceSpeed: 1.0,
  soundEnabled: true,
  highContrast: false,
  doNotDisturbEnabled: false,
  doNotDisturbStart: { hour: 22, minute: 0 },
  doNotDisturbEnd: { hour: 8, minute: 0 },
  unlockReadDelay: 1000, // 1 segundo por defecto
  alarmSound: 'alarm_classic', // sonido de alarma por defecto
};

export const UNLOCK_DELAY_OPTIONS: Array<{ label: string; description: string; value: UnlockReadDelay }> = [
  { label: 'Inmediato', description: 'Lee al instante al desbloquear', value: 0 },
  { label: '1 segundo', description: 'Espera 1s antes de leer', value: 1000 },
  { label: '3 segundos', description: 'Espera 3s antes de leer', value: 3000 },
  { label: '5 segundos', description: 'Espera 5s antes de leer', value: 5000 },
  { label: '10 segundos', description: 'Espera 10s antes de leer', value: 10000 },
];

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

export const ADVANCE_OPTIONS: Array<{ label: string; description: string; value: AdvanceMinutes }> = [
  { label: '⏰ Justo a la hora', description: 'Te aviso exactamente a la hora', value: 0 },
  { label: '5 min antes', description: 'Te aviso 5 minutos antes', value: 5 },
  { label: '10 min antes', description: 'Te aviso 10 minutos antes', value: 10 },
  { label: '15 min antes', description: 'Te aviso 15 minutos antes', value: 15 },
  { label: '30 min antes', description: 'Te aviso media hora antes', value: 30 },
];

export const SNOOZE_OPTIONS: Array<{ label: string; description: string; value: SnoozeInterval }> = [
  { label: 'Sin repetir', description: 'Solo una vez', value: 0 },
  { label: 'Cada 5 min', description: 'Te recuerdo 3 veces más', value: 5 },
  { label: 'Cada 10 min', description: 'Te recuerdo 3 veces más', value: 10 },
  { label: 'Cada 15 min', description: 'Te recuerdo 3 veces más', value: 15 },
];

export const ALARM_SOUND_OPTIONS: Array<{ label: string; description: string; value: AlarmSound }> = [
  { label: '🔔 Clásico', description: 'Bip-bip alternado (por defecto)', value: 'alarm_classic' },
  { label: '🚨 Urgente', description: 'Tono rápido estilo ambulancia', value: 'alarm_urgent' },
  { label: '🎵 Suave', description: 'Tono ascendente suave', value: 'alarm_gentle' },
  { label: '🔔 Campana', description: '3 golpes de campana', value: 'alarm_bell' },
  { label: '💻 Digital', description: 'Bip digital corto', value: 'alarm_digital' },
];

export const QUICK_TIMES: Array<{ label: string; hour: number; minute: number }> = [
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '9:00 PM', hour: 21, minute: 0 },
];
