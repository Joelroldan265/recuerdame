import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { BigButton } from '@/components/big-button';
import { PriorityBadge } from '@/components/priority-badge';
import { useTaskContext } from '@/lib/task-context';
import { useSettingsContext } from '@/lib/settings-context';
import { speak, stopSpeaking, VOICE_MESSAGES } from '@/lib/speech-service';
import { scheduleTaskNotification, cancelTaskNotification } from '@/lib/notification-service';
import { Priority, ReminderTime, PRIORITY_CONFIG } from '@/lib/task-types';
import * as Haptics from 'expo-haptics';

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
}

const REPEAT_LABELS: Record<string, string> = {
  once: '1️⃣ Una vez',
  daily: '📅 Diaria',
  weekly: '📆 Semanal',
  monthly: '🗓️ Mensual',
  custom: '📌 Fecha específica',
};

const SNOOZE_OPTIONS = [
  { label: '+5 min', minutes: 5 },
  { label: '+10 min', minutes: 10 },
  { label: '+15 min', minutes: 15 },
];

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getTaskById, completeTask, deleteTask, updateTask } = useTaskContext();
  const { settings } = useSettingsContext();

  const task = getTaskById(id ?? '');

  // ── Estado de edición ─────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task?.text ?? '');
  const [editPriority, setEditPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [editHour, setEditHour] = useState(task?.reminderTime.hour ?? 9);
  const [editMinute, setEditMinute] = useState(task?.reminderTime.minute ?? 0);
  const [snoozingId, setSnoozingId] = useState<string | null>(null);

  if (!task) {
    return (
      <ScreenContainer className="p-6">
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>❌ Tarea no encontrada</Text>
          <BigButton label="Volver" onPress={() => router.back()} variant="secondary" />
        </View>
      </ScreenContainer>
    );
  }

  // ── Leer en voz alta ──────────────────────────────────────────────────────
  const handleReadAloud = useCallback(() => {
    speak(task.text, settings.voiceSpeed);
  }, [task.text, settings.voiceSpeed]);

  // ── Completar ─────────────────────────────────────────────────────────────
  const handleComplete = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    completeTask(task.id);
    if (settings.soundEnabled) {
      speak(VOICE_MESSAGES.taskCompleted, settings.voiceSpeed);
    }
    router.back();
  }, [task.id, completeTask, settings, router]);

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleDelete = useCallback(() => {
    Alert.alert(
      'Eliminar recordatorio',
      '¿Estás seguro? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteTask(task.id);
            router.back();
          },
        },
      ]
    );
  }, [task.id, deleteTask, router]);

  // ── Guardar edición ───────────────────────────────────────────────────────
  const handleSaveEdit = useCallback(async () => {
    if (!editText.trim()) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const newTime: ReminderTime = { hour: editHour, minute: editMinute };

    // Cancelar notificaciones anteriores y reprogramar
    try {
      if (task.notificationId) {
        await cancelTaskNotification(task.notificationId);
      }
      const updatedTask = {
        ...task,
        text: editText.trim(),
        priority: editPriority,
        reminderTime: newTime,
      };
      const newNotifId = await scheduleTaskNotification(updatedTask, settings);
      await updateTask(task.id, {
        text: editText.trim(),
        priority: editPriority,
        reminderTime: newTime,
        notificationId: newNotifId ?? undefined,
      });
    } catch (e) {
      console.error('[TaskDetail] Error saving edit:', e);
      await updateTask(task.id, {
        text: editText.trim(),
        priority: editPriority,
        reminderTime: newTime,
      });
    }

    setIsEditing(false);
    if (settings.soundEnabled) {
      speak('Recordatorio actualizado', settings.voiceSpeed);
    }
  }, [editText, editPriority, editHour, editMinute, task, updateTask, settings]);

  // ── Posponer ──────────────────────────────────────────────────────────────
  const handleSnooze = useCallback(async (minutes: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSnoozingId(`${minutes}`);

    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    const newTime: ReminderTime = { hour: now.getHours(), minute: now.getMinutes() };

    try {
      if (task.notificationId) {
        await cancelTaskNotification(task.notificationId);
      }
      const updatedTask = { ...task, reminderTime: newTime };
      const newNotifId = await scheduleTaskNotification(updatedTask, settings);
      await updateTask(task.id, {
        reminderTime: newTime,
        notificationId: newNotifId ?? undefined,
      });
    } catch (e) {
      console.error('[TaskDetail] Error snoozing:', e);
    }

    setSnoozingId(null);
    if (settings.soundEnabled) {
      speak(`Pospuesto ${minutes} minutos`, settings.voiceSpeed);
    }
    Alert.alert('⏰ Pospuesto', `Te recordaré en ${minutes} minutos (${formatTime(now.getHours(), now.getMinutes())}).`);
  }, [task, updateTask, settings]);

  // ── Cambiar hora en edición ───────────────────────────────────────────────
  const handleHourChange = (delta: number) => {
    setEditHour((prev) => (prev + delta + 24) % 24);
  };
  const handleMinuteChange = (delta: number) => {
    setEditMinute((prev) => (prev + delta + 60) % 60);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <BigButton
            label="← Volver"
            onPress={() => router.back()}
            variant="ghost"
            style={styles.backBtn}
          />
          {task.completed && (
            <View style={styles.completedBanner}>
              <Text style={styles.completedBannerText}>✅ Completada</Text>
            </View>
          )}
        </View>

        {/* Prioridad — editable */}
        {isEditing ? (
          <View style={styles.priorityEditRow}>
            <Text style={styles.editSectionLabel}>Prioridad:</Text>
            <View style={styles.priorityBtns}>
              {PRIORITIES.map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <Pressable
                    key={p}
                    onPress={() => setEditPriority(p)}
                    style={({ pressed }) => [
                      styles.priorityBtn,
                      editPriority === p && { borderColor: cfg.color, backgroundColor: cfg.bgColor },
                      { transform: [{ scale: pressed ? 0.95 : 1 }] },
                    ]}
                    accessibilityRole="radio"
                    accessibilityLabel={cfg.label}
                    accessibilityState={{ checked: editPriority === p }}
                  >
                    <Text style={styles.priorityBtnEmoji}>{cfg.emoji}</Text>
                    <Text style={[styles.priorityBtnLabel, editPriority === p && { color: cfg.color }]}>
                      {cfg.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.priorityRow}>
            <PriorityBadge priority={task.priority} size="lg" />
          </View>
        )}

        {/* Botón leer en voz alta */}
        {!isEditing && (
          <BigButton
            label="🔊 Leer en voz alta"
            onPress={handleReadAloud}
            variant="secondary"
            fullWidth
            style={styles.readAloudBtn}
          />
        )}

        {/* Texto — editable */}
        {isEditing ? (
          <View style={styles.editContainer}>
            <Text style={styles.editSectionLabel}>Texto del recordatorio:</Text>
            <TextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
              returnKeyType="done"
              accessibilityLabel="Editar texto de la tarea"
            />
          </View>
        ) : (
          <View style={styles.textContainer}>
            <Text style={styles.taskText}>{task.text}</Text>
            {!task.completed && (
              <BigButton
                label="✏️ Editar"
                onPress={() => setIsEditing(true)}
                variant="ghost"
                style={styles.editTextBtn}
              />
            )}
          </View>
        )}

        {/* Hora — editable */}
        {isEditing && (
          <View style={styles.timeEditCard}>
            <Text style={styles.editSectionLabel}>Hora del recordatorio:</Text>
            <View style={styles.clockRow}>
              {/* Horas */}
              <View style={styles.clockCol}>
                <Pressable onPress={() => handleHourChange(1)} style={styles.clockArrow}>
                  <Text style={styles.clockArrowTxt}>▲</Text>
                </Pressable>
                <Text style={styles.clockVal}>{(editHour % 12 || 12).toString().padStart(2, '0')}</Text>
                <Pressable onPress={() => handleHourChange(-1)} style={styles.clockArrow}>
                  <Text style={styles.clockArrowTxt}>▼</Text>
                </Pressable>
              </View>
              <Text style={styles.clockSep}>:</Text>
              {/* Minutos */}
              <View style={styles.clockCol}>
                <Pressable onPress={() => handleMinuteChange(1)} style={styles.clockArrow}>
                  <Text style={styles.clockArrowTxt}>▲</Text>
                </Pressable>
                <Text style={styles.clockVal}>{editMinute.toString().padStart(2, '0')}</Text>
                <Pressable onPress={() => handleMinuteChange(-1)} style={styles.clockArrow}>
                  <Text style={styles.clockArrowTxt}>▼</Text>
                </Pressable>
              </View>
              {/* AM/PM */}
              <Pressable onPress={() => handleHourChange(12)} style={styles.ampmBtn}>
                <Text style={styles.ampmTxt}>{editHour < 12 ? 'AM' : 'PM'}</Text>
              </Pressable>
            </View>
            <Text style={styles.timePreview}>
              🕐 {formatTime(editHour, editMinute)}
            </Text>
          </View>
        )}

        {/* Botones guardar/cancelar edición */}
        {isEditing && (
          <View style={styles.editActions}>
            <BigButton
              label="💾 Guardar cambios"
              onPress={handleSaveEdit}
              variant="success"
              fullWidth
            />
            <BigButton
              label="Cancelar"
              onPress={() => {
                setIsEditing(false);
                setEditText(task.text);
                setEditPriority(task.priority);
                setEditHour(task.reminderTime.hour);
                setEditMinute(task.reminderTime.minute);
              }}
              variant="secondary"
              fullWidth
            />
          </View>
        )}

        {/* Detalles (solo cuando no edita) */}
        {!isEditing && (
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🕐</Text>
              <View>
                <Text style={styles.detailLabel}>Hora del recordatorio</Text>
                <Text style={styles.detailValue}>
                  {formatTime(task.reminderTime.hour, task.reminderTime.minute)}
                </Text>
              </View>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🔁</Text>
              <View>
                <Text style={styles.detailLabel}>Repetición</Text>
                <Text style={styles.detailValue}>{REPEAT_LABELS[task.repeatType]}</Text>
              </View>
            </View>
            {task.customDate && (
              <>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>📌</Text>
                  <View>
                    <Text style={styles.detailLabel}>Fecha específica</Text>
                    <Text style={styles.detailValue}>
                      {task.customDate.day}/{task.customDate.month}/{task.customDate.year}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* Posponer */}
        {!task.completed && !isEditing && (
          <View style={styles.snoozeCard}>
            <Text style={styles.snoozeTitle}>⏰ Posponer recordatorio</Text>
            <View style={styles.snoozeRow}>
              {SNOOZE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.minutes}
                  onPress={() => handleSnooze(opt.minutes)}
                  disabled={snoozingId !== null}
                  style={({ pressed }) => [
                    styles.snoozeBtn,
                    { transform: [{ scale: pressed ? 0.94 : 1 }] },
                    snoozingId === `${opt.minutes}` && styles.snoozeBtnActive,
                  ]}
                  accessibilityLabel={`Posponer ${opt.minutes} minutos`}
                >
                  <Text style={styles.snoozeBtnTxt}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Acciones principales */}
        {!task.completed && !isEditing && (
          <View style={styles.actions}>
            <BigButton
              label="✅ Marcar como completada"
              onPress={handleComplete}
              variant="success"
              fullWidth
            />
            <BigButton
              label="🗑️ Eliminar recordatorio"
              onPress={handleDelete}
              variant="danger"
              fullWidth
            />
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 16, gap: 14 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText: { fontSize: 22, color: '#6B7280' },
  header: { marginBottom: 4 },
  backBtn: { alignSelf: 'flex-start', minHeight: 48, paddingHorizontal: 12 },
  completedBanner: { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginTop: 8, alignItems: 'center' },
  completedBannerText: { fontSize: 18, fontWeight: '700', color: '#0E9F6E' },
  priorityRow: { marginBottom: 4 },
  // Edición de prioridad
  priorityEditRow: { gap: 8 },
  editSectionLabel: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  priorityBtns: { flexDirection: 'row', gap: 10 },
  priorityBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: '#E5E7EB', gap: 4,
  },
  priorityBtnEmoji: { fontSize: 24 },
  priorityBtnLabel: { fontSize: 15, fontWeight: '700', color: '#374151' },
  // Texto
  textContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 12,
  },
  taskText: { fontSize: 26, fontWeight: '600', color: '#111827', lineHeight: 36 },
  editTextBtn: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 16, paddingVertical: 8 },
  editContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 8,
  },
  editInput: {
    fontSize: 22, color: '#111827', borderWidth: 2, borderColor: '#1A56DB',
    borderRadius: 12, padding: 16, minHeight: 100, textAlignVertical: 'top', lineHeight: 30,
  },
  editActions: { gap: 10 },
  // Edición de hora
  timeEditCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 12,
  },
  clockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  clockCol: { alignItems: 'center', gap: 6 },
  clockArrow: { padding: 10, borderRadius: 10, backgroundColor: '#F3F4F6', minWidth: 56, alignItems: 'center' },
  clockArrowTxt: { fontSize: 18, color: '#374151', fontWeight: '700' },
  clockVal: { fontSize: 38, fontWeight: '800', color: '#1A56DB', minWidth: 64, textAlign: 'center' },
  clockSep: { fontSize: 38, fontWeight: '800', color: '#374151', marginBottom: 6 },
  ampmBtn: { padding: 12, borderRadius: 10, backgroundColor: '#EFF6FF', minWidth: 56, alignItems: 'center' },
  ampmTxt: { fontSize: 18, fontWeight: '700', color: '#1A56DB' },
  timePreview: { fontSize: 22, fontWeight: '700', color: '#0E9F6E', textAlign: 'center' },
  // Detalles
  detailsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  detailIcon: { fontSize: 28 },
  detailLabel: { fontSize: 14, color: '#6B7280', marginBottom: 2 },
  detailValue: { fontSize: 20, fontWeight: '600', color: '#111827' },
  detailDivider: { height: 1, backgroundColor: '#F3F4F6' },
  // Posponer
  snoozeCard: {
    backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#FDE68A', gap: 10,
  },
  snoozeTitle: { fontSize: 17, fontWeight: '700', color: '#92400E' },
  snoozeRow: { flexDirection: 'row', gap: 10 },
  snoozeBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#FEF3C7', borderWidth: 2, borderColor: '#F59E0B', alignItems: 'center',
  },
  snoozeBtnActive: { backgroundColor: '#FDE68A' },
  snoozeBtnTxt: { fontSize: 17, fontWeight: '800', color: '#D97706' },
  // Acciones
  actions: { gap: 12 },
  readAloudBtn: { marginBottom: 4 },
  bottomPadding: { height: 40 },
});
