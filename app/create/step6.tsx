import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { BigButton } from '@/components/big-button';
import { PriorityBadge } from '@/components/priority-badge';
import { StepIndicator } from '@/components/step-indicator';
import { speak, VOICE_MESSAGES } from '@/lib/speech-service';
import { useSettingsContext } from '@/lib/settings-context';
import { useEffect } from 'react';
import { Priority, SnoozeInterval } from '@/lib/task-types';

const STEP_LABELS = ['Grabación', 'Confirmación', 'Prioridad', 'Repetición', 'Hora', 'Resumen'];

const REPEAT_LABELS: Record<string, string> = {
  once: 'Una sola vez',
  daily: 'Todos los días',
  weekly: 'Cada semana',
  monthly: 'Cada mes',
  custom: 'Fecha específica',
};

const REPEAT_EMOJIS: Record<string, string> = {
  once: '1️⃣',
  daily: '🔁',
  weekly: '📅',
  monthly: '🗓️',
  custom: '📌',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta — te avisaré con urgencia',
  medium: 'Media — aviso normal',
  low: 'Baja — aviso suave',
};

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
}

function formatCustomDate(day: string, month: string, year: string): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const monthName = months[parseInt(month, 10) - 1] ?? '';
  return `${day} de ${monthName} de ${year}`;
}

export default function Step6Screen() {
  const router = useRouter();
  const { settings } = useSettingsContext();
  const {
    text,
    priority,
    repeatType,
    hour,
    minute,
    customDay,
    customMonth,
    customYear,
    snoozeInterval,
  } = useLocalSearchParams<{
    text: string;
    priority: string;
    repeatType: string;
    hour: string;
    minute: string;
    snoozeInterval?: string;
    customDay?: string;
    customMonth?: string;
    customYear?: string;
  }>();

  const parsedSnooze = (parseInt(snoozeInterval ?? '0', 10) as SnoozeInterval) || 0;
  const snoozeLabel = parsedSnooze === 0
    ? 'Sin repetición adicional'
    : `Cada ${parsedSnooze} min (3 veces más)`;

  const taskHour = parseInt(hour ?? '9', 10);
  const taskMinute = parseInt(minute ?? '0', 10);
  const repeatLabel = REPEAT_LABELS[repeatType ?? 'once'] ?? 'Una sola vez';
  const repeatEmoji = REPEAT_EMOJIS[repeatType ?? 'once'] ?? '1️⃣';

  useEffect(() => {
    if (settings.soundEnabled) {
      const summary = `Tu recordatorio: ${text}. A las ${formatTime(taskHour, taskMinute)}. ${repeatLabel}.`;
      speak(summary, settings.voiceSpeed);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    const params: Record<string, string> = {
      text: text ?? '',
      priority: priority ?? 'medium',
      repeatType: repeatType ?? 'once',
      hour: hour ?? '9',
      minute: minute ?? '0',
    };
    if (customDay) params.customDay = customDay;
    if (customMonth) params.customMonth = customMonth;
    if (customYear) params.customYear = customYear;
    params.snoozeInterval = parsedSnooze.toString();

    router.push({ pathname: '/create/success', params });
  }, [text, priority, repeatType, hour, minute, customDay, customMonth, customYear, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepIndicator currentStep={6} totalSteps={6} labels={STEP_LABELS} />

        <View style={styles.titleContainer}>
          <Text style={styles.title}>📋 Resumen</Text>
          <Text style={styles.subtitle}>Revisa tu recordatorio antes de guardarlo</Text>
        </View>

        {/* Tarjeta de resumen completa */}
        <View style={styles.summaryCard}>

          {/* Texto del recordatorio */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>💬</Text>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Recordatorio</Text>
              <Text style={styles.summaryValue} numberOfLines={4}>{text}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Prioridad */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>🎯</Text>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Prioridad</Text>
              <View style={styles.priorityRow}>
                <PriorityBadge priority={(priority as Priority) ?? 'medium'} size="md" />
                <Text style={styles.summarySubtext}>
                  {PRIORITY_LABELS[priority ?? 'medium']}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Hora */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>⏰</Text>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>¿A qué hora te recuerdo?</Text>
              <Text style={styles.summaryValueLarge}>
                {formatTime(taskHour, taskMinute)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Repetición */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>{repeatEmoji}</Text>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>¿Cada cuánto te recuerdo?</Text>
              <Text style={styles.summaryValueLarge}>{repeatLabel}</Text>
              {repeatType === 'custom' && customDay && customMonth && customYear && (
                <Text style={styles.summarySubtext}>
                  📌 {formatCustomDate(customDay, customMonth, customYear)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Snooze */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>⏱️</Text>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Repetición post-aviso</Text>
              <Text style={[styles.summaryValueLarge, parsedSnooze > 0 && { color: '#D97706' }]}>
                {snoozeLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.actions}>
          <BigButton
            label="✅ ¡Guardar recordatorio!"
            onPress={handleConfirm}
            variant="success"
            fullWidth
          />
          <BigButton
            label="← Cambiar la hora"
            onPress={handleBack}
            variant="secondary"
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
    padding: 20,
    gap: 20,
  },
  titleContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  summaryIcon: {
    fontSize: 28,
    marginTop: 2,
    width: 36,
    textAlign: 'center',
  },
  summaryContent: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 28,
  },
  summaryValueLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A56DB',
    lineHeight: 32,
  },
  summarySubtext: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 2,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: -4,
  },
  actions: {
    gap: 12,
  },
});
