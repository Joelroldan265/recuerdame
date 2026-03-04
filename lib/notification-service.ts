/**
 * notification-service.ts
 *
 * Servicio de notificaciones locales para recuérdame.
 *
 * Correcciones v3:
 * 1. Eliminado `vibrate` y `priority` del content (no son propiedades válidas en expo-notifications)
 * 2. `sound: true` en lugar de `sound: 'default'` (formato correcto en SDK 54)
 * 3. `channelId` siempre incluido en el trigger (no solo en el content) para Android 8+
 * 4. Canal Android con lockscreenVisibility: PUBLIC para que aparezca en pantalla de bloqueo
 * 5. Canal Android con bypassDnd: true para prioridad alta
 * 6. setNotificationHandler con shouldPlaySound: true
 * 7. Permisos iOS incluyen allowCriticalAlerts para alertas de alta prioridad
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Task, Settings } from './task-types';

// ── Identificadores de categoría y acciones ───────────────────────────────────
export const NOTIFICATION_CATEGORY_REMINDER = 'reminder';
export const NOTIFICATION_ACTION_COMPLETE = 'complete';
export const NOTIFICATION_ACTION_RECORD = 'record';

// ── Canal de Android ──────────────────────────────────────────────────────────
const ANDROID_CHANNEL_ID = 'recuerdame-reminders';

// ── Handler global ────────────────────────────────────────────────────────────
// IMPORTANTE: shouldPlaySound: true es necesario para que suene en foreground
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
 * Registra las categorías de notificación con acciones rápidas.
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
        identifier: NOTIFICATION_ACTION_RECORD,
        buttonTitle: '🎙️ Grabar nuevo',
        options: { opensAppToForeground: true },
      },
    ]);
    categoriesRegistered = true;
  } catch (err) {
    console.warn('[NotifService] No se pudieron registrar categorías:', err);
  }
}

/**
 * Inicializa el canal de Android con visibilidad en pantalla de bloqueo,
 * registra categorías y solicita permisos.
 * Idempotente — seguro llamarlo múltiples veces.
 */
export async function initNotificationsLazy(): Promise<boolean> {
  if (permissionGranted !== null) return permissionGranted;

  try {
    // 1. Crear canal Android ANTES de pedir permisos (Android 13+ lo requiere)
    //    lockscreenVisibility: PUBLIC → aparece en pantalla de bloqueo con contenido visible
    //    bypassDnd: true → suena aunque el dispositivo esté en "No molestar"
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
        // Mostrar en pantalla de bloqueo con contenido completo
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        // Sonar aunque el dispositivo esté en modo silencio/no molestar
        bypassDnd: true,
      });
    }

    // 2. Registrar categorías con acciones rápidas
    await registerNotificationCategories();

    // 3. Solicitar permisos
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
      console.warn('[NotifService] Permisos denegados. Las notificaciones no funcionarán.');
    }

    return permissionGranted;
  } catch (err) {
    console.error('[NotifService] Error en initNotificationsLazy:', err);
    permissionGranted = false;
    return false;
  }
}

/**
 * Reinicia el estado de permisos.
 */
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

/**
 * Programa una notificación local para la tarea dada.
 * Aparece en pantalla de bloqueo con sonido y vibración.
 */
