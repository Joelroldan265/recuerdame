import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
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
    'custom-once': 'Una vez en fecha específica',
    'custom-daily': 'Diaria desde fecha específica',
    'custom-weekly': 'Semanal desde fecha específica',
    'custom-monthly': 'Mensual desde fecha específica',
  };
  return labels[task.repeatType] ?? '';
}

/** Componente interno que pulsa suavemente para las tarjetas de alarma */
function AlarmPulse() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.04, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1,    duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8,  duration: 700, useNativeDriver: true }),
        ]),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [scale, opacity]);

  return (
    <Animated.View style={[styles.alarmBadge, { transform: [{ scale }], opacity }]}>
      <Text style={styles.alarmBadgeText}>🔔 ALARMA</Text>
    </Animated.View>
  );
}

export const TaskCard = memo(function TaskCard({
  task,
  onPress,
  onComplete,
  onSnooze,
  voiceSpeed = 1.0,
}: TaskCardProps) {
  const config = PRIORITY_CONFIG[task.priority];
  const isHighPriority = task.priority === 'high';

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
      accessibilityLabel={`Tarea${isHighPriority ? ' urgente con alarma' : ''}: ${task.text}. Prioridad ${config.label}. A las ${formatTime(task.reminderTime.hour, task.reminderTime.minute)}`}
      style={({ pressed }) => [
        styles.card,
        isHighPriority && styles.cardHighPriority,
        { borderLeftColor: config.color, opacity: pressed ? 0.85 : 1 },
        task.completed && styles.completedCard,
      ]}
    >
      {/* Franja superior de alarma — solo para prioridad alta */}
      {isHighPriority && !task.completed && (
        <View style={styles.alarmStripe}>
          <Text style={styles.alarmStripeText}>⚠️ PRIORIDAD ALTA — ALARMA ACTIVADA</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <PriorityBadge priority={task.priority} size="sm" />
            {/* Badge pulsante de alarma */}
            {isHighPriority && !task.completed && <AlarmPulse />}
          </View>
          <Text style={styles.time}>
            🕐 {formatTime(task.reminderTime.hour, task.reminderTime.minute)}
          </Text>
        </View>

        <Text
          style={[
            styles.text,
            isHighPriority && styles.textHighPriority,
            task.completed && styles.completedText,
          ]}
          numberOfLines={3}
        >
          {task.text}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.repeat}>🔁 {getRepeatLabel(task)}</Text>
          {isHighPriority && !task.completed && (
            <Text style={styles.alarmNote}>Sonará aunque el teléfono esté en silencio</Text>
          )}
        </View>
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  /** Tarjeta de alta prioridad: fondo levemente rojizo y sombra más pronunciada */
  cardHighPriority: {
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 6,
    shadowColor: '#EF4444',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  /** Franja roja en la parte superior */
  alarmStripe: {
    backgroundColor: '#EF4444',
    paddingVertical: 5,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  alarmStripeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  completedCard: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    gap: 6,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  /** Badge pulsante 🔔 ALARMA */
  alarmBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  alarmBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 28,
  },
  textHighPriority: {
    color: '#7F1D1D',
    fontWeight: '700',
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
  footer: {
    gap: 2,
  },
  repeat: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  alarmNote: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 4,
    paddingRight: 12,
    paddingVertical: 16,
    alignSelf: 'flex-end',
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
    alignSelf: 'center',
  },
  completedBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
