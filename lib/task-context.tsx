import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from './task-types';

const STORAGE_KEY = '@recuerdame_tasks';

interface TaskContextValue {
  tasks: Task[];
  isLoading: boolean;
  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  getTaskById: (id: string) => Task | undefined;
  getTodayTasks: () => Task[];
  getUpcomingTasks: () => Task[];
  getCompletedTasks: () => Task[];
}

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  // Carga lazy — 300ms después del primer render para no bloquear la UI
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const timer = setTimeout(async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setTasks(JSON.parse(stored));
        }
      } catch (error) {
        console.error('[TaskContext] Error loading tasks:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const saveTasks = useCallback(async (newTasks: Task[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks));
    } catch (error) {
      console.error('[TaskContext] Error saving tasks:', error);
    }
  }, []);

  const addTask = useCallback(async (task: Task) => {
    setTasks((prev) => {
      const updated = [task, ...prev];
      saveTasks(updated);
      return updated;
    });
  }, [saveTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      saveTasks(updated);
      return updated;
    });
  }, [saveTasks]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveTasks(updated);
      return updated;
    });
  }, [saveTasks]);

  const completeTask = useCallback(async (id: string) => {
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === id
          ? { ...t, completed: true, completedAt: new Date().toISOString() }
          : t
      );
      saveTasks(updated);
      return updated;
    });
  }, [saveTasks]);

  const getTaskById = useCallback(
    (id: string) => tasks.find((t) => t.id === id),
    [tasks]
  );

  const getTodayTasks = useCallback(() => {
    const today = new Date();
    return tasks.filter((t) => {
      if (t.completed) return false;
      const created = new Date(t.createdAt);
      if (t.repeatType === 'daily') return true;
      if (t.repeatType === 'once' || t.repeatType === 'custom') {
        const taskDate = t.customDate
          ? new Date(t.customDate.year, t.customDate.month - 1, t.customDate.day)
          : created;
        return (
          taskDate.getDate() === today.getDate() &&
          taskDate.getMonth() === today.getMonth() &&
          taskDate.getFullYear() === today.getFullYear()
        );
      }
      return false;
    });
  }, [tasks]);

  const getUpcomingTasks = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter((t) => {
      if (t.completed) return false;
      if (t.repeatType === 'daily' || t.repeatType === 'weekly' || t.repeatType === 'monthly') {
        return true;
      }
      if (t.customDate) {
        const taskDate = new Date(t.customDate.year, t.customDate.month - 1, t.customDate.day);
        return taskDate >= today;
      }
      return false;
    });
  }, [tasks]);

  const getCompletedTasks = useCallback(() => {
    return tasks.filter((t) => t.completed);
  }, [tasks]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        isLoading,
        addTask,
        updateTask,
        deleteTask,
        completeTask,
        getTaskById,
        getTodayTasks,
        getUpcomingTasks,
        getCompletedTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTaskContext must be used within TaskProvider');
  return ctx;
}