export async function scheduleTaskNotification(
  task: Task,
  settings: Settings,
): Promise<string | null> {
  try {
    const hasPermission = await initNotificationsLazy();
    if (!hasPermission) {
      console.warn('[NotifService] Sin permisos — notificación no programada');
      return null;
    }

    // Verificar modo no molestar
    if (settings.doNotDisturbEnabled) {
      const { hour, minute } = task.reminderTime;
      const { doNotDisturbStart, doNotDisturbEnd } = settings;
      const taskMins = hour * 60 + minute;
      const startMins = doNotDisturbStart.hour * 60 + doNotDisturbStart.minute;
      const endMins = doNotDisturbEnd.hour * 60 + doNotDisturbEnd.minute;

      const inRange =
        startMins <= endMins
          ? taskMins >= startMins && taskMins <= endMins
          : taskMins >= startMins || taskMins <= endMins;

      if (inRange) {
        console.log('[NotifService] En modo no molestar — notificación omitida');
        return null;
      }
    }

    const { hour, minute } = task.reminderTime;
    const emoji = priorityEmoji(task.priority);

    // IMPORTANTE: el channelId va en el TRIGGER (no en el content) para Android 8+
    // Esto es lo que hace que use el canal correcto con sonido y vibración
    let trigger: Notifications.NotificationTriggerInput;

    switch (task.repeatType) {
      case 'daily': {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: ANDROID_CHANNEL_ID,
        };
        break;
      }

      case 'weekly': {
        const weekday = new Date().getDay() + 1;
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: ANDROID_CHANNEL_ID,
        };
        break;
      }

      case 'monthly': {
        const day = new Date().getDate();
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
          day,
          hour,
          minute,
          channelId: ANDROID_CHANNEL_ID,
        };
        break;
      }

      case 'custom': {
        let targetDate: Date;
        if (task.customDate) {
          const { day, month, year } = task.customDate;
          targetDate = new Date(year, month - 1, day, hour, minute, 0, 0);
          if (targetDate.getTime() <= Date.now()) {
            console.warn('[NotifService] Fecha personalizada ya pasó — no se programa');
            return null;
          }
        } else {
          targetDate = nextOccurrence(hour, minute);
        }
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetDate,
          channelId: ANDROID_CHANNEL_ID,
        };
        break;
      }

      case 'once':
      default: {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nextOccurrence(hour, minute),
          channelId: ANDROID_CHANNEL_ID,
        };
        break;
      }
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${emoji} Recordatorio`,
        body: task.text,
        data: {
          taskId: task.id,
          taskText: task.text,
          action: 'reminder',
        },
        // sound: true usa el sonido del sistema (correcto para SDK 54)
        sound: settings.soundEnabled ? true : false,
        categoryIdentifier: NOTIFICATION_CATEGORY_REMINDER,
      },
      trigger,
    });

    console.log(`[NotifService] ✅ Notificación programada: ${notificationId} para tarea "${task.text.substring(0, 30)}"`);
    return notificationId;
  } catch (err) {
    console.error('[NotifService] Error al programar notificación:', err);
    return null;
  }
}

/**
 * Programa notificaciones de snooze (repetición post-recordatorio).
 */
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
          data: {
            taskId: task.id,
            taskText: task.text,
            snooze: true,
            snoozeIndex: i,
            action: 'reminder',
          },
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

    console.log(`[NotifService] ${ids.length} snooze programados para "${task.text.substring(0, 20)}"`);
    return ids;
  } catch (err) {
    console.error('[NotifService] Error al programar snooze:', err);
    return [];
  }
}

/**
 * Notificación de prueba en 5 segundos.
 * Útil para verificar que el canal y los permisos funcionan.
 */
export async function scheduleTestNotification(): Promise<string | null> {
  try {
    const hasPermission = await initNotificationsLazy();
    if (!hasPermission) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ ¡Notificaciones funcionando!',
        body: 'Las alertas de recuérdame están activas con sonido y vibración.',
        sound: true,
        data: { taskText: 'Notificación de prueba', action: 'test' },
        categoryIdentifier: NOTIFICATION_CATEGORY_REMINDER,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: ANDROID_CHANNEL_ID,
      },
    });

    console.log(`[NotifService] Notificación de prueba programada: ${id}`);
    return id;
  } catch (err) {
    console.error('[NotifService] Error en notificación de prueba:', err);
    return null;
  }
}

/**
 * Cancela una notificación programada por su ID.
 */
export async function cancelTaskNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.error('[NotifService] Error al cancelar notificación:', err);
  }
}

/**
 * Cancela todas las notificaciones programadas.
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.error('[NotifService] Error al cancelar todas las notificaciones:', err);
  }
}

/**
 * Registra un listener para respuestas a notificaciones.
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Registra un listener para notificaciones recibidas en foreground.
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void,
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}
