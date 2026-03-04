/**
 * notification-service.ts
 *
 * Servicio de notificaciones locales para recuérdame.
 *
 * Comportamiento por prioridad:
 * - ALTA    → canal ALARM (importancia MAX, bypassDnd, vibración larga, sonido)
 *             El sistema operativo la trata como alarma real.
 * - MEDIA   → canal REMINDER (importancia HIGH, sonido, sin bypassDnd)
 * - BAJA    → canal SILENT (importancia DEFAULT, sin sonido, solo banner)
 *
 * Acciones rápidas en la notificación:
 *   ✅ Completar | ⏰ +5 min | ⏰ +10 min | ⏰ +15 min | 🎙️ Grabar nuevo
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
export const NOTIFICATION_ACTION_SILENCE    = 'silence';   // Detener el audio de la notificación

// ── Canales Android ───────────────────────────────────────────────────────────
/** Canal de ALARMA — prioridad alta: bypassDnd, vibración larga, sonido máximo */
const ANDROID_CHANNEL_ALARM    = 'recuerdame-alarm';
/** Canal de RECORDATORIO — prioridad media: sonido normal, sin bypassDnd */
const ANDROID_CHANNEL_REMINDER = 'recuerdame-reminders';
/** Canal SILENCIOSO — prioridad baja: solo banner, sin sonido */
const ANDROID_CHANNEL_SILENT   = 'recuerdame-silent';
/** Canal PERSISTENTE — acceso rápido fijo en el panel de notificaciones, sin sonido */
const ANDROID_CHANNEL_QUICK    = 'recuerdame-quick';

/** ID fijo de la notificación persistente (para poder cancelarla por ID) */
const PERSISTENT_NOTIFICATION_ID = 'recuerdame-persistent-record';

/** Devuelve el channelId correcto según la prioridad de la tarea */
function channelForPriority(priority: string): string {
  if (priority === 'high')   return ANDROID_CHANNEL_ALARM;
  if (priority === 'medium') return ANDROID_CHANNEL_REMINDER;
  return ANDROID_CHANNEL_SILENT;
}

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
 * ✅ Completar | 🔇 Silenciar | ⏰ +5 min | ⏰ +10 min | ⏰ +15 min | 🎤️ Grabar nuevo
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
        identifier: NOTIFICATION_ACTION_SILENCE,
        buttonTitle: '🔇 Silenciar',
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
        buttonTitle: '🎤️ Grabar nuevo',
        options: { opensAppToForeground: true },
      },
    ]);
    categoriesRegistered = true;
    console.log('[NotifService] Categorías registradas con acciones de posponer y silenciar');
  } catch (err) {
    console.warn('[NotifService] No se pudieron registrar categorías:', err);
  }
}

/**
 * Crea los 3 canales Android y solicita permisos.
 * Idempotente — seguro llamarlo múltiples veces.
 * @param alarmSound - Sonido de alarma seleccionado por el usuario (para el canal ALARM)
 */
