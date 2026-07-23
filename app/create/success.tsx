import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { BigButton } from '@/components/big-button';
import { PriorityBadge } from '@/components/priority-badge';
import { useTaskContext } from '@/lib/task-context';
import { useSettingsContext } from '@/lib/settings-context';
import { speak, VOICE_MESSAGES } from '@/lib/speech-service';
import { scheduleTaskNotification, scheduleSnoozeNotifications } from '@/lib/notification-service';
import { Task, Priority, RepeatType, SnoozeInterval, AdvanceMinutes } from '@/lib/task-types';
import { BatteryOptimizationGuide, shouldShowBatteryGuide, markBatteryGuideShown } from '@/components/battery-optimization-guide';

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
}

export default function SuccessScreen() {
  const router = useRouter();
  const { addTask, updateTask } = useTaskContext();
  const { settings } = useSettingsContext();
  const [showBatteryGuide, setShowBatteryGuide] = useState(false);
  const {
    text, priority, repeatType, hour, minute,
    customDay, customMonth, customYear, snoozeInterval, advanceMinutes,
  } = useLocalSearchParams<{
    text: string;
    priority: string;
    repeatType: string;
    hour: string;
    minute: string;
    snoozeInterval?: string;
    advanceMinutes?: string;
    customDay?: string;
    customMonth?: string;
    customYear?: string;
  }>();

  const taskHour = parseInt(hour ?? '9', 10);
  const taskMinute = parseInt(minute ?? '0', 10);
  const parsedSnooze = (parseInt(snoozeInterval ?? '0', 10) as SnoozeInterval) || 0;
  const parsedAdvance = (parseInt(advanceMinutes ?? '0', 10) as AdvanceMinutes) || 0;

  // Calcular la hora real de la notificación (restando los minutos de anticipación)
  const notifTotalMin = taskHour * 60 + taskMinute - parsedAdvance;
  const notifHour = ((Math.floor(notifTotalMin / 60)) % 24 + 24) % 24;
  const notifMinute = ((notifTotalMin % 60) + 60) % 60;

  useEffect(() => {
    const saveTask = async () => {
      const newTask: Task = {
        id: generateId(),
        text: text ?? '',
        priority: (priority as Priority) ?? 'medium',
        repeatType: (repeatType as RepeatType) ?? 'once',
        reminderTime: { hour: notifHour, minute: notifMinute },
        snoozeInterval: parsedSnooze,
        advanceMinutes: parsedAdvance,
        completed: false,
        createdAt: new Date().toISOString(),
        ...(customDay && customMonth && customYear ? {
          customDate: {
            day: parseInt(customDay, 10),
            month: parseInt(customMonth, 10),
            year: parseInt(customYear, 10),
          },
        } : {}),
      };

      await addTask(newTask);

      // Programar notificación principal (lazy)
      const notifId = await scheduleTaskNotification(newTask, settings);

      // Programar notificaciones de snooze si el intervalo es > 0
      let snoozeIds: string[] = [];
      if (parsedSnooze > 0) {
        snoozeIds = await scheduleSnoozeNotifications(newTask, settings);
      }

      // Guardar los IDs de notificación en la tarea para poder cancelarlos al eliminar
      if (notifId || snoozeIds.length > 0) {
        await updateTask(newTask.id, {
          notificationId: notifId ?? undefined,
          snoozeNotificationIds: snoozeIds.length > 0 ? snoozeIds : undefined,
        });
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (settings.soundEnabled) {
        speak(VOICE_MESSAGES.success, settings.voiceSpeed);
      }

      // Mostrar guía de optimización de batería la primera vez (solo Android)
      const needsGuide = await shouldShowBatteryGuide();
      if (needsGuide) {
        setShowBatteryGuide(true);
      }
    };

    saveTask();
  }, []);

  const handleCreateAnother = useCallback(() => {
    router.replace('/create/step1');
  }, [router]);

  const handleGoToTasks = useCallback(() => {
    router.replace('/(tabs)/tasks');
  }, [router]);

  const handleGoHome = useCallback(() => {
    router.replace('/');
  }, [router]);

  const snoozeLabel = parsedSnooze === 0
    ? 'Sin repetición'
    : `Cada ${parsedSnooze} min (3 veces más)`;

  return (
    <ScreenContainer>
      <BatteryOptimizationGuide
        visible={showBatteryGuide}
        onClose={() => setShowBatteryGuide(false)}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Animación de éxito */}
        <View style={styles.successIcon}>
          <Text style={styles.successEmoji}>🎉</Text>
        </View>

        <Text style={styles.title}>¡Recordatorio guardado!</Text>
        <Text style={styles.subtitle}>Tu recordatorio ha sido creado correctamente.</Text>

        {/* Resumen */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText} numberOfLines={3}>{text}</Text>

          <View style={styles.summaryDetails}>
            <PriorityBadge priority={(priority as Priority) ?? 'medium'} size="md" />
            <Text style={styles.summaryTime}>
              🕐 {formatTime(taskHour, taskMinute)}
            </Text>
          </View>

          <Text style={styles.summaryRepeat}>
            🔁 {repeatType === 'once' ? 'Una vez' :
                repeatType === 'daily' ? 'Diaria' :
                repeatType === 'weekly' ? 'Semanal' :
                repeatType === 'monthly' ? 'Mensual' :
                repeatType === 'custom-once' ? 'Una vez (fecha específica)' :
                repeatType === 'custom-daily' ? 'Diaria desde fecha específica' :
                repeatType === 'custom-weekly' ? 'Semanal desde fecha específica' :
                repeatType === 'custom-monthly' ? 'Mensual desde fecha específica' : 'Fecha específica'}
          </Text>

          {parsedSnooze > 0 && (
            <Text style={styles.summarySnooze}>
              ⏱️ {snoozeLabel}
            </Text>
          )}
        </View>

        {/* Acciones */}
        <View style={styles.actions}>
          <BigButton
            label="🎙️ Crear otro recordatorio"
            onPress={handleCreateAnother}
            variant="primary"
            fullWidth
          />
          <BigButton
            label="📋 Ver mis tareas"
            onPress={handleGoToTasks}
            variant="secondary"
            fullWidth
          />
          <BigButton
            label="🏠 Ir al inicio"
            onPress={handleGoHome}
            variant="ghost"
            fullWidth
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    gap: 20,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  successEmoji: {
    fontSize: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 30,
  },
  summaryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTime: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  summaryRepeat: {
    fontSize: 16,
    color: '#6B7280',
  },
  summarySnooze: {
    fontSize: 15,
    color: '#D97706',
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
});
