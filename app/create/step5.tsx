'use client';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRef, useState, useCallback, useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { BigButton } from '@/components/big-button';
import { StepIndicator } from '@/components/step-indicator';
import { speak, VOICE_MESSAGES } from '@/lib/speech-service';
import { useSettingsContext } from '@/lib/settings-context';
import { QUICK_TIMES, SNOOZE_OPTIONS, ADVANCE_OPTIONS, ReminderTime, SnoozeInterval, AdvanceMinutes } from '@/lib/task-types';

const STEP_LABELS = ['Grabación', 'Confirmación', 'Prioridad', 'Repetición', 'Hora', 'Resumen'];

// ── Scroll Picker ──────────────────────────────────────────────────────────────
const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface ScrollPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width?: number;
}

function ScrollPicker({ items, selectedIndex, onSelect, width = 80 }: ScrollPickerProps) {
  const flatRef = useRef<FlatList>(null);
  const isScrolling = useRef(false);

  // Scroll to selected item on mount and when selectedIndex changes externally
  useEffect(() => {
    if (!isScrolling.current) {
      flatRef.current?.scrollToIndex({ index: selectedIndex, animated: false, viewPosition: 0.5 });
    }
  }, [selectedIndex]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrolling.current = false;
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      onSelect(clamped);
      // Snap to exact position
      flatRef.current?.scrollToIndex({ index: clamped, animated: true, viewPosition: 0.5 });
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    },
    [items.length, onSelect],
  );

  const handleScrollBegin = useCallback(() => {
    isScrolling.current = true;
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => {
      const isSelected = index === selectedIndex;
      return (
        <Pressable
          onPress={() => {
            onSelect(index);
            flatRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
            if (Platform.OS !== 'web') {
              Haptics.selectionAsync();
            }
          }}
          style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
        >
          <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
            {item}
          </Text>
        </Pressable>
      );
    },
    [selectedIndex, onSelect],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  // Padding items to center first and last
  const paddedItems = ['', '', ...items, '', ''];
  const paddedSelectedIndex = selectedIndex + 2;

  return (
    <View style={[styles.pickerContainer, { width }]}>
      {/* Selection highlight */}
      <View style={styles.pickerHighlight} pointerEvents="none" />
      <FlatList
        ref={flatRef}
        data={paddedItems}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => {
          const realIndex = index - 2;
          const isSelected = realIndex === selectedIndex;
          const isEdge = realIndex < 0 || realIndex >= items.length;
          return (
            <Pressable
              onPress={() => {
                if (isEdge) return;
                onSelect(realIndex);
                flatRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }
              }}
              style={[styles.pickerItem]}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  isSelected && styles.pickerItemTextSelected,
                  isEdge && { opacity: 0 },
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        }}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={(e) => {
          isScrolling.current = false;
          const offsetY = e.nativeEvent.contentOffset.y;
          const index = Math.round(offsetY / ITEM_HEIGHT);
          const realIndex = Math.max(0, Math.min(index, items.length - 1));
          onSelect(realIndex);
          if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
          }
        }}
        onScrollEndDrag={(e) => {
          // Handle case where momentum doesn't fire (slow scroll)
          const offsetY = e.nativeEvent.contentOffset.y;
          const index = Math.round(offsetY / ITEM_HEIGHT);
          const realIndex = Math.max(0, Math.min(index, items.length - 1));
          onSelect(realIndex);
          flatRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: true });
        }}
        initialScrollIndex={paddedSelectedIndex - 2}
        style={{ height: PICKER_HEIGHT }}
        contentContainerStyle={{ paddingVertical: 0 }}
      />
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')); // 01-12
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')); // 00-59
const AMPM = ['AM', 'PM'];

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

  // Scroll picker state (12-hour format)
  const [hourIndex, setHourIndex] = useState(8); // 09 (index 8 = "09")
  const [minuteIndex, setMinuteIndex] = useState(0); // 00
  const [ampmIndex, setAmpmIndex] = useState(0); // AM
  const [useCustom, setUseCustom] = useState(false);

  const [snoozeInterval, setSnoozeInterval] = useState<SnoozeInterval>(0);
  const [advanceMinutes, setAdvanceMinutes] = useState<AdvanceMinutes>(0);

  useEffect(() => {
    if (settings.soundEnabled) {
      speak(VOICE_MESSAGES.step5, settings.voiceSpeed);
    }
  }, []);

  // Convert 12h picker state to 24h hour
  const get24Hour = useCallback((hIdx: number, apIdx: number) => {
    const h12 = hIdx + 1; // index 0 = 1, index 11 = 12
    if (apIdx === 0) {
      // AM
      return h12 === 12 ? 0 : h12;
    } else {
      // PM
      return h12 === 12 ? 12 : h12 + 12;
    }
  }, []);

  const handleHourChange = useCallback((index: number) => {
    setHourIndex(index);
    setUseCustom(true);
    setSelectedQuick(null);
    const hour24 = get24Hour(index, ampmIndex);
    setSelectedTime({ hour: hour24, minute: minuteIndex });
  }, [ampmIndex, minuteIndex, get24Hour]);

  const handleMinuteChange = useCallback((index: number) => {
    setMinuteIndex(index);
    setUseCustom(true);
    setSelectedQuick(null);
    const hour24 = get24Hour(hourIndex, ampmIndex);
    setSelectedTime({ hour: hour24, minute: index });
  }, [hourIndex, ampmIndex, get24Hour]);

  const handleAmpmChange = useCallback((index: number) => {
    setAmpmIndex(index);
    setUseCustom(true);
    setSelectedQuick(null);
    const hour24 = get24Hour(hourIndex, index);
    setSelectedTime({ hour: hour24, minute: minuteIndex });
  }, [hourIndex, minuteIndex, get24Hour]);

  const handleQuickSelect = useCallback((index: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const qt = QUICK_TIMES[index];
    setSelectedQuick(index);
    setSelectedTime({ hour: qt.hour, minute: qt.minute });
    setUseCustom(false);
    // Sync pickers to quick time
    const h12 = qt.hour % 12 || 12;
    setHourIndex(h12 - 1);
    setMinuteIndex(qt.minute);
    setAmpmIndex(qt.hour < 12 ? 0 : 1);
  }, []);

  const handleSnoozeSelect = useCallback((value: SnoozeInterval) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSnoozeInterval(value);
  }, []);

  const handleAdvanceSelect = useCallback((value: AdvanceMinutes) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setAdvanceMinutes(value);
  }, []);

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
      snoozeInterval: snoozeInterval.toString(),
      advanceMinutes: advanceMinutes.toString(),
    };
    if (customDay) params.customDay = customDay;
    if (customMonth) params.customMonth = customMonth;
    if (customYear) params.customYear = customYear;

    router.push({ pathname: '/create/step6', params });
  }, [selectedTime, snoozeInterval, advanceMinutes, text, priority, repeatType, router, customDay, customMonth, customYear]);

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

        {/* ── Scroll Wheel Picker ── */}
        <View style={styles.clockSection}>
          <Text style={styles.sectionLabel}>Hora personalizada</Text>
          <View style={styles.pickerWrapper}>
            {/* Gradient overlays for fade effect */}
            <View style={styles.pickerFadeTop} pointerEvents="none" />
            <View style={styles.pickerFadeBottom} pointerEvents="none" />

            <View style={styles.pickerRow}>
              {/* Hours */}
              <View style={styles.pickerCol}>
                <Text style={styles.pickerColLabel}>Hora</Text>
                <ScrollPicker
                  items={HOURS_12}
                  selectedIndex={hourIndex}
                  onSelect={handleHourChange}
                  width={72}
                />
              </View>

              <Text style={styles.pickerSeparator}>:</Text>

              {/* Minutes */}
              <View style={styles.pickerCol}>
                <Text style={styles.pickerColLabel}>Min</Text>
                <ScrollPicker
                  items={MINUTES}
                  selectedIndex={minuteIndex}
                  onSelect={handleMinuteChange}
                  width={72}
                />
              </View>

              {/* AM/PM */}
              <View style={styles.pickerCol}>
                <Text style={styles.pickerColLabel}>AM/PM</Text>
                <ScrollPicker
                  items={AMPM}
                  selectedIndex={ampmIndex}
                  onSelect={handleAmpmChange}
                  width={72}
                />
              </View>
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

        {/* ── SECCIÓN: ¿Con cuánta anticipación te aviso? ── */}
        <View style={styles.advanceSection}>
          <Text style={styles.sectionLabel}>🔔 ¿Con cuánta anticipación te aviso?</Text>
          <Text style={styles.snoozeSubtitle}>
            ¿Quieres que te avise antes de la hora exacta?
          </Text>
          <View style={styles.advanceRoller}>
            {ADVANCE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handleAdvanceSelect(opt.value)}
                accessibilityRole="radio"
                accessibilityLabel={opt.label}
                accessibilityState={{ checked: advanceMinutes === opt.value }}
                style={({ pressed }) => [
                  styles.advanceItem,
                  advanceMinutes === opt.value && styles.advanceItemActive,
                  { transform: [{ scale: pressed ? 0.96 : 1 }] },
                ]}
              >
                <View style={[styles.advanceDot, advanceMinutes === opt.value && styles.advanceDotActive]} />
                <View style={styles.advanceTextWrap}>
                  <Text style={[styles.advanceLabel, advanceMinutes === opt.value && styles.advanceLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.advanceDesc, advanceMinutes === opt.value && styles.advanceDescActive]}>
                    {opt.description}
                  </Text>
                </View>
                {advanceMinutes === opt.value && (
                  <Text style={styles.advanceCheck}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>

          {advanceMinutes > 0 && selectedTime && (() => {
            const totalMinutes = selectedTime.hour * 60 + selectedTime.minute - advanceMinutes;
            const adjHour = ((Math.floor(totalMinutes / 60)) % 24 + 24) % 24;
            const adjMin = ((totalMinutes % 60) + 60) % 60;
            const h = adjHour % 12 || 12;
            const m = adjMin.toString().padStart(2, '0');
            const ampm = adjHour < 12 ? 'AM' : 'PM';
            return (
              <View style={styles.advanceInfo}>
                <Text style={styles.advanceInfoText}>
                  📣 Te avisaré a las {h}:{m} {ampm} ({advanceMinutes} min antes de las {formatTimeDisplay(selectedTime.hour, selectedTime.minute)})
                </Text>
              </View>
            );
          })()}
        </View>

        {/* ── SECCIÓN: ¿Cada cuánto te recuerdo? ── */}
        <View style={styles.snoozeSection}>
          <Text style={styles.sectionLabel}>🔔 ¿Cada cuánto te recuerdo?</Text>
          <Text style={styles.snoozeSubtitle}>
            Después del primer aviso, ¿quieres que te repita el recordatorio?
          </Text>
          <View style={styles.snoozeGrid}>
            {SNOOZE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handleSnoozeSelect(opt.value)}
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
            <View style={styles.snoozeInfo}>
              <Text style={styles.snoozeInfoText}>
                ⏱️ Te recordaré a las {selectedTime ? formatTimeDisplay(selectedTime.hour, selectedTime.minute) : '—'} y luego cada {snoozeInterval} minutos (3 veces más).
              </Text>
            </View>
          )}
        </View>

        <BigButton
          label="Siguiente →"
          onPress={handleContinue}
          variant="primary"
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
  // ── Scroll Picker ──
  clockSection: {
    gap: 10,
  },
  pickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pickerFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    zIndex: 10,
    // Gradient handled by opacity on items
  },
  pickerFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    zIndex: 10,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pickerCol: {
    alignItems: 'center',
    gap: 4,
  },
  pickerColLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pickerContainer: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  pickerHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    zIndex: 1,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemSelected: {},
  pickerItemText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  pickerItemTextSelected: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A56DB',
  },
  pickerSeparator: {
    fontSize: 36,
    fontWeight: '800',
    color: '#374151',
    marginTop: 28,
    marginHorizontal: 2,
  },
  // ── Selected display ──
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
  // ── Snooze ──
  snoozeSection: {
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  snoozeSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  snoozeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  snoozeBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 2,
  },
  snoozeBtnActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F59E0B',
  },
  snoozeBtnLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  snoozeBtnLabelActive: {
    color: '#D97706',
  },
  snoozeBtnDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  snoozeBtnDescActive: {
    color: '#D97706',
  },
  snoozeInfo: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  snoozeInfoText: {
    fontSize: 15,
    color: '#92400E',
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
  // ── Advance (anticipación) ──
  advanceSection: {
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  advanceRoller: {
    gap: 8,
  },
  advanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  advanceItemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1A56DB',
  },
  advanceDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  advanceDotActive: {
    borderColor: '#1A56DB',
    backgroundColor: '#1A56DB',
  },
  advanceTextWrap: {
    flex: 1,
    gap: 2,
  },
  advanceLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
  },
  advanceLabelActive: {
    color: '#1A56DB',
  },
  advanceDesc: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  advanceDescActive: {
    color: '#3B82F6',
  },
  advanceCheck: {
    fontSize: 20,
    color: '#1A56DB',
    fontWeight: '800',
  },
  advanceInfo: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  advanceInfoText: {
    fontSize: 15,
    color: '#1E40AF',
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
});
