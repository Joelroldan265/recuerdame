import React, { useCallback, useEffect } from 'react';
import { ScrollView, Text, View, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { TaskCard } from '@/components/task-card';
import { FAB } from '@/components/fab';
import { useTaskContext } from '@/lib/task-context';
import { useSettingsContext } from '@/lib/settings-context';
import { speak, VOICE_MESSAGES } from '@/lib/speech-service';
import { Task } from '@/lib/task-types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️ Buenos días';
  if (hour < 18) return '🌤️ Buenas tardes';
  return '🌙 Buenas noches';
}

export default function HomeScreen() {
  const router = useRouter();
  const { getTodayTasks, getUpcomingTasks, completeTask, isLoading } = useTaskContext();
  const { settings } = useSettingsContext();

  const todayTasks = getTodayTasks();
  const upcomingTasks = getUpcomingTasks().slice(0, 5);

  useEffect(() => {
    if (!isLoading && settings.soundEnabled) {
      const timer = setTimeout(() => {
        speak(VOICE_MESSAGES.welcome, settings.voiceSpeed);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

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

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>⏳ Cargando...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.appName}>recuérdame</Text>
        </View>

        {/* Resumen del día */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{todayTasks.length}</Text>
            <Text style={styles.summaryLabel}>Para hoy</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{upcomingTasks.length}</Text>
            <Text style={styles.summaryLabel}>Próximas</Text>
          </View>
        </View>

        {/* Tareas de hoy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Tareas de hoy</Text>
          {todayTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyTitle}>¡Todo al día!</Text>
              <Text style={styles.emptySubtitle}>No tienes tareas para hoy.</Text>
            </View>
          ) : (
            todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={handleTaskPress}
                onComplete={handleComplete}
              />
            ))
          )}
        </View>

        {/* Próximas tareas */}
        {upcomingTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔜 Próximamente</Text>
            {upcomingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={handleTaskPress}
                onComplete={handleComplete}
              />
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <FAB onPress={handleFAB} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 22,
    color: '#6B7280',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 22,
    color: '#6B7280',
    fontWeight: '500',
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A56DB',
    letterSpacing: -0.5,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#1A56DB',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 48,
  },
  summaryLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  section: {
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});
