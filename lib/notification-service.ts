/**
 * notification-service.ts
 *
 * Servicio de notificaciones locales para recuérdame.
 *
 * Correcciones v4:
 * 1. Canal Android con lockscreenVisibility PUBLIC, bypassDnd, channelId en trigger
 * 2. sound:true (formato correcto SDK 54)
 * 3. Categoría con 5 acciones rápidas:
 *    - ✅ Completar (sin abrir app)
 *    - ⏰ +5 min, ⏰ +10 min, ⏰ +15 min (posponer, sin abrir app)
 *    - 🎙️ Grabar nuevo (abre app en flujo de grabación)
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Task, Settings } from './task-types';

// ── Identificadores de categoría y acciones ───────────────────────────────────
export const NOTIFICATION_CATEGORY_REMINDER = 'reminder';
export const NOTIFICATION_ACTION_COMPLETE   = 'complete';
export const NOTIFICATION_ACTION_SNOOZE_5   = 'snooze_5';
export const NOTIFICATION_ACTION_SNOOZE_10  = 'snooze_10';
export const NOTIFICATION_ACTION_SNOOZE_15  = 'snooze_15';
export const NOTIFICATION_ACTION_RECORD     = 'record';

// ── Canal de Android ──────────────────────────────────────────────────────────
const ANDROID_CHANNEL_ID = 'recuerdame-reminders';

// ── Handler global ────────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
  handleSuccess: () => {},
  handleError: (id, err) => console.warn('[Notif] handleError', id, err),
});

// ── Estado de inicialización ──────────────────────────────────────────────────
let permissionGranted: boolean | null = null;
let categoriesRegistered = false;

/**
 * Registra la categoría con acciones rápidas:
 * ✅ Completar | ⏰ +5 min | ⏰ +10 min | ⏰ +15 min | 🎙️ Grabar nuevo
 */
async function registerNotificationCategories(): Promise<void> {
  if (categoriesRegistered) return;
  try {
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY_REMINDER, [
      {
        identifier: NOTIFICATION_ACTION_COMPLETE,
        buttonTitle: '✅ Completar',
        options: { opensAppToForeground: false },
      },
      {
        identifier: NOTIFICATION_ACTION_SNOOZE_5,
        buttonTitle: '⏰ +5 min',
        options: { opensAppToForeground: false },
      },
      {
        identifier: NOTIFICATION_ACTION_SNOOZE_10,
        buttonTitle: '⏰ +10 min',
        options: { opensAppToForeground: false },
      },
      {
        identifier: NOTIFICATION_ACTION_SNOOZE_15,
        buttonTitle: '⏰ +15 min',
        options: { opensAppToForeground: false },
      },
      {
        identifier: NOTIFICATION_ACTION_RECORD,
        buttonTitle: '🎙️ Grabar nuevo',
        options: { opensAppToForeground: true },
      },
    ]);
    categoriesRegistered = true;
    console.log('[NotifService] Categorías registradas con acciones de posponer');
  } catch (err) {
    console.warn('[NotifService] No se pudieron registrar categorías:', err);
  }
}

/**
 * Inicializa el canal de Android, registra categorías y solicita permisos.
 * Idempotente — seguro llamarlo múltiples veces.
 */
export async function initNotificationsLazy(): Promise<boolean> {
  if (permissionGranted !== null) return permissionGranted;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Recordatorios',
        description: 'Alertas de tus recordatorios de recuérdame',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#1A56DB',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });
    }

    await registerNotificationCategories();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
          provideAppNotificationSettings: true,
        },
      });
      finalStatus = status;
    }

    permissionGranted = finalStatus === 'granted';
    if (!permissionGranted) {
      console.warn('[NotifService] Permisos denegados.');
    }
    return permissionGranted;
  } catch (err) {
    console.error('[NotifService] Error en initNotificationsLazy:', err);
    permissionGranted = false;
    return false;
  }
}

