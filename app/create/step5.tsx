import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { BigButton } from '@/components/big-button';
import { StepIndicator } from '@/components/step-indicator';
import { speak, VOICE_MESSAGES } from '@/lib/speech-service';
import { useSettingsContext } from '@/lib/settings-context';
import { QUICK_TIMES, ReminderTime } from '@/lib/task-types';

const STEP_LABELS = ['Grabación', 'Confirmación', 'Prioridad', 'Repetición', 'Hora', 'Resumen'];

export default function Step5Screen() {
  const router = useRouter();
  const { settings } = useSettingsContext();
  const { text, priority, repeatType, customDay, customMonth, customYear } = useLocalSearchParams<{
    text: string;
    priority: string;
    repeatType: string;
    customDay?: string;
    customMonth?: string;
    customYear?: string;
  }>();

  const [selectedTime, setSelectedTime] = useState<ReminderTime | null>(null);
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
  const [customHour, setCustomHour] = useState(9);
  const [customMinute, setCustomMinute] = useState(0);
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    if (settings.soundEnabled) {
      speak(VOICE_MESSAGES.step5, settings.voiceSpeed);
    }
  }, []);

  const handleQuickSelect = useCallback((index: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const qt = QUICK_TIMES[index];
    setSelectedQuick(index);
    setSelectedTime({ hour: qt.hour, minute: qt.minute });
    setUseCustom(false);
  }, []);

  const handleHourChange = useCallback((delta: number) => {
    setCustomHour((prev) => (prev + delta + 24) % 24);
    setUseCustom(true);
    setSelectedQuick(null);
    setSelectedTime({ hour: (customHour + delta + 24) % 24, minute: customMinute });
  }, [customHour, customMinute]);

  const handleMinuteChange = useCallback((delta: number) => {
    const newMin = (customMinute + delta + 60) % 60;
    setCustomMinute(newMin);
    setUseCustom(true);
    setSelectedQuick(null);
    setSelectedTime({ hour: customHour, minute: newMin });
  }, [customHour, customMinute]);

  const formatTimeDisplay = (hour: number, minute: number) => {
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, '0');
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:${m} ${ampm}`;
  };

  const handleContinue = useCallback(() => {
    if (!selectedTime) return;
    const params: Record<string, string> = {
      text: text ?? '',
      priority: priority ?? 'medium',
      repeatType: repeatType ?? 'once',
      hour: selectedTime.hour.toString(),
      minute: selectedTime.minute.toString(),
    };
    if (customDay) params.customDay = customDay;
    if (customMonth) params.customMonth = customMonth;
    if (customYear) params.customYear = customYear;

    router.push({ pathname: '/create/step6', params });
  }, [selectedTime, text, priority, repeatType, router]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepIndicator currentStep={5} totalSteps={6} labels={STEP_LABELS} />

        <View style={styles.titleContainer}>
          <Text style={styles.title}>⏰ Hora del recordatorio</Text>
          <Text style={styles.subtitle}>¿A qué hora quieres que te recuerde?</Text>
        </View>

        {/* Opciones rápidas */}
        <View style={styles.quickSection}>
          <Text style={styles.sectionLabel}>Opciones rápidas</Text>
          <View style={styles.quickGrid}>
            {QUICK_TIMES.map((qt, i) => (
              <Pressable
                key={i}
                onPress={() => handleQuickSelect(i)}
                accessibilityRole="radio"
                accessibilityLabel={qt.label}
                accessibilityState={{ checked: selectedQuick === i }}
                style={({ pressed }) => [
                  styles.quickBtn,
                  selectedQuick === i && styles.quickBtnActive,
                  { transform: [{ scale: pressed ? 0.95 : 1 }] },
                ]}
              >
                <Text style={[styles.quickBtnText, selectedQuick === i && styles.quickBtnTextActive]}>
                  {qt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Reloj personalizado */}
        <View style={styles.clockSection}>
          <Text style={styles.sectionLabel}>Hora personalizada</Text>
          <View style={styles.clockDisplay}>
            {/* Horas */}
            <View style={styles.clockColumn}>
              <Pressable
                onPress={() => handleHourChange(1)}
                style={styles.clockArrow}
                accessibilityLabel="Aumentar hora"
              >
                <Text style={styles.clockArrowText}>▲</Text>
              </Pressable>
              <Text style={[styles.clockValue, useCustom && styles.clockValueActive]}>
                {(customHour % 12 || 12).toString().padStart(2, '0')}
              </Text>
              <Pressable
                onPress={() => handleHourChange(-1)}
                style={styles.clockArrow}
                accessibilityLabel="Disminuir hora"
              >
                <Text style={styles.clockArrowText}>▼</Text>
              </Pressable>
            </View>

            <Text style={styles.clockSeparator}>:</Text>

            {/* Minutos */}
            <View style={styles.clockColumn}>
              <Pressable
                onPress={() => handleMinuteChange(1)}
                style={styles.clockArrow}
                accessibilityLabel="Aumentar minutos"
              >
                <Text style={styles.clockArrowText}>▲</Text>
              </Pressable>
              <Text style={[styles.clockValue, useCustom && styles.clockValueActive]}>
                {customMinute.toString().padStart(2, '0')}
              </Text>
              <Pressable
                onPress={() => handleMinuteChange(-1)}
                style={styles.clockArrow}
                accessibilityLabel="Disminuir minutos"
              >
                <Text style={styles.clockArrowText}>▼</Text>
              </Pressable>
            </View>

            {/* AM/PM */}
            <View style={styles.clockColumn}>
              <Pressable
                onPress={() => handleHourChange(12)}
                style={styles.ampmBtn}
                accessibilityLabel="Cambiar AM/PM"
              >
                <Text style={[styles.ampmText, useCustom && styles.ampmTextActive]}>
                  {customHour < 12 ? 'AM' : 'PM'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Hora seleccionada */}
        {selectedTime && (
          <View style={styles.selectedDisplay}>
            <Text style={styles.selectedLabel}>Recordatorio a las:</Text>
            <Text style={styles.selectedTime}>
              🕐 {formatTimeDisplay(selectedTime.hour, selectedTime.minute)}
            </Text>
          </View>
        )}

        <BigButton
          label="✅ Guardar recordatorio"
          onPress={handleContinue}
          variant="success"
          fullWidth
          disabled={!selectedTime}
        />
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
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  quickSection: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  quickBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1A56DB',
  },
  quickBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
  },
  quickBtnTextActive: {
    color: '#1A56DB',
  },
  clockSection: {
    gap: 10,
  },
  clockDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  clockColumn: {
    alignItems: 'center',
    gap: 8,
  },
  clockArrow: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    minWidth: 60,
    alignItems: 'center',
  },
  clockArrowText: {
    fontSize: 20,
    color: '#374151',
    fontWeight: '700',
  },
  clockValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#9CA3AF',
    minWidth: 70,
    textAlign: 'center',
  },
  clockValueActive: {
    color: '#1A56DB',
  },
  clockSeparator: {
    fontSize: 42,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 8,
  },
  ampmBtn: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    minWidth: 60,
    alignItems: 'center',
  },
  ampmText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  ampmTextActive: {
    color: '#1A56DB',
  },
  selectedDisplay: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  selectedLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedTime: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0E9F6E',
  },
});
