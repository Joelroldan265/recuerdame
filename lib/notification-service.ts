import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Task, Settings } from './task-types';

let initialized = false;

// Configurar handler de notificaciones (llamar una sola vez al inicio del módulo)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function initNotificationsLazy(): Promise<boolean> {
  if (initialized) return true;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('recuerdame', {
        name: 'Recordatorios',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1A56DB',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    initialized = finalStatus === 'granted';
    return initialized;
  } catch (error) {
    console.error('[NotificationService] Error initializing:', error);
    return false;
  }
}

export async function scheduleTaskNotification(task: Task, settings: Settings): Promise<string | null> {
  try {
    const hasPermission = await initNotificationsLazy();
    if (!hasPermission) return null;

    // Verificar no molestar
    if (settings.doNotDisturbEnabled) {
      const { hour, minute } = task.reminderTime;
      const { doNotDisturbStart, doNotDisturbEnd } = settings;
      const taskMinutes = hour * 60 + minute;
      const startMinutes = doNotDisturbStart.hour * 60 + doNotDisturbStart.minute;
      const endMinutes = doNotDisturbEnd.hour * 60 + doNotDisturbEnd.minute;

      const inRange =
        startMinutes <= endMinutes
          ? taskMinutes >= startMinutes && taskMinutes <= endMinutes
          : taskMinutes >= startMinutes || taskMinutes <= endMinutes;

      if (inRange) return null;
    }

    const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';

    let trigger: Notifications.NotificationTriggerInput;

    if (task.repeatType === 'daily') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: task.reminderTime.hour,
        minute: task.reminderTime.minute,
      };
    } else if (task.repeatType === 'weekly') {
      const now = new Date();
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: now.getDay() + 1,
        hour: task.reminderTime.hour,
        minute: task.reminderTime.minute,
      };
    } else {
      // once, monthly, custom — programar para la próxima ocurrencia
      const now = new Date();
      const triggerDate = new Date();

      if (task.customDate) {
        triggerDate.setFullYear(task.customDate.year, task.customDate.month - 1, task.customDate.day);
      }

      triggerDate.setHours(task.reminderTime.hour, task.reminderTime.minute, 0, 0);

      if (triggerDate <= now) {
        triggerDate.setDate(triggerDate.getDate() + 1);
      }

      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      };
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${priorityEmoji} Recordatorio`,
        body: task.text,
        data: { taskId: task.id },
        sound: settings.soundEnabled ? 'default' : undefined,
      },
      trigger,
    });

    return notificationId;
  } catch (error) {
    console.error('[NotificationService] Error scheduling:', error);
    return null;
  }
}

export async function cancelTaskNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('[NotificationService] Error canceling:', error);
  }
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