export function resetNotificationPermissionCache(): void {
  permissionGranted = null;
  categoriesRegistered = false;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextOccurrence(hour: number, minute: number): Date {
  const now = new Date();
  const candidate = new Date();
  candidate.setHours(hour, minute, 0, 0);
  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

function priorityEmoji(priority: string): string {
  if (priority === 'high') return '🔴';
  if (priority === 'medium') return '🟡';
  return '🟢';
}

// ── Programar notificación principal ─────────────────────────────────────────

export async function scheduleTaskNotification(
  task: Task,
  settings: Settings,
): Promise<string | null> {
  try {
    const hasPermission = await initNotificationsLazy();
    if (!hasPermission) return null;

    if (settings.doNotDisturbEnabled) {
      const { hour, minute } = task.reminderTime;
      const taskMins = hour * 60 + minute;
      const startMins = settings.doNotDisturbStart.hour * 60 + settings.doNotDisturbStart.minute;
      const endMins   = settings.doNotDisturbEnd.hour   * 60 + settings.doNotDisturbEnd.minute;
      const inRange   = startMins <= endMins
        ? taskMins >= startMins && taskMins <= endMins
        : taskMins >= startMins || taskMins <= endMins;
      if (inRange) return null;
    }

    const { hour, minute } = task.reminderTime;
    const emoji = priorityEmoji(task.priority);

    let trigger: Notifications.NotificationTriggerInput;

    switch (task.repeatType) {
      case 'daily':
        trigger = { type: Notifications.SchedulableTriggerInputTypes.DAILY,   hour, minute, channelId: ANDROID_CHANNEL_ID };
        break;
      case 'weekly': {
        const weekday = new Date().getDay() + 1;
        trigger = { type: Notifications.SchedulableTriggerInputTypes.WEEKLY,  weekday, hour, minute, channelId: ANDROID_CHANNEL_ID };
        break;
      }
      case 'monthly': {
        const day = new Date().getDate();
        trigger = { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day, hour, minute, channelId: ANDROID_CHANNEL_ID };
        break;
      }
      case 'custom': {
        let targetDate: Date;
        if (task.customDate) {
          const { day, month, year } = task.customDate;
          targetDate = new Date(year, month - 1, day, hour, minute, 0, 0);
          if (targetDate.getTime() <= Date.now()) return null;
        } else {
          targetDate = nextOccurrence(hour, minute);
        }
        trigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date: targetDate, channelId: ANDROID_CHANNEL_ID };
        break;
      }
      default:
        trigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextOccurrence(hour, minute), channelId: ANDROID_CHANNEL_ID };
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${emoji} Recordatorio`,
        body: task.text,
        data: { taskId: task.id, taskText: task.text, action: 'reminder' },
        sound: settings.soundEnabled ? true : false,
        categoryIdentifier: NOTIFICATION_CATEGORY_REMINDER,
      },
      trigger,
    });

    console.log(`[NotifService] ✅ Programada: ${notificationId}`);
    return notificationId;
  } catch (err) {
    console.error('[NotifService] Error al programar:', err);
    return null;
  }
}

/**
 * Pospone una tarea X minutos desde ahora y programa una nueva notificación.
 * Guarda el ID en AsyncStorage para que el TaskContext lo actualice al abrir la app.
 */
export async function snoozeTaskNotification(
  taskId: string,
  taskText: string,
  taskPriority: string,
  minutes: number,
  soundEnabled: boolean,
): Promise<string | null> {
  try {
    const hasPermission = await initNotificationsLazy();
    if (!hasPermission) return null;

    const snoozeDate = new Date(Date.now() + minutes * 60 * 1000);
    const emoji = priorityEmoji(taskPriority);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${emoji} Recordatorio (pospuesto ${minutes} min)`,
        body: taskText,
        data: { taskId, taskText, action: 'reminder', snoozed: true },
        sound: soundEnabled ? true : false,
        categoryIdentifier: NOTIFICATION_CATEGORY_REMINDER,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeDate,
        channelId: ANDROID_CHANNEL_ID,
      },
    });

    console.log(`[NotifService] Pospuesto ${minutes} min → ${id}`);
    return id;
  } catch (err) {
    console.error('[NotifService] Error al posponer:', err);
    return null;
  }
}

export async function scheduleSnoozeNotifications(
  task: Task,
  settings: Settings,
): Promise<string[]> {
  if (task.snoozeInterval === 0) return [];
  try {
    const hasPermission = await initNotificationsLazy();
    if (!hasPermission) return [];

    const emoji = priorityEmoji(task.priority);
    const ids: string[] = [];
    const SNOOZE_COUNT = 3;
    const base = nextOccurrence(task.reminderTime.hour, task.reminderTime.minute);

    for (let i = 1; i <= SNOOZE_COUNT; i++) {
      const snoozeDate = new Date(base.getTime() + i * task.snoozeInterval * 60 * 1000);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${emoji} Recordatorio (${i}/${SNOOZE_COUNT})`,
          body: task.text,
          data: { taskId: task.id, taskText: task.text, snooze: true, snoozeIndex: i, action: 'reminder' },
          sound: settings.soundEnabled ? true : false,
          categoryIdentifier: NOTIFICATION_CATEGORY_REMINDER,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: snoozeDate,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
      ids.push(id);
    }
    return ids;
  } catch (err) {
    console.error('[NotifService] Error snooze:', err);
    return [];
  }
}

export async function scheduleTestNotification(): Promise<string | null> {
  try {
    const hasPermission = await initNotificationsLazy();
    if (!hasPermission) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ ¡Notificaciones funcionando!',
        body: 'Prueba las acciones: ✅ Completar, ⏰ Posponer, 🎙️ Grabar nuevo.',
        sound: true,
        data: { taskText: 'Notificación de prueba', taskId: 'test', action: 'test' },
        categoryIdentifier: NOTIFICATION_CATEGORY_REMINDER,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
    return id;
  } catch (err) {
    console.error('[NotifService] Error prueba:', err);
    return null;
  }
}

export async function cancelTaskNotification(notificationId: string): Promise<void> {
  try { await Notifications.cancelScheduledNotificationAsync(notificationId); } catch { /* ignore */ }
}

export async function cancelAllNotifications(): Promise<void> {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch { /* ignore */ }
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void,
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}