export async function initNotificationsLazy(alarmSound?: string): Promise<boolean> {
  if (permissionGranted !== null) return permissionGranted;

  try {
    if (Platform.OS === 'android') {
      // Canal ALARMA — prioridad alta
      // Suena: el tono de alarma elegido por el usuario (alarm_classic, alarm_urgent, etc.)
      // Android solo puede reproducir UN sonido por notificación.
      // El canal se crea con el sonido actual; si el usuario cambia el sonido,
      // la app debe reiniciarse para que el canal se recree con el nuevo sonido.
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ALARM, {
        name: '🔴 Recordatorios urgentes (Alarma)',
        description: 'Alarma con voz para recordatorios de prioridad alta. Suena aunque el teléfono esté en silencio.',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500],
        lightColor: '#EF4444',
        sound: alarmSound ?? 'alarm_classic',   // ← res/raw/{alarmSound}.wav — sonido elegido por el usuario
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      // Canal RECORDATORIO — prioridad media
      // Suena: voz "Tienes una tarea que aún no es urgente..."
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_REMINDER, {
        name: '🟡 Recordatorios',
        description: 'Recordatorio con voz para prioridad media.',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
        lightColor: '#F59E0B',
        sound: 'media',   // ← res/raw/media.mp3 — "Tienes una tarea que aún no es urgente..."
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });

      // Canal SILENCIOSO — prioridad baja
      // Suena: voz suave "Tienes una tarea pendiente que no urge..."
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_SILENT, {
        name: '🟢 Recordatorios suaves',
        description: 'Recordatorio con voz suave para prioridad baja.',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        lightColor: '#22C55E',
        sound: 'baja',   // ← res/raw/baja.mp3 — "Tienes una tarea pendiente que no urge..."
        enableVibrate: false,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });

      // Canal PERSISTENTE — acceso rápido fijo, sin sonido, importancia mínima
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_QUICK, {
        name: '🎤 Grabación rápida',
        description: 'Acceso rápido para grabar un nuevo recordatorio desde el panel de notificaciones.',
        importance: Notifications.AndroidImportance.MIN,
        enableVibrate: false,
        showBadge: false,
        sound: undefined,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.SECRET,
        bypassDnd: false,
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

/**
 * Reinicia el caché de permisos para que initNotificationsLazy() pueda recrear los canales.
 * Útsalo cuando el usuario cambia el sonido de alarma en Ajustes.
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
  if (priority === 'high')   return '🔴';
  if (priority === 'medium') return '🟡';
  return '🟢';
}

/**
 * Construye el content de la notificación según la prioridad:
 * - Alta   → sonido + título con "⚠️ URGENTE"
 * - Media  → sonido normal
 * - Baja   → sin sonido, solo banner
 */
function buildNotificationContent(
  task: Task,
  settings: Settings,
  overrideTitle?: string,
  extraData?: Record<string, unknown>,
): Notifications.NotificationContentInput {
  const emoji = priorityEmoji(task.priority);
  const isHigh = task.priority === 'high';
  const isLow  = task.priority === 'low';

  const title = overrideTitle ?? (
    isHigh
      ? `${emoji} ⚠️ URGENTE — Recordatorio`
      : `${emoji} Recordatorio`
  );

  // Para prioridad alta: usa el sonido de alarma seleccionado por el usuario (alarm_classic, alarm_urgent, etc.)
  // Para prioridad media: usa la voz hablada 'media'
  // Para prioridad baja: usa la voz suave 'baja'
  const alarmSound = settings.alarmSound ?? 'alarm_classic';
  const sound: string | boolean = isHigh
    ? alarmSound
    : (!isLow && settings.soundEnabled) ? 'media' : 'baja';

  return {
    title,
    body: task.text,
    data: { taskId: task.id, taskText: task.text, taskPriority: task.priority, action: 'reminder', ...extraData },
    sound,
    categoryIdentifier: NOTIFICATION_CATEGORY_REMINDER,
  };
}

// ── Programar notificación principal ─────────────────────────────────────────

export async function scheduleTaskNotification(
  task: Task,
  settings: Settings,
): Promise<string | null> {
  try {
    const hasPermission = await initNotificationsLazy(settings.alarmSound);
    if (!hasPermission) return null;

    // Respetar "No molestar" solo para prioridad media y baja
    if (settings.doNotDisturbEnabled && task.priority !== 'high') {
      const { hour, minute } = task.reminderTime;
      const taskMins  = hour * 60 + minute;
      const startMins = settings.doNotDisturbStart.hour * 60 + settings.doNotDisturbStart.minute;
      const endMins   = settings.doNotDisturbEnd.hour   * 60 + settings.doNotDisturbEnd.minute;
      const inRange   = startMins <= endMins
        ? taskMins >= startMins && taskMins <= endMins
        : taskMins >= startMins || taskMins <= endMins;
      if (inRange) return null;
    }

    const { hour, minute } = task.reminderTime;
    const channelId = channelForPriority(task.priority);

    let trigger: Notifications.NotificationTriggerInput;

    switch (task.repeatType) {
      case 'daily':
        trigger = { type: Notifications.SchedulableTriggerInputTypes.DAILY,   hour, minute, channelId };
        break;
      case 'weekly': {
        const weekday = new Date().getDay() + 1;
        trigger = { type: Notifications.SchedulableTriggerInputTypes.WEEKLY,  weekday, hour, minute, channelId };
        break;
      }
      case 'monthly': {
        const day = new Date().getDate();
        trigger = { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day, hour, minute, channelId };
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
        trigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date: targetDate, channelId };
        break;
      }
      default:
        trigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextOccurrence(hour, minute), channelId };
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: buildNotificationContent(task, settings),
      trigger,
    });

    console.log(`[NotifService] ✅ Programada [${task.priority}] canal=${channelId}: ${notificationId}`);
    return notificationId;
  } catch (err) {
    console.error('[NotifService] Error al programar:', err);
    return null;
  }
}

