import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { BigButton } from '@/components/big-button';
import { StepIndicator } from '@/components/step-indicator';
import { speak, VOICE_MESSAGES } from '@/lib/speech-service';
import { useSettingsContext } from '@/lib/settings-context';
import {
  QUICK_TIMES,
  SNOOZE_OPTIONS,
  ADVANCE_OPTIONS,
  ReminderTime,
  SnoozeInterval,
  AdvanceMinutes,
} from '@/lib/task-types';

const STEP_LABELS = ['Grabación', 'Confirmación', 'Prioridad', 'Repetición', 'Hora', 'Resumen'];

// ── Data ───────────────────────────────────────────────────────────────────────
const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES  = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const AMPM     = ['AM', 'PM'];

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function Step5Screen() {
  const router = useRouter();
  const { settings } = useSettingsContext();
  const { text, priority, repeatType, customDay, customMonth, customYear } =
    useLocalSearchParams<{
      text: string;
      priority: string;
      repeatType: string;
      customDay?: string;
      customMonth?: string;
      customYear?: string;
    }>();

  // Default 9:00 AM — button always enabled
  const [hourVal,   setHourVal]   = useState('09');
  const [minuteVal, setMinuteVal] = useState('00');
  const [ampmVal,   setAmpmVal]   = useState('AM');
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);

  const [snoozeInterval,  setSnoozeInterval]  = useState<SnoozeInterval>(0);
  const [advanceMinutes, setAdvanceMinutes] = useState<AdvanceMinutes>(0);

  useEffect(() => {
    if (settings.soundEnabled) speak(VOICE_MESSAGES.step5, settings.voiceSpeed);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const get24Hour = useCallback((hStr: string, ap: string) => {
    const h12 = parseInt(hStr, 10);
    if (ap === 'AM') return h12 === 12 ? 0 : h12;
    return h12 === 12 ? 12 : h12 + 12;
  }, []);

  const currentTime: ReminderTime = {
    hour:   get24Hour(hourVal, ampmVal),
    minute: parseInt(minuteVal, 10),
  };

  const handleHourChange   = useCallback((v: string) => { setHourVal(v);   setSelectedQuick(null); }, []);
  const handleMinuteChange = useCallback((v: string) => { setMinuteVal(v); setSelectedQuick(null); }, []);
  const handleAmpmChange   = useCallback((v: string) => { setAmpmVal(v);   setSelectedQuick(null); }, []);

  const handleQuickSelect = useCallback((i: number) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const qt = QUICK_TIMES[i];
    setSelectedQuick(i);
    const h12 = qt.hour % 12 || 12;
    setHourVal(String(h12).padStart(2, '0'));
    setMinuteVal(String(qt.minute).padStart(2, '0'));
    setAmpmVal(qt.hour < 12 ? 'AM' : 'PM');
  }, []);

  const formatTime = (hour: number, minute: number) => {
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m} ${hour < 12 ? 'AM' : 'PM'}`;
  };

  const handleContinue = useCallback(() => {
    const params: Record<string, string> = {
      text:           text ?? '',
      priority:       priority ?? 'medium',
      repeatType:     repeatType ?? 'once',
      hour:           currentTime.hour.toString(),
      minute:         currentTime.minute.toString(),
      snoozeInterval: snoozeInterval.toString(),
      advanceMinutes: advanceMinutes.toString(),
    };
    if (customDay)   params.customDay   = customDay;
    if (customMonth) params.customMonth = customMonth;
    if (customYear)  params.customYear  = customYear;
    router.push({ pathname: '/create/step6', params });
  }, [currentTime, snoozeInterval, advanceMinutes, text, priority, repeatType, customDay, customMonth, customYear, router]);

  // Picker style varies by platform
  const pickerStyle = Platform.OS === 'ios'
    ? styles.pickerIOS
    : styles.pickerAndroid;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator currentStep={5} totalSteps={6} labels={STEP_LABELS} />

        <View style={styles.titleContainer}>
          <Text style={styles.title}>⏰ Hora del recordatorio</Text>
          <Text style={styles.subtitle}>¿A qué hora quieres que te recuerde?</Text>
        </View>

        {/* Opciones rápidas */}
        <View style={styles.section}>
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

        {/* Native Wheel Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Hora personalizada</Text>
          <View style={styles.pickerRow}>
            {/* Hours */}
            <View style={styles.pickerCol}>
              <Text style={styles.pickerColLabel}>Hora</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={hourVal}
                  onValueChange={handleHourChange}
                  style={pickerStyle}
                  itemStyle={styles.pickerItem}
                  accessibilityLabel="Seleccionar hora"
                >
                  {HOURS_12.map((h) => (
                    <Picker.Item key={h} label={h} value={h} />
                  ))}
                </Picker>
              </View>
            </View>

            <Text style={styles.colon}>:</Text>

            {/* Minutes */}
            <View style={styles.pickerCol}>
              <Text style={styles.pickerColLabel}>Min</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={minuteVal}
                  onValueChange={handleMinuteChange}
                  style={pickerStyle}
                  itemStyle={styles.pickerItem}
                  accessibilityLabel="Seleccionar minutos"
                >
                  {MINUTES.map((m) => (
                    <Picker.Item key={m} label={m} value={m} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* AM/PM */}
            <View style={styles.pickerCol}>
              <Text style={styles.pickerColLabel}>AM/PM</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={ampmVal}
                  onValueChange={handleAmpmChange}
                  style={pickerStyle}
                  itemStyle={styles.pickerItem}
                  accessibilityLabel="Seleccionar AM o PM"
                >
                  {AMPM.map((ap) => (
                    <Picker.Item key={ap} label={ap} value={ap} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Hora seleccionada */}
        <View style={styles.selectedDisplay}>
          <Text style={styles.selectedLabel}>Recordatorio a las:</Text>
          <Text style={styles.selectedTime}>
            🕐 {formatTime(currentTime.hour, currentTime.minute)}
          </Text>
        </View>

        {/* Anticipación */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🔔 ¿Con cuánta anticipación te aviso?</Text>
          <Text style={styles.sectionSub}>¿Quieres que te avise antes de la hora exacta?</Text>
          <View style={styles.advanceList}>
            {ADVANCE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAdvanceMinutes(opt.value);
                }}
                accessibilityRole="radio"
                accessibilityLabel={opt.label}
                accessibilityState={{ checked: advanceMinutes === opt.value }}
                style={({ pressed }) => [
                  styles.optionRow,
                  advanceMinutes === opt.value && styles.optionRowActive,
                  { transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <View style={[styles.optionDot, advanceMinutes === opt.value && styles.optionDotActive]} />
                <Text style={[styles.optionText, advanceMinutes === opt.value && styles.optionTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Repetición de snooze */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🔁 Repetir recordatorio</Text>
          <Text style={styles.sectionSub}>¿Quieres que se repita si no lo atiendes?</Text>
          <View style={styles.snoozeList}>
            {SNOOZE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSnoozeInterval(opt.value);
                }}
                accessibilityRole="radio"
                accessibilityLabel={opt.label}
                accessibilityState={{ checked: snoozeInterval === opt.value }}
                style={({ pressed }) => [
                  styles.optionRow,
                  snoozeInterval === opt.value && styles.optionRowActive,
                  { transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <View style={[styles.optionDot, snoozeInterval === opt.value && styles.optionDotActive]} />
                <Text style={[styles.optionText, snoozeInterval === opt.value && styles.optionTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Botón continuar */}
        <BigButton
          label="Siguiente →"
          onPress={handleContinue}
          variant="primary"
          fullWidth
          style={styles.continueBtn}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 16, gap: 16 },
  titleContainer: { gap: 4 },
  title:    { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6B7280' },

  section:      { gap: 10 },
  sectionLabel: { fontSize: 17, fontWeight: '700', color: '#374151' },
  sectionSub:   { fontSize: 14, color: '#9CA3AF' },

  // Quick time buttons
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#E5E7EB',
  },
  quickBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#1A56DB' },
  quickBtnText:       { fontSize: 15, fontWeight: '600', color: '#374151' },
  quickBtnTextActive: { color: '#1A56DB' },

  // Native Picker row
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 4,
    gap: 0,
  },
  pickerCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  pickerColLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  pickerWrapper: {
    width: '100%',
    overflow: 'hidden',
  },
  pickerIOS: {
    width: '100%',
    height: 150,
  },
  pickerAndroid: {
    width: '100%',
    height: 56,
    color: '#111827',
  },
  pickerItem: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  colon: {
    fontSize: 32,
    fontWeight: '800',
    color: '#374151',
    marginBottom: Platform.OS === 'ios' ? 0 : 4,
    paddingHorizontal: 4,
  },

  // Selected time display
  selectedDisplay: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    gap: 4,
  },
  selectedLabel: { fontSize: 15, color: '#3B82F6', fontWeight: '600' },
  selectedTime:  { fontSize: 32, fontWeight: '800', color: '#1A56DB' },

  // Option rows (advance / snooze)
  advanceList: { gap: 8 },
  snoozeList:  { gap: 8 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14,
    borderWidth: 2, borderColor: '#E5E7EB',
  },
  optionRowActive: { backgroundColor: '#EFF6FF', borderColor: '#1A56DB' },
  optionDot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF',
  },
  optionDotActive: { borderColor: '#1A56DB', backgroundColor: '#1A56DB' },
  optionText:       { fontSize: 16, color: '#374151', fontWeight: '600', flex: 1 },
  optionTextActive: { color: '#1A56DB' },

  // Continue button
  continueBtn: { marginTop: 8 },
});
