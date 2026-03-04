import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { BigButton } from '@/components/big-button';
import { PriorityBadge } from '@/components/priority-badge';
import { StepIndicator } from '@/components/step-indicator';
import { speak } from '@/lib/speech-service';
import { useSettingsContext } from '@/lib/settings-context';
import { Priority, SnoozeInterval, AdvanceMinutes, RepeatType } from '@/lib/task-types';
import * as Haptics from 'expo-haptics';

const STEP_LABELS = ['Grabación', 'Confirmación', 'Prioridad', 'Repetición', 'Hora', 'Resumen'];

const REPEAT_OPTIONS: Array<{ value: RepeatType; label: string; emoji: string }> = [
  { value: 'once',    label: 'Una sola vez',    emoji: '1️⃣' },
  { value: 'daily',   label: 'Todos los días',  emoji: '🔁' },
  { value: 'weekly',  label: 'Cada semana',     emoji: '📅' },
  { value: 'monthly', label: 'Cada mes',        emoji: '🗓️' },
];

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string; emoji: string; color: string }> = [
  { value: 'high',   label: 'Alta',  emoji: '🔴', color: '#FF5A1F' },
  { value: 'medium', label: 'Media', emoji: '🟡', color: '#E3A008' },
  { value: 'low',    label: 'Baja',  emoji: '🟢', color: '#0E9F6E' },
];

const ADVANCE_OPTIONS: Array<{ value: AdvanceMinutes; label: string }> = [
  { value: 0,  label: '⏰ Justo a la hora' },
  { value: 5,  label: '5 min antes' },
  { value: 10, label: '10 min antes' },
  { value: 15, label: '15 min antes' },
  { value: 30, label: '30 min antes' },
];

const SNOOZE_OPTIONS: Array<{ value: SnoozeInterval; label: string }> = [
  { value: 0,  label: 'Sin repetición' },
  { value: 5,  label: 'Cada 5 min (×3)' },
  { value: 10, label: 'Cada 10 min (×3)' },
  { value: 15, label: 'Cada 15 min (×3)' },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);   // 1–12
const MINUTES = Array.from({ length: 60 }, (_, i) => i);     // 0–59

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
}

