import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { AppState, AppStateStatus, Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { TaskProvider } from "@/lib/task-context";
import { SettingsProvider } from "@/lib/settings-context";
import {
  addNotificationResponseListener,
  addNotificationReceivedListener,
  NOTIFICATION_ACTION_COMPLETE,
  NOTIFICATION_ACTION_RECORD,
  NOTIFICATION_ACTION_SNOOZE_5,
  NOTIFICATION_ACTION_SNOOZE_10,
  NOTIFICATION_ACTION_SNOOZE_15,
  NOTIFICATION_ACTION_SILENCE,
  snoozeTaskNotification,
  showPersistentNotification,
  hidePersistentNotification,
} from "@/lib/notification-service";
import { speak, stopSpeaking } from "@/lib/speech-service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

// Clave para guardar el texto pendiente de leer al desbloquear
const PENDING_SPEAK_KEY = 'recuerdame_pending_speak';
const PENDING_COMPLETE_KEY = 'recuerdame_pending_complete';

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;
  const router = useRouter();

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Ref para rastrear el estado anterior de AppState (para detectar desbloqueo)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    initManusRuntime();
  }, []);

  // Restaurar la notificación persistente al arrancar (si el usuario la tenía activada)
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const timer = setTimeout(async () => {
      try {
        const raw = await AsyncStorage.getItem('@recuerdame_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.persistentNotification === true) {
            await showPersistentNotification();
          } else {
            // Asegurarse de que no haya notificación persistente si está desactivada
            await hidePersistentNotification();
          }
        }
      } catch { /* ignorar */ }
    }, 2000); // Esperar 2s para que los canales Android estén inicializados
    return () => clearTimeout(timer);
  }, []);

  // ── Helpers de voz ────────────────────────────────────────────────────────
  const speakText = useCallback(async (text: string) => {
    if (!text || Platform.OS === 'web') return;
    try {
      const raw = await AsyncStorage.getItem('recuerdame_settings');
      const settings = raw ? JSON.parse(raw) : null;
      const speed = settings?.voiceSpeed ?? 1.0;
      const soundEnabled = settings?.soundEnabled ?? true;
      if (soundEnabled) speak(text, speed);
    } catch {
      speak(text, 1.0);
    }
  }, []);

  // ── AppState: leer en voz alta al desbloquear ─────────────────────────────
  // Cuando el dispositivo pasa de "background" a "active", significa que el
  // usuario acaba de desbloquear la pantalla. Si hay un texto pendiente
  // (guardado cuando llegó la notificación), lo leemos en voz alta.
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      // Transición background/inactive → active = desbloqueo o vuelta al primer plano
      if (
        (prevState === 'background' || prevState === 'inactive') &&
        nextState === 'active'
      ) {
        // 1. Leer el recordatorio pendiente en voz alta
        // Strategy A: check explicitly saved pending text (set when user taps notification)
        // Strategy B: check recently presented notifications (covers locked-screen case where
        //             the user didn't tap but the alarm fired while screen was locked)
        try {
          let textToSpeak: string | null = null;

          // Strategy A: explicitly saved pending text
          const pendingText = await AsyncStorage.getItem(PENDING_SPEAK_KEY);
          if (pendingText) {
            await AsyncStorage.removeItem(PENDING_SPEAK_KEY);
            textToSpeak = pendingText;
          }

          // Strategy B: check presented notifications for recent reminder
          if (!textToSpeak) {
            try {
              const N = await import('expo-notifications');
              const presented = await N.getPresentedNotificationsAsync();
              // Find the most recent reminder notification (not persistent)
              type PresentedNotif = (typeof presented)[number];
              const recent = presented
                .filter((n: PresentedNotif) => {
                  const d = n.request.content.data as Record<string, unknown>;
                  return d?.action === 'reminder' && d?.taskText;
                })
                .sort((a: PresentedNotif, b: PresentedNotif) => {
                  const ta = (a.date ?? 0) as number;
                  const tb = (b.date ?? 0) as number;
                  return tb - ta;
                })[0];
              if (recent) {
                const d = recent.request.content.data as Record<string, unknown>;
                textToSpeak = (d?.taskText ?? recent.request.content.body ?? '') as string;
              }
            } catch { /* ignore — getPresentedNotificationsAsync may not be available */ }
          }

          if (textToSpeak) {
            // Leer el delay configurado por el usuario (por defecto 1000ms)
            let readDelay = 1000;
            try {
              const rawSettings = await AsyncStorage.getItem('recuerdame_settings');
              if (rawSettings) {
                const parsed = JSON.parse(rawSettings);
                if (typeof parsed.unlockReadDelay === 'number') {
                  readDelay = parsed.unlockReadDelay;
                }
              }
            } catch { /* usar valor por defecto */ }
            setTimeout(() => speakText(textToSpeak!), readDelay);
          }
        } catch { /* ignorar */ }

        // 2. Procesar tareas pendientes de completar (acción rápida "✅ Completar")
        try {
          const raw = await AsyncStorage.getItem(PENDING_COMPLETE_KEY);
          if (raw) {
            await AsyncStorage.removeItem(PENDING_COMPLETE_KEY);
            // Los IDs se procesarán en el TaskContext al próximo render
            // Guardamos en una clave separada que el TaskContext lee al iniciar
            const ids: string[] = JSON.parse(raw);
            if (ids.length > 0) {
              await AsyncStorage.setItem('recuerdame_complete_on_load', JSON.stringify(ids));
            }
          }
        } catch { /* ignorar */ }
      }
    });

    return () => subscription.remove();
  }, [speakText]);

  // ── Listeners de notificaciones ───────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Cuando el usuario TOCA la notificación o usa una acción rápida
    const responseSub = addNotificationResponseListener(async (response) => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data as Record<string, unknown>;
      const taskText = (data?.taskText ?? response.notification.request.content.body ?? '') as string;
      const taskId   = (data?.taskId ?? '') as string;
      const taskPriority = (data?.taskPriority ?? 'medium') as string;

      // ── Acción: Silenciar ────────────────────────────────────────────────────
      if (actionId === NOTIFICATION_ACTION_SILENCE) {
        // Detener cualquier TTS activo y limpiar el texto pendiente
        try {
          stopSpeaking();
          await AsyncStorage.removeItem(PENDING_SPEAK_KEY);
        } catch { /* ignorar */ }
        return;
      }

      // ── Acción: Grabar nuevo (botón rápido en notificación de recordatorio) ────────────────
      if (actionId === NOTIFICATION_ACTION_RECORD) {
        setTimeout(() => router.push('/create/step1'), 300);
        return;
      }

      // ── Toque en la notificación persistente (abrir grabación rápida) ──────────────────
      const notifAction = (data?.action ?? '') as string;
      if (notifAction === 'open_record') {
        setTimeout(() => router.push('/create/step1'), 300);
        return;
      }

      // ── Acción: Completar (sin abrir app) ─────────────────────────────────────────────────────
      if (actionId === NOTIFICATION_ACTION_COMPLETE) {
        if (taskId) {
          try {
            const raw = await AsyncStorage.getItem(PENDING_COMPLETE_KEY);
            const pending: string[] = raw ? JSON.parse(raw) : [];
            pending.push(taskId);
            await AsyncStorage.setItem(PENDING_COMPLETE_KEY, JSON.stringify(pending));
          } catch { /* ignorar */ }
        }
        return;
      }

      // ── Acciones de posponer ──────────────────────────────────────────────────────
      const snoozeMap: Record<string, number> = {
        [NOTIFICATION_ACTION_SNOOZE_5]:  5,
        [NOTIFICATION_ACTION_SNOOZE_10]: 10,
        [NOTIFICATION_ACTION_SNOOZE_15]: 15,
      };

      if (actionId in snoozeMap) {
        const minutes = snoozeMap[actionId];
        try {
          const raw = await AsyncStorage.getItem('recuerdame_settings');
          const settings = raw ? JSON.parse(raw) : null;
          const soundEnabled = settings?.soundEnabled ?? true;
          await snoozeTaskNotification(taskId, taskText, taskPriority, minutes, soundEnabled);
        } catch {
          await snoozeTaskNotification(taskId, taskText, taskPriority, minutes, true);
        }
        return;
      }

      // ── Acción por defecto: tocar la notificación ─────────────────────────
      // Guardamos el texto para leerlo al desbloquear (si la pantalla estaba bloqueada)
      // y también lo leemos inmediatamente si la app ya está activa
      if (taskText) {
        try {
          await AsyncStorage.setItem(PENDING_SPEAK_KEY, taskText);
        } catch { /* ignorar */ }
        // Si la app ya está activa, leer de inmediato
        if (appStateRef.current === 'active') {
          setTimeout(() => speakText(taskText), 800);
        }
        // Si la app estaba en background, el AppState listener lo leerá al desbloquear
      }
    });

    // Cuando la notificación LLEGA mientras la app está abierta (foreground)
    const receivedSub = addNotificationReceivedListener(async (notification) => {
      const taskText = notification.request.content.body ?? '';
      const data = notification.request.content.data as Record<string, unknown>;
      const text = (data?.taskText ?? taskText) as string;

      if (text) {
        // Guardar para leer al desbloquear (por si el usuario bloquea la pantalla)
        try {
          await AsyncStorage.setItem(PENDING_SPEAK_KEY, text);
        } catch { /* ignorar */ }

        // Leer inmediatamente en foreground
        setTimeout(() => speakText(text), 300);
      }
    });

    // Verificar si hay texto pendiente al iniciar la app (venía de notificación)
    AsyncStorage.getItem(PENDING_SPEAK_KEY).then((text) => {
      if (text) {
        AsyncStorage.removeItem(PENDING_SPEAK_KEY);
        setTimeout(() => speakText(text), 1200);
      }
    }).catch(() => {});

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, [speakText, router]);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <SettingsProvider>
            <TaskProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="task-detail" />
                <Stack.Screen
                  name="create/step1"
                  options={{ presentation: "modal" }}
                />
                <Stack.Screen name="create/step2" />
                <Stack.Screen name="create/step3" />
                <Stack.Screen name="create/step4" />
                <Stack.Screen name="create/step5" />
                <Stack.Screen name="create/step6" />
                <Stack.Screen name="create/success" />
                <Stack.Screen name="custom-voice" />
                <Stack.Screen name="oauth/callback" />
              </Stack>
              <StatusBar style="auto" />
            </TaskProvider>
          </SettingsProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
