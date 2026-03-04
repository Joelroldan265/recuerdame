/**
 * notification-service.ts
 *
 * Servicio de notificaciones locales para recuérdame.
 *
 * Correcciones aplicadas:
 * 1. Canal Android creado ANTES de solicitar permisos (requerido por Android 13+)
 * 2. Trigger DATE siempre apunta al futuro
 * 3. Categorías de notificación con acciones rápidas:
 *    - "🎙️ Grabar ahora" → abre la app en el flujo de grabación
 *    - "✅ Completar" → marca la tarea como completada
 * 4. setNotificationHandler llamado en el módulo (no dentro de funciones async)
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Task, Settings } from './task-types';

// ── Identificadores de categoría y acciones ───────────────────────────────────
export const NOTIFICATION_CATEGORY_REMINDER = 'reminder';
export const NOTIFICATION_ACTION_COMPLETE = 'complete';
export const NOTIFICATION_ACTION_RECORD = 'record';

// ── Handler global (debe estar en el módulo, no dentro de funciones) ──────────
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
 * Solo se registra una vez por sesión.
 */
async function registerNotificationCategories(): Promise<void> {
  if (categoriesRegistered) return;
  try {
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY_REMINDER, [
      {
        identifier: NOTIFICATION_ACTION_COMPLETE,
        buttonTitle: '✅ Completar',
        options: {
          // No abre la app — acción silenciosa en background
          opensAppToForeground: false,
        },
      },
      {
        identifier: NOTIFICATION_ACTION_RECORD,
        buttonTitle: '🎙️ Grabar nuevo',
        options: {
          // Abre la app directamente en el flujo de grabación
          opensAppToForeground: true,
        },
      },
    ]);
    categoriesRegistered = true;
    console.log('[NotifService] Categorías de notificación registradas');
  } catch (err) {
    console.warn('[NotifService] No se pudieron registrar categorías:', err);
  }
}

/**
 * Inicializa el canal de Android, registra categorías y solicita permisos.
 * Seguro llamarlo múltiples veces (idempotente).
 */
export async function initNotificationsLazy(): Promise<boolean> {
  if (permissionGranted !== null) return permissionGranted;

  try {
    // 1. Crear canal ANTES de pedir permisos (Android 13+ lo requiere)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('recuerdame-default', {
        name: 'Recordatorios',
        description: 'Alertas de tus recordatorios diarios',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#1A56DB',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
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
 * Reinicia el estado de permisos (útil para re-solicitar tras cambio en ajustes).
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

// ── Programar notificación ────────────────────────────────────────────────────

/**
 * Programa una notificación local para la tarea dada.
 * Incluye acciones rápidas: "✅ Completar" y "🎙️ Grabar nuevo".
 * Devuelve el ID de la notificación, o null si no fue posible programarla.
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

    // ── Verificar modo no molestar ─────────────────────────────────────────
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
    const channelId = Platform.OS === 'android' ? 'recuerdame-default' : undefined;

    let trigger: Notifications.NotificationTriggerInput;

    switch (task.repeatType) {
      case 'daily': {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          ...(channelId ? { channelId } : {}),
        };
        break;
      }

      case 'weekly': {
        const now = new Date();
        const weekday = now.getDay() + 1;
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          ...(channelId ? { channelId } : {}),
        };
        break;
      }

      case 'monthly': {
        const now = new Date();
        const day = now.getDate();
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
          day,
          hour,
          minute,
          ...(channelId ? { channelId } : {}),
        };
        break;
      }

      case 'custom': {
        if (task.customDate) {
          const { day, month, year } = task.customDate;
          const targetDate = new Date(year, month - 1, day, hour, minute, 0, 0);
          const now = new Date();

          if (targetDate.getTime() <= now.getTime()) {
            console.warn('[NotifService] Fecha personalizada ya pasó — no se programa');
            return null;
          }

          trigger = {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: targetDate,
            ...(channelId ? { channelId } : {}),
          };
        } else {
          trigger = {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: nextOccurrence(hour, minute),
            ...(channelId ? { channelId } : {}),
          };
        }
        break;
      }

      case 'once':
      default: {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nextOccurrence(hour, minute),
          ...(channelId ? { channelId } : {}),
        };
        break;
      }
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${emoji} Recordatorio`,
        // El texto completo del recordatorio aparece en el cuerpo de la notificación
        body: task.text,
        data: {
          taskId: task.id,
          taskText: task.text,
          action: 'reminder',
        },
        sound: settings.soundEnabled ? 'default' : undefined,
        vibrate: [0, 300, 200, 300],
        priority: task.priority === 'high' ? 'max' : 'high',
        // Asignar la categoría con acciones rápidas
        categoryIdentifier: NOTIFICATION_CATEGORY_REMINDER,
      },
      trigger,
    });

    console.log(`[NotifService] Notificación programada: ${notificationId} para tarea ${task.id}`);
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

    const channelId = Platform.OS === 'android' ? 'recuerdame-default' : undefined;
    const emoji = priorityEmoji(task.priority);
    const ids: string[] = [];
    const SNOOZE_COUNT = 3;

    const now = new Date();
    const base = new Date();
    base.setHours(task.reminderTime.hour, task.reminderTime.minute, 0, 0);
    if (base.getTime() <= now.getTime()) {
      base.setDate(base.getDate() + 1);
    }

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
          sound: settings.soundEnabled ? 'default' : undefined,
          vibrate: [0, 300, 200, 300],
          priority: task.priority === 'high' ? 'max' : 'high',
          categoryIdentifier: NOTIFICATION_CATEGORY_REMINDER,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: snoozeDate,
          ...(channelId ? { channelId } : {}),
        },
      });
      ids.push(id);
    }

    console.log(`[NotifService] ${ids.length} notificaciones de snooze programadas para tarea ${task.id}`);
    return ids;
  } catch (err) {
    console.error('[NotifService] Error al programar snooze:', err);
    return [];
  }
}

/**
 * Notificación de prueba que se dispara en 5 segundos.
 */
export async function scheduleTestNotification(): Promise<string | null> {
  try {
    const hasPermission = await initNotificationsLazy();
    if (!hasPermission) return null;

    const channelId = Platform.OS === 'android' ? 'recuerdame-default' : undefined;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ ¡Notificaciones funcionando!',
        body: 'Las alertas de recuérdame están activas. Prueba las acciones rápidas abajo.',
        sound: 'default',
        data: { taskText: 'Notificación de prueba', action: 'test' },
        categoryIdentifier: NOTIFICATION_CATEGORY_REMINDER,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        ...(channelId ? { channelId } : {}),
      },
    });

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
 * Registra un listener para respuestas a notificaciones (cuando el usuario toca una).
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Registra un listener para notificaciones recibidas mientras la app está abierta.
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void,
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}
