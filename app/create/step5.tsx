import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  PanResponder,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
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

// ── Drum Picker (PanResponder — no nested ScrollView) ─────────────────────────
// Shows 3 items at a time. Drag up/down to change value.
// Uses PanResponder so it captures gestures independently of the outer ScrollView.

const ITEM_H = 52;
const VISIBLE = 3;
const DRUM_H = ITEM_H * VISIBLE;

interface DrumPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width?: number;
  label?: string;
}

function DrumPicker({ items, selectedIndex, onSelect, width = 80, label }: DrumPickerProps) {
  // translateY represents the drag offset (0 = resting)
  const translateY = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);
  const lastIndex = useRef(selectedIndex);

  // Keep lastIndex in sync when parent changes it (e.g. quick-time tap)
  useEffect(() => {
    lastIndex.current = selectedIndex;
    translateY.setValue(0);
  }, [selectedIndex, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Always capture the gesture — prevents outer ScrollView from stealing it
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,

        onPanResponderGrant: () => {
          dragStart.current = lastIndex.current;
          translateY.setValue(0);
        },

        onPanResponderMove: (_, gs) => {
          translateY.setValue(gs.dy);
        },

        onPanResponderRelease: (_, gs) => {
          // How many items did we drag past?
          const steps = -Math.round(gs.dy / ITEM_H);
          const next = Math.max(0, Math.min(dragStart.current + steps, items.length - 1));

          // Snap back to 0 with animation
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 200,
            friction: 20,
          }).start();

          if (next !== lastIndex.current) {
            lastIndex.current = next;
            onSelect(next);
            if (Platform.OS !== 'web') Haptics.selectionAsync();
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.length, onSelect],
  );

  // Indices of the three visible items
  const prevIdx = selectedIndex - 1;
  const nextIdx = selectedIndex + 1;

  const getLabel = (i: number) => {
    if (i < 0 || i >= items.length) return '';
    return items[i];
  };

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      {label ? <Text style={styles.drumLabel}>{label}</Text> : null}

      <View style={[styles.drumOuter, { width }]} {...panResponder.panHandlers}>
        {/* Selection highlight */}
        <View style={styles.drumHighlight} pointerEvents="none" />

        <Animated.View style={{ transform: [{ translateY }] }}>
          {/* Previous item */}
          <View style={styles.drumItem}>
            <Text style={styles.drumItemTextFaded}>{getLabel(prevIdx)}</Text>
          </View>

          {/* Selected item */}
          <Pressable
            style={styles.drumItem}
            onPress={() => {/* already selected */}}
          >
            <Text style={styles.drumItemTextSelected}>{getLabel(selectedIndex)}</Text>
          </Pressable>

          {/* Next item */}
          <View style={styles.drumItem}>
            <Text style={styles.drumItemTextFaded}>{getLabel(nextIdx)}</Text>
          </View>
        </Animated.View>

        {/* Tap arrows for +1 / -1 */}
        <Pressable
          style={styles.drumArrowTop}
          onPress={() => {
            const next = Math.max(0, selectedIndex - 1);
            if (next !== selectedIndex) {
              onSelect(next);
              if (Platform.OS !== 'web') Haptics.selectionAsync();
            }
          }}
          accessibilityLabel={`${label} anterior`}
          accessibilityRole="button"
        >
          <Text style={styles.drumArrowText}>▲</Text>
        </Pressable>

        <Pressable
          style={styles.drumArrowBottom}
          onPress={() => {
            const next = Math.min(items.length - 1, selectedIndex + 1);
            if (next !== selectedIndex) {
              onSelect(next);
              if (Platform.OS !== 'web') Haptics.selectionAsync();
            }
          }}
          accessibilityLabel={`${label} siguiente`}
          accessibilityRole="button"
        >
          <Text style={styles.drumArrowText}>▼</Text>
        </Pressable>
      </View>
    </View>
  );
}

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
  const [hourIndex,   setHourIndex]   = useState(8);  // "09"
  const [minuteIndex, setMinuteIndex] = useState(0);  // "00"
  const [ampmIndex,   setAmpmIndex]   = useState(0);  // "AM"
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);

  const [snoozeInterval,  setSnoozeInterval]  = useState<SnoozeInterval>(0);
  const [advanceMinutes, setAdvanceMinutes] = useState<AdvanceMinutes>(0);

  useEffect(() => {
    if (settings.soundEnabled) speak(VOICE_MESSAGES.step5, settings.voiceSpeed);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const get24Hour = useCallback((hIdx: number, apIdx: number) => {
    const h12 = hIdx + 1;
    if (apIdx === 0) return h12 === 12 ? 0 : h12;
    return h12 === 12 ? 12 : h12 + 12;
  }, []);

  const currentTime: ReminderTime = {
    hour:   get24Hour(hourIndex, ampmIndex),
    minute: minuteIndex,
  };

  const handleHourChange   = useCallback((i: number) => { setHourIndex(i);   setSelectedQuick(null); }, []);
  const handleMinuteChange = useCallback((i: number) => { setMinuteIndex(i); setSelectedQuick(null); }, []);
  const handleAmpmChange   = useCallback((i: number) => { setAmpmIndex(i);   setSelectedQuick(null); }, []);

  const handleQuickSelect = useCallback((i: number) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const qt = QUICK_TIMES[i];
    setSelectedQuick(i);
    const h12 = qt.hour % 12 || 12;
    setHourIndex(h12 - 1);
    setMinuteIndex(qt.minute);
    setAmpmIndex(qt.hour < 12 ? 0 : 1);
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

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        // Disable outer scroll while user is interacting with pickers
        // (PanResponder capture handles this automatically)
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

        {/* Drum Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Hora personalizada</Text>
          <Text style={styles.sectionSub}>Arrastra arriba/abajo o usa las flechas ▲▼</Text>
          <View style={styles.drumRow}>
            <DrumPicker
              label="Hora"
              items={HOURS_12}
              selectedIndex={hourIndex}
              onSelect={handleHourChange}
              width={80}
            />
            <Text style={styles.colon}>:</Text>
            <DrumPicker
              label="Min"
              items={MINUTES}
              selectedIndex={minuteIndex}
              onSelect={handleMinuteChange}
              width={80}
            />
            <DrumPicker
              label="AM/PM"
              items={AMPM}
              selectedIndex={ampmIndex}
              onSelect={handleAmpmChange}
              width={80}
            />
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
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, advanceMinutes === opt.value && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.optionDesc, advanceMinutes === opt.value && styles.optionDescActive]}>
                    {opt.description}
                  </Text>
                </View>
                {advanceMinutes === opt.value && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            ))}
          </View>
          {advanceMinutes > 0 && (() => {
            const total = currentTime.hour * 60 + currentTime.minute - advanceMinutes;
            const ah = ((Math.floor(total / 60)) % 24 + 24) % 24;
            const am = ((total % 60) + 60) % 60;
            return (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  📣 Te avisaré a las {formatTime(ah, am)} ({advanceMinutes} min antes de las {formatTime(currentTime.hour, currentTime.minute)})
                </Text>
              </View>
            );
          })()}
        </View>

        {/* Snooze */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🔁 ¿Cada cuánto te recuerdo?</Text>
          <Text style={styles.sectionSub}>Después del primer aviso, ¿quieres que te repita el recordatorio?</Text>
          <View style={styles.snoozeGrid}>
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
                  styles.snoozeBtn,
                  snoozeInterval === opt.value && styles.snoozeBtnActive,
                  { transform: [{ scale: pressed ? 0.95 : 1 }] },
                ]}
              >
                <Text style={[styles.snoozeBtnLabel, snoozeInterval === opt.value && styles.snoozeBtnLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={[styles.snoozeBtnDesc, snoozeInterval === opt.value && styles.snoozeBtnDescActive]}>
                  {opt.description}
                </Text>
              </Pressable>
            ))}
          </View>
          {snoozeInterval > 0 && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ⏱️ Te recordaré a las {formatTime(currentTime.hour, currentTime.minute)} y luego cada {snoozeInterval} minutos (3 veces más).
              </Text>
            </View>
          )}
        </View>

        <BigButton
          label="Siguiente →"
          onPress={handleContinue}
          variant="primary"
          fullWidth
        />
      </ScrollView>
    </ScreenContainer>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  titleContainer: { gap: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#11181C' },
  subtitle: { fontSize: 15, color: '#687076' },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSub: { fontSize: 13, color: '#687076', marginTop: -4 },

  // Quick times
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  quickBtnActive: { backgroundColor: '#EBF5FF', borderColor: '#1A56DB' },
  quickBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  quickBtnTextActive: { color: '#1A56DB' },

  // Drum picker
  drumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  colon: {
    fontSize: 28,
    fontWeight: '700',
    color: '#374151',
    marginBottom: ITEM_H / 2 + 8,
    paddingHorizontal: 2,
  },
  drumLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  drumOuter: {
    height: DRUM_H,
    overflow: 'hidden',
    borderRadius: 12,
    position: 'relative',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  drumHighlight: {
    position: 'absolute',
    top: ITEM_H,
    left: 0,
    right: 0,
    height: ITEM_H,
    backgroundColor: 'rgba(26, 86, 219, 0.07)',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#1A56DB',
    zIndex: 1,
  },
  drumItem: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drumItemTextFaded: {
    fontSize: 18,
    fontWeight: '400',
    color: '#D1D5DB',
  },
  drumItemTextSelected: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A56DB',
  },
  drumArrowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  drumArrowBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  drumArrowText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // Selected display
  selectedDisplay: {
    backgroundColor: '#EBF5FF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  selectedLabel: { fontSize: 13, color: '#1A56DB', fontWeight: '500' },
  selectedTime: { fontSize: 28, fontWeight: '700', color: '#1A56DB' },

  // Option rows (advance)
  advanceList: { gap: 8 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  optionRowActive: { backgroundColor: '#EBF5FF', borderColor: '#1A56DB' },
  optionDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  optionDotActive: { borderColor: '#1A56DB', backgroundColor: '#1A56DB' },
  optionLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  optionLabelActive: { color: '#1A56DB' },
  optionDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  optionDescActive: { color: '#60A5FA' },
  checkmark: { fontSize: 16, fontWeight: '700', color: '#1A56DB' },

  // Snooze
  snoozeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  snoozeBtn: {
    flex: 1,
    minWidth: '44%',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 4,
  },
  snoozeBtnActive: { backgroundColor: '#EBF5FF', borderColor: '#1A56DB' },
  snoozeBtnLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  snoozeBtnLabelActive: { color: '#1A56DB' },
  snoozeBtnDesc: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
  snoozeBtnDescActive: { color: '#60A5FA' },

  // Info box
  infoBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 4,
  },
  infoText: { fontSize: 13, color: '#065F46', lineHeight: 18 },
});
