import React, { useCallback, useEffect } from 'react';
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
import { scheduleTaskNotification } from '@/lib/notification-service';
import { Task, Priority, RepeatType } from '@/lib/task-types';

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
  const { addTask } = useTaskContext();
  const { settings } = useSettingsContext();
  const { text, priority, repeatType, hour, minute, customDay, customMonth, customYear } = useLocalSearchParams<{
    text: string;
    priority: string;
    repeatType: string;
    hour: string;
    minute: string;
    customDay?: string;
    customMonth?: string;
    customYear?: string;
  }>();

  const taskHour = parseInt(hour ?? '9', 10);
  const taskMinute = parseInt(minute ?? '0', 10);

  useEffect(() => {
    const saveTask = async () => {
      const newTask: Task = {
        id: generateId(),
        text: text ?? '',
        priority: (priority as Priority) ?? 'medium',
        repeatType: (repeatType as RepeatType) ?? 'once',
        reminderTime: { hour: taskHour, minute: taskMinute },
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

      // Programar notificación (lazy)
      const notifId = await scheduleTaskNotification(newTask, settings);
      if (notifId) {
        // Actualizar con ID de notificación (no bloquea la UI)
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (settings.soundEnabled) {
        speak(VOICE_MESSAGES.success, settings.voiceSpeed);
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

  return (
    <ScreenContainer>
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
                repeatType === 'monthly' ? 'Mensual' : 'Fecha específica'}
          </Text>
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
  actions: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
});
