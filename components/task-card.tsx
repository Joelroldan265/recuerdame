import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Task, PRIORITY_CONFIG } from '@/lib/task-types';
import { PriorityBadge } from './priority-badge';
import { speak } from '@/lib/speech-service';

interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
  onComplete: (task: Task) => void;
  onSnooze?: (task: Task) => void;
  voiceSpeed?: number;
}

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
}

function getRepeatLabel(task: Task): string {
  const labels: Record<string, string> = {
    once: 'Una vez',
    daily: 'Diaria',
    weekly: 'Semanal',
    monthly: 'Mensual',
    custom: 'Fecha específica',
  };
  return labels[task.repeatType] ?? '';
}

export const TaskCard = memo(function TaskCard({
  task,
  onPress,
  onComplete,
  onSnooze,
  voiceSpeed = 1.0,
}: TaskCardProps) {
  const config = PRIORITY_CONFIG[task.priority];

  const handleComplete = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onComplete(task);
  };

  const handleSnooze = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSnooze?.(task);
  };

  const handleReadAloud = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    speak(task.text, voiceSpeed);
  };

  return (
    <Pressable
      onPress={() => onPress(task)}
      accessibilityRole="button"
      accessibilityLabel={`Tarea: ${task.text}. Prioridad ${config.label}. A las ${formatTime(task.reminderTime.hour, task.reminderTime.minute)}`}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: config.color, opacity: pressed ? 0.85 : 1 },
        task.completed && styles.completedCard,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <PriorityBadge priority={task.priority} size="sm" />
          <Text style={styles.time}>
            🕐 {formatTime(task.reminderTime.hour, task.reminderTime.minute)}
          </Text>
        </View>

        <Text
          style={[styles.text, task.completed && styles.completedText]}
          numberOfLines={3}
        >
          {task.text}
        </Text>

        <Text style={styles.repeat}>🔁 {getRepeatLabel(task)}</Text>
      </View>

      {!task.completed && (
        <View style={styles.actions}>
          <Pressable
            onPress={handleComplete}
            accessibilityRole="button"
            accessibilityLabel="Completar tarea"
            style={({ pressed }) => [styles.actionBtn, styles.completeBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.actionBtnText}>✅</Text>
          </Pressable>
          <Pressable
            onPress={handleReadAloud}
            accessibilityRole="button"
            accessibilityLabel="Leer en voz alta"
            style={({ pressed }) => [styles.actionBtn, styles.readBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.actionBtnText}>🔊</Text>
          </Pressable>
          {onSnooze && (
            <Pressable
              onPress={handleSnooze}
              accessibilityRole="button"
              accessibilityLabel="Posponer 15 minutos"
              style={({ pressed }) => [styles.actionBtn, styles.snoozeBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.actionBtnText}>⏰</Text>
            </Pressable>
          )}
        </View>
      )}

      {task.completed && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>✓</Text>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderLeftWidth: 5,
    marginVertical: 6,
    marginHorizontal: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  completedCard: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 28,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  time: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  repeat: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 12,
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtn: {
    backgroundColor: '#ECFDF5',
  },
  snoozeBtn: {
    backgroundColor: '#EFF6FF',
  },
  readBtn: {
    backgroundColor: '#FEF3C7',
  },
  actionBtnText: {
    fontSize: 22,
  },
  completedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0E9F6E',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  completedBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
