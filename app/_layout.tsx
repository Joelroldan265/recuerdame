import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
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
} from "@/lib/notification-service";
import { speak } from "@/lib/speech-service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;
  const router = useRouter();

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  useEffect(() => {
    initManusRuntime();
  }, []);

  // Leer el recordatorio en voz alta cuando la notificación suena y el usuario la toca
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Helper para leer el texto en voz alta
    const speakTaskText = async (text: string) => {
      try {
        const raw = await AsyncStorage.getItem('recuerdame_settings');
        const settings = raw ? JSON.parse(raw) : null;
        const speed = settings?.voiceSpeed ?? 1.0;
        const soundEnabled = settings?.soundEnabled ?? true;
        if (soundEnabled && text) speak(text, speed);
      } catch {
        if (text) speak(text, 1.0);
      }
    };

    // Cuando el usuario TOCA la notificación o usa una acción rápida
    const responseSub = addNotificationResponseListener((response) => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data as Record<string, unknown>;
      const taskText = (data?.taskText ?? response.notification.request.content.body ?? '') as string;

      if (actionId === NOTIFICATION_ACTION_RECORD) {
        // Acción rápida: abrir flujo de grabación directamente
        setTimeout(() => {
          router.push('/create/step1');
        }, 300);
        return;
      }

      if (actionId === NOTIFICATION_ACTION_COMPLETE) {
        // Acción rápida: completar tarea silenciosamente (sin abrir la app)
        // La tarea se marcará como completada la próxima vez que la app se abra
        // guardamos el taskId en AsyncStorage para procesarlo al abrir
        const taskId = data?.taskId as string | undefined;
        if (taskId) {
          AsyncStorage.getItem('recuerdame_pending_complete').then((raw) => {
            const pending: string[] = raw ? JSON.parse(raw) : [];
            pending.push(taskId);
            AsyncStorage.setItem('recuerdame_pending_complete', JSON.stringify(pending));
          }).catch(() => {});
        }
        return;
      }

      // Acción por defecto: tocar la notificación → leer en voz alta
      if (taskText) {
        setTimeout(() => speakTaskText(taskText), 800);
      }
    });

    // Cuando la notificación LLEGA mientras la app está abierta (foreground)
    const receivedSub = addNotificationReceivedListener((notification) => {
      const taskText = notification.request.content.body;
      if (taskText) {
        setTimeout(async () => {
          try {
            const raw = await AsyncStorage.getItem('recuerdame_settings');
            const settings = raw ? JSON.parse(raw) : null;
            const speed = settings?.voiceSpeed ?? 1.0;
            const soundEnabled = settings?.soundEnabled ?? true;
            if (soundEnabled) {
              speak(taskText, speed);
            }
          } catch {
            speak(taskText, 1.0);
          }
        }, 300);
      }
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, []);

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
