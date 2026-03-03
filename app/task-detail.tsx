import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { BigButton } from '@/components/big-button';
import { PriorityBadge } from '@/components/priority-badge';
import { useTaskContext } from '@/lib/task-context';
import { useSettingsContext } from '@/lib/settings-context';
import { speak, VOICE_MESSAGES } from '@/lib/speech-service';
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

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getTaskById, completeTask, deleteTask, updateTask } = useTaskContext();
  const { settings } = useSettingsContext();

  const task = getTaskById(id ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task?.text ?? '');

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

  const handleSaveEdit = useCallback(() => {
    if (editText.trim()) {
      updateTask(task.id, { text: editText.trim() });
      setIsEditing(false);
    }
  }, [task.id, editText, updateTask]);

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

        {/* Prioridad */}
        <View style={styles.priorityRow}>
          <PriorityBadge priority={task.priority} size="lg" />
        </View>

        {/* Texto de la tarea */}
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
              returnKeyType="done"
              accessibilityLabel="Editar texto de la tarea"
            />
            <View style={styles.editActions}>
              <BigButton
                label="Guardar ✓"
                onPress={handleSaveEdit}
                variant="success"
                style={styles.editBtn}
              />
              <BigButton
                label="Cancelar"
                onPress={() => { setIsEditing(false); setEditText(task.text); }}
                variant="secondary"
                style={styles.editBtn}
              />
            </View>
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

        {/* Detalles */}
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

        {/* Acciones */}
        {!task.completed && (
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
  scroll: {
    flexGrow: 1,
    padding: 16,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  notFoundText: {
    fontSize: 22,
    color: '#6B7280',
  },
  header: {
    marginBottom: 16,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  completedBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  completedBannerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0E9F6E',
  },
  priorityRow: {
    marginBottom: 16,
  },
  textContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  taskText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 36,
  },
  editTextBtn: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  editInput: {
    fontSize: 22,
    color: '#111827',
    borderWidth: 2,
    borderColor: '#1A56DB',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 30,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    flex: 1,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  detailIcon: {
    fontSize: 28,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  actions: {
    gap: 12,
  },
  bottomPadding: {
    height: 40,
  },
});