export default function Step6Screen() {
  const router = useRouter();
  const { settings } = useSettingsContext();
  const params = useLocalSearchParams<{
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

  // ── Estado editable ───────────────────────────────────────────────────────────
  const [editText, setEditText]           = useState(params.text ?? '');
  const [editPriority, setEditPriority]   = useState<Priority>((params.priority as Priority) ?? 'medium');
  const [editRepeat, setEditRepeat]       = useState<RepeatType>((params.repeatType as RepeatType) ?? 'once');
  const [editHour, setEditHour]           = useState(parseInt(params.hour ?? '9', 10));
  const [editMinute, setEditMinute]       = useState(parseInt(params.minute ?? '0', 10));
  const [editAdvance, setEditAdvance]     = useState<AdvanceMinutes>((parseInt(params.advanceMinutes ?? '0', 10) as AdvanceMinutes) || 0);
  const [editSnooze, setEditSnooze]       = useState<SnoozeInterval>((parseInt(params.snoozeInterval ?? '0', 10) as SnoozeInterval) || 0);

  // Secciones expandibles
  const [expandText, setExpandText]       = useState(false);
  const [expandPriority, setExpandPriority] = useState(false);
  const [expandTime, setExpandTime]       = useState(false);
  const [expandRepeat, setExpandRepeat]   = useState(false);
  const [expandAdvance, setExpandAdvance] = useState(false);
  const [expandSnooze, setExpandSnooze]   = useState(false);

  // Picker de hora
  const pickerHour12 = editHour % 12 || 12;
  const pickerAmPm   = editHour < 12 ? 'AM' : 'PM';

  function applyPickerTime(h12: number, ampm: string, minute: number) {
    let h24 = h12 % 12;
    if (ampm === 'PM') h24 += 12;
    setEditHour(h24);
    setEditMinute(minute);
  }

  useEffect(() => {
    if (settings.soundEnabled) {
      const summary = `Tu recordatorio: ${editText}. A las ${formatTime(editHour, editMinute)}.`;
      speak(summary, settings.voiceSpeed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const p: Record<string, string> = {
      text:           editText,
      priority:       editPriority,
      repeatType:     editRepeat,
      hour:           editHour.toString(),
      minute:         editMinute.toString(),
      snoozeInterval: editSnooze.toString(),
      advanceMinutes: editAdvance.toString(),
    };
    if (params.customDay)   p.customDay   = params.customDay;
    if (params.customMonth) p.customMonth = params.customMonth;
    if (params.customYear)  p.customYear  = params.customYear;
    router.push({ pathname: '/create/success', params: p });
  }, [editText, editPriority, editRepeat, editHour, editMinute, editAdvance, editSnooze, params, router]);

  const toggleSection = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setter((v) => !v);
  };

  const advanceLabel = editAdvance === 0 ? '⏰ Justo a la hora' : `${editAdvance} min antes`;
  const snoozeLabel  = editSnooze  === 0 ? 'Sin repetición'     : `Cada ${editSnooze} min (×3)`;
  const repeatOption = REPEAT_OPTIONS.find((r) => r.value === editRepeat) ?? REPEAT_OPTIONS[0];
  const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === editPriority) ?? PRIORITY_OPTIONS[1];

  // Calcular hora real con anticipación
  const advancedHour = editHour;
  const advancedMin  = editMinute;
  const totalMinOrig = editHour * 60 + editMinute - editAdvance;
  const adjH = ((Math.floor(totalMinOrig / 60)) % 24 + 24) % 24;
  const adjM = ((totalMinOrig % 60) + 60) % 60;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <StepIndicator currentStep={6} totalSteps={6} labels={STEP_LABELS} />

        <View style={styles.titleContainer}>
          <Text style={styles.title}>📋 Resumen</Text>
          <Text style={styles.subtitle}>Toca cualquier sección para editarla</Text>
        </View>

        {/* ── Texto ──────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Pressable
            style={styles.cardHeader}
            onPress={() => toggleSection(setExpandText)}
            accessibilityRole="button"
            accessibilityLabel="Editar texto del recordatorio"
          >
            <Text style={styles.cardIcon}>💬</Text>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardLabel}>Recordatorio</Text>
              <Text style={styles.cardValue} numberOfLines={expandText ? undefined : 2}>
                {editText}
              </Text>
            </View>
            <Text style={styles.editChevron}>{expandText ? '▲' : '✏️'}</Text>
          </Pressable>
          {expandText && (
            <View style={styles.cardBody}>
              <TextInput
                style={styles.textInput}
                value={editText}
                onChangeText={setEditText}
                multiline
                numberOfLines={4}
                placeholder="Escribe tu recordatorio..."
                placeholderTextColor="#9CA3AF"
                autoFocus
                returnKeyType="done"
              />
              <Pressable
                style={styles.doneBtn}
                onPress={() => setExpandText(false)}
              >
                <Text style={styles.doneBtnText}>✓ Listo</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Prioridad ──────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Pressable
            style={styles.cardHeader}
            onPress={() => toggleSection(setExpandPriority)}
            accessibilityRole="button"
            accessibilityLabel="Editar prioridad"
          >
            <Text style={styles.cardIcon}>🎯</Text>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardLabel}>Prioridad</Text>
              <View style={styles.priorityRow}>
                <PriorityBadge priority={editPriority} size="md" />
              </View>
            </View>
            <Text style={styles.editChevron}>{expandPriority ? '▲' : '✏️'}</Text>
          </Pressable>
          {expandPriority && (
            <View style={styles.cardBody}>
              {PRIORITY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.optionBtn, editPriority === opt.value && styles.optionBtnActive]}
                  onPress={() => {
                    setEditPriority(opt.value);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: editPriority === opt.value }}
                >
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.optionLabel, editPriority === opt.value && { color: opt.color, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                  {editPriority === opt.value && <Text style={[styles.optionCheck, { color: opt.color }]}>✓</Text>}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── Hora ───────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Pressable
            style={styles.cardHeader}
            onPress={() => toggleSection(setExpandTime)}
            accessibilityRole="button"
            accessibilityLabel="Editar hora"
          >
            <Text style={styles.cardIcon}>⏰</Text>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardLabel}>¿A qué hora?</Text>
              <Text style={[styles.cardValueLarge, { color: '#1A56DB' }]}>
                {formatTime(editHour, editMinute)}
              </Text>
            </View>
            <Text style={styles.editChevron}>{expandTime ? '▲' : '✏️'}</Text>
          </Pressable>
          {expandTime && (
            <View style={styles.cardBody}>
              <View style={styles.pickerRow}>
                <View style={styles.pickerCol}>
                  <Text style={styles.pickerLabel}>Hora</Text>
                  <Picker
                    selectedValue={pickerHour12}
                    onValueChange={(h) => applyPickerTime(h as number, pickerAmPm, editMinute)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {HOURS.map((h) => (
                      <Picker.Item key={h} label={h.toString().padStart(2, '0')} value={h} />
                    ))}
                  </Picker>
                </View>
                <View style={styles.pickerCol}>
                  <Text style={styles.pickerLabel}>Min</Text>
                  <Picker
                    selectedValue={editMinute}
                    onValueChange={(m) => applyPickerTime(pickerHour12, pickerAmPm, m as number)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {MINUTES.map((m) => (
                      <Picker.Item key={m} label={m.toString().padStart(2, '0')} value={m} />
                    ))}
                  </Picker>
                </View>
                <View style={styles.pickerCol}>
                  <Text style={styles.pickerLabel}>AM/PM</Text>
                  <Picker
                    selectedValue={pickerAmPm}
                    onValueChange={(ap) => applyPickerTime(pickerHour12, ap as string, editMinute)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="AM" value="AM" />
                    <Picker.Item label="PM" value="PM" />
                  </Picker>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Repetición ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Pressable
            style={styles.cardHeader}
            onPress={() => toggleSection(setExpandRepeat)}
            accessibilityRole="button"
            accessibilityLabel="Editar repetición"
          >
            <Text style={styles.cardIcon}>{repeatOption.emoji}</Text>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardLabel}>¿Cada cuánto?</Text>
              <Text style={styles.cardValueLarge}>{repeatOption.label}</Text>
            </View>
            <Text style={styles.editChevron}>{expandRepeat ? '▲' : '✏️'}</Text>
          </Pressable>
          {expandRepeat && (
            <View style={styles.cardBody}>
              {REPEAT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.optionBtn, editRepeat === opt.value && styles.optionBtnActive]}
                  onPress={() => {
                    setEditRepeat(opt.value);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: editRepeat === opt.value }}
                >
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.optionLabel, editRepeat === opt.value && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                  {editRepeat === opt.value && <Text style={styles.optionCheck}>✓</Text>}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── Anticipación ───────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Pressable
            style={styles.cardHeader}
            onPress={() => toggleSection(setExpandAdvance)}
            accessibilityRole="button"
            accessibilityLabel="Editar anticipación"
          >
            <Text style={styles.cardIcon}>🔔</Text>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardLabel}>¿Con cuánta anticipación?</Text>
              <Text style={[styles.cardValueLarge, editAdvance > 0 && { color: '#1A56DB' }]}>
                {advanceLabel}
              </Text>
              {editAdvance > 0 && (
                <Text style={styles.cardSubtext}>
                  📣 Te avisaré a las {adjH % 12 || 12}:{adjM.toString().padStart(2, '0')} {adjH < 12 ? 'AM' : 'PM'}
                </Text>
              )}
            </View>
            <Text style={styles.editChevron}>{expandAdvance ? '▲' : '✏️'}</Text>
          </Pressable>
          {expandAdvance && (
            <View style={styles.cardBody}>
              {ADVANCE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.optionBtn, editAdvance === opt.value && styles.optionBtnActive]}
                  onPress={() => {
                    setEditAdvance(opt.value);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: editAdvance === opt.value }}
                >
                  <Text style={[styles.optionLabel, editAdvance === opt.value && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                  {editAdvance === opt.value && <Text style={styles.optionCheck}>✓</Text>}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── Snooze ─────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Pressable
            style={styles.cardHeader}
            onPress={() => toggleSection(setExpandSnooze)}
            accessibilityRole="button"
            accessibilityLabel="Editar repetición post-aviso"
          >
            <Text style={styles.cardIcon}>⏱️</Text>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardLabel}>Repetición post-aviso</Text>
              <Text style={[styles.cardValueLarge, editSnooze > 0 && { color: '#D97706' }]}>
                {snoozeLabel}
              </Text>
            </View>
            <Text style={styles.editChevron}>{expandSnooze ? '▲' : '✏️'}</Text>
          </Pressable>
          {expandSnooze && (
            <View style={styles.cardBody}>
              {SNOOZE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.optionBtn, editSnooze === opt.value && styles.optionBtnActive]}
                  onPress={() => {
                    setEditSnooze(opt.value);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: editSnooze === opt.value }}
                >
                  <Text style={[styles.optionLabel, editSnooze === opt.value && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                  {editSnooze === opt.value && <Text style={styles.optionCheck}>✓</Text>}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── Acciones ───────────────────────────────────────────────────── */}
        <View style={styles.actions}>
          <BigButton
            label="✅ ¡Guardar recordatorio!"
            onPress={handleConfirm}
            variant="success"
            fullWidth
          />
          <BigButton
            label="← Volver"
            onPress={() => router.back()}
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
    gap: 12,
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
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  // ── Cards ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  cardIcon: {
    fontSize: 26,
    width: 34,
    textAlign: 'center',
  },
  cardHeaderText: {
    flex: 1,
    gap: 3,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 26,
  },
  cardValueLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A56DB',
    lineHeight: 30,
  },
  cardSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  editChevron: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 16,
    gap: 10,
  },
  // ── Text input ─────────────────────────────────────────────────────────────
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    padding: 14,
    fontSize: 17,
    color: '#111827',
    lineHeight: 24,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  doneBtn: {
    backgroundColor: '#1A56DB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // ── Priority row ───────────────────────────────────────────────────────────
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  // ── Options ────────────────────────────────────────────────────────────────
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1A56DB',
  },
  optionEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  optionLabelActive: {
    color: '#1A56DB',
    fontWeight: '700',
  },
  optionCheck: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A56DB',
  },
  // ── Picker ─────────────────────────────────────────────────────────────────
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  pickerCol: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 160 : 50,
  },
  pickerItem: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  // ── Actions ────────────────────────────────────────────────────────────────
  actions: {
    gap: 12,
    marginTop: 4,
  },
});
