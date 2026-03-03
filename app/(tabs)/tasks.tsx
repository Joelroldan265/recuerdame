import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { TaskCard } from '@/components/task-card';
import { FAB } from '@/components/fab';
import { useTaskContext } from '@/lib/task-context';
import { useSettingsContext } from '@/lib/settings-context';
import { speak, VOICE_MESSAGES } from '@/lib/speech-service';
import { Task } from '@/lib/task-types';

type FilterType = 'today' | 'upcoming' | 'completed';

const FILTERS: Array<{ key: FilterType; label: string; emoji: string }> = [
  { key: 'today', label: 'Hoy', emoji: '📅' },
  { key: 'upcoming', label: 'Próximas', emoji: '🔜' },
  { key: 'completed', label: 'Completadas', emoji: '✅' },
];

export default function TasksScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('today');
  const { getTodayTasks, getUpcomingTasks, getCompletedTasks, completeTask } = useTaskContext();
  const { settings } = useSettingsContext();

  const getFilteredTasks = (): Task[] => {
    switch (activeFilter) {
      case 'today': return getTodayTasks();
      case 'upcoming': return getUpcomingTasks();
      case 'completed': return getCompletedTasks();
    }
  };

  const tasks = getFilteredTasks();

  const handleTaskPress = useCallback((task: Task) => {
    router.push({ pathname: '/task-detail', params: { id: task.id } });
  }, [router]);

  const handleComplete = useCallback((task: Task) => {
    completeTask(task.id);
    if (settings.soundEnabled) {
      speak(VOICE_MESSAGES.taskCompleted, settings.voiceSpeed);
    }
  }, [completeTask, settings]);

  const handleFAB = useCallback(() => {
    router.push('/create/step1');
  }, [router]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>
        {activeFilter === 'completed' ? '📭' : '🎉'}
      </Text>
      <Text style={styles.emptyTitle}>
        {activeFilter === 'completed' ? 'Sin tareas completadas' : '¡Sin tareas pendientes!'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === 'completed'
          ? 'Completa una tarea para verla aquí.'
          : 'Toca el micrófono para crear un recordatorio.'}
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📋 Mis Tareas</Text>
      </View>

      {/* Filtros */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setActiveFilter(f.key)}
            accessibilityRole="tab"
            accessibilityLabel={f.label}
            accessibilityState={{ selected: activeFilter === f.key }}
            style={[
              styles.filterBtn,
              activeFilter === f.key && styles.filterBtnActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === f.key && styles.filterTextActive,
              ]}
            >
              {f.emoji} {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Lista */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={handleTaskPress}
            onComplete={handleComplete}
            voiceSpeed={settings.voiceSpeed}
          />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={tasks.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => {}} // Evitar crash de FlatList
      />

      <FAB onPress={handleFAB} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#1A56DB',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 120,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
