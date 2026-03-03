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
import { RepeatType, REPEAT_CONFIG } from '@/lib/task-types';

const STEP_LABELS = ['Grabación', 'Confirmación', 'Prioridad', 'Repetición', 'Hora'];

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

// ─── Componente de rueda numérica ────────────────────────────────────────────

interface WheelPickerProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

function WheelPicker({ label, value, min, max, onChange, format }: WheelPickerProps) {
  const handleUp = () => {
    const next = value < max ? value + 1 : min;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(next);
  };
  const handleDown = () => {
    const prev = value > min ? value - 1 : max;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(prev);
  };

  const displayValue = format ? format(value) : String(value).padStart(2, '0');

  return (
    <View style={wheelStyles.container}>
      <Text style={wheelStyles.label}>{label}</Text>
      <Pressable
        onPress={handleUp}
        style={wheelStyles.arrow}
        accessibilityLabel={`Aumentar ${label}`}
      >
        <Text style={wheelStyles.arrowText}>▲</Text>
      </Pressable>
      <View style={wheelStyles.valueBox}>
        <Text style={wheelStyles.value}>{displayValue}</Text>
      </View>
      <Pressable
        onPress={handleDown}
        style={wheelStyles.arrow}
        accessibilityLabel={`Disminuir ${label}`}
      >
        <Text style={wheelStyles.arrowText}>▼</Text>
      </Pressable>
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  arrow: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    width: '80%',
  },
  arrowText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '700',
  },
  valueBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: '#1A56DB',
    width: '80%',
    alignItems: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A56DB',
  },
});

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function Step4Screen() {
  const router = useRouter();
  const { settings } = useSettingsContext();
  const { text, priority } = useLocalSearchParams<{ text: string; priority: string }>();

  const [selected, setSelected] = useState<RepeatType | null>(null);

  const today = new Date();
  const [day, setDay] = useState(today.getDate());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [year, setYear] = useState(today.getFullYear());

  // Ajustar día si supera el máximo del mes seleccionado
  const maxDay = getDaysInMonth(month, year);
  const safeDay = day > maxDay ? maxDay : day;

  useEffect(() => {
    if (settings.soundEnabled) {
      speak(VOICE_MESSAGES.step4, settings.voiceSpeed);
    }
  }, []);

  const handleSelect = useCallback((repeatType: RepeatType) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelected(repeatType);
  }, []);

  const handleContinue = useCallback(() => {
    if (!selected) return;

    const params: Record<string, string> = {
      text: text ?? '',
      priority: priority ?? 'medium',
      repeatType: selected,
    };

    // Solo pasar customDate si el tipo es 'custom'
    if (selected === 'custom') {
      params.customDay = safeDay.toString();
      params.customMonth = month.toString();
      params.customYear = year.toString();
    }

    router.push({ pathname: '/create/step5', params });
  }, [selected, text, priority, safeDay, month, year, router]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepIndicator currentStep={4} totalSteps={5} labels={STEP_LABELS} />

        <View style={styles.titleContainer}>
          <Text style={styles.title}>🔁 Repetición</Text>
          <Text style={styles.subtitle}>¿Con qué frecuencia quieres este recordatorio?</Text>
        </View>

        {/* Opciones de repetición */}
        <View style={styles.options}>
          {(Object.keys(REPEAT_CONFIG) as RepeatType[]).map((repeatType) => {
            const config = REPEAT_CONFIG[repeatType];
            const isSelected = selected === repeatType;
            return (
              <Pressable
                key={repeatType}
                onPress={() => handleSelect(repeatType)}
                accessibilityRole="radio"
                accessibilityLabel={`${config.label}: ${config.description}`}
                accessibilityState={{ checked: isSelected }}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  { transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <Text style={styles.optionEmoji}>{config.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {config.label}
                  </Text>
                  <Text style={styles.optionDescription}>{config.description}</Text>
                </View>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* ── Selector de fecha personalizada ── */}
        {selected === 'custom' && (
          <View style={styles.datePicker}>
            <Text style={styles.datePickerTitle}>📅 Elige la fecha</Text>

            <View style={styles.datePickerRow}>
              {/* Día */}
              <WheelPicker
                label="Día"
                value={safeDay}
                min={1}
                max={maxDay}
                onChange={(v) => setDay(v)}
              />

              {/* Mes */}
              <WheelPicker
                label="Mes"
                value={month}
                min={1}
                max={12}
                onChange={(v) => setMonth(v)}
                format={(v) => MONTHS[v - 1].slice(0, 3)}
              />

              {/* Año */}
              <WheelPicker
                label="Año"
                value={year}
                min={today.getFullYear()}
                max={today.getFullYear() + 5}
                onChange={(v) => setYear(v)}
                format={(v) => String(v)}
              />
            </View>

            {/* Resumen de la fecha seleccionada */}
            <View style={styles.dateSummary}>
              <Text style={styles.dateSummaryText}>
                📌 {safeDay} de {MONTHS[month - 1]} de {year}
              </Text>
            </View>
          </View>
        )}

        <BigButton
          label="Continuar →"
          onPress={handleContinue}
          variant="primary"
          fullWidth
          disabled={!selected}
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
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  optionSelected: {
    borderColor: '#1A56DB',
    backgroundColor: '#EFF6FF',
    borderWidth: 3,
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  optionLabelSelected: {
    color: '#1A56DB',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A56DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // ── Date Picker ──────────────────────────────────────────
  datePicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 2,
    borderColor: '#1A56DB',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A56DB',
    textAlign: 'center',
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateSummary: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  dateSummaryText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A56DB',
  },
});