/**
 * Pospone una tarea X minutos desde ahora y programa una nueva notificación.
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
    const channelId = channelForPriority(taskPriority);
    const isLow = taskPriority === 'low';

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${emoji} Recordatorio (pospuesto ${minutes} min)`,
        body: taskText,
        data: { taskId, taskText, action: 'reminder', snoozed: true },
        sound: (!isLow && soundEnabled) ? true : false,
        categoryIdentifier: NOTIFICATION_CATEGORY_REMINDER,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeDate,
        channelId,
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

    const channelId = channelForPriority(task.priority);
    const ids: string[] = [];
    const SNOOZE_COUNT = 3;
    const base = nextOccurrence(task.reminderTime.hour, task.reminderTime.minute);

    for (let i = 1; i <= SNOOZE_COUNT; i++) {
      const snoozeDate = new Date(base.getTime() + i * task.snoozeInterval * 60 * 1000);
      const id = await Notifications.scheduleNotificationAsync({
        content: buildNotificationContent(task, settings,
          `${priorityEmoji(task.priority)} Recordatorio (${i}/${SNOOZE_COUNT})`,
          { snooze: true, snoozeIndex: i },
        ),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: snoozeDate,
          channelId,
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

    // La prueba usa el canal de alarma para que sea fácil verificar que funciona
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔴 ⚠️ URGENTE — Prueba de alarma',
        body: '¡Las notificaciones de alta prioridad funcionan correctamente!',
        sound: true,
        data: { taskText: 'Notificación de prueba', taskId: 'test', action: 'test' },
        categoryIdentifier: NOTIFICATION_CATEGORY_REMINDER,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: ANDROID_CHANNEL_ALARM,
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

// ── Notificación Persistente de Grabación Rápida ──────────────────────────────

/**
 * Muestra una notificación fija en el panel de notificaciones con un botón
 * para abrir directamente la pantalla de grabación de voz.
 *
 * Solo funciona en Android. En iOS no hay notificaciones persistentes.
 * Usa el canal QUICK (importancia MIN) para no molestar al usuario.
 */
export async function showPersistentNotification(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // Asegurarse de que los canales estén creados
    await initNotificationsLazy();

    // Cancelar la anterior si existe (para evitar duplicados)
    await hidePersistentNotification();

    await Notifications.scheduleNotificationAsync({
      identifier: PERSISTENT_NOTIFICATION_ID,
      content: {
        title: '🎤 recuérdame',
        body: 'Toca para grabar un nuevo recordatorio de voz',
        data: { action: 'open_record', screen: '/create/step1' },
        // Sin sonido ni vibración — es una notificación de acceso rápido
        sound: false,
        // Canal Android de importancia mínima (no interrumpe, no suena, no aparece en pantalla bloqueada)
        ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_QUICK }),
      },
      trigger: null, // Mostrar inmediatamente
    });

    console.log('[NotifService] Notificación persistente activada');
  } catch (err) {
    console.warn('[NotifService] Error al mostrar notificación persistente:', err);
  }
}

/**
 * Cancela la notificación persistente de grabación rápida.
 */
export async function hidePersistentNotification(): Promise<void> {
  try {
    // Intentar cancelar como notificación programada
    await Notifications.cancelScheduledNotificationAsync(PERSISTENT_NOTIFICATION_ID);
  } catch { /* ignore — puede que no exista */ }

  try {
    // También cancelar como notificación presentada (por si ya fue mostrada)
    await Notifications.dismissNotificationAsync(PERSISTENT_NOTIFICATION_ID);
  } catch { /* ignore */ }

  console.log('[NotifService] Notificación persistente desactivada');
}
