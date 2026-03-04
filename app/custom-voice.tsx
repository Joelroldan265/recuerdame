/**
 * custom-voice.tsx
 *
 * Pantalla para grabar mensajes de voz personalizados para las notificaciones.
 * El usuario puede grabar 3 mensajes (uno por prioridad) o usar los predeterminados.
 * Los archivos se guardan en el sistema de archivos local con expo-file-system.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';

type VoiceSlot = 'high' | 'medium' | 'low';

const SLOT_CONFIG: Record<VoiceSlot, { label: string; emoji: string; defaultText: string; color: string; bgColor: string; borderColor: string }> = {
  high:   { label: 'Prioridad Alta',   emoji: '🔴', defaultText: 'Tienes una tarea urgente', color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FCA5A5' },
  medium: { label: 'Prioridad Media',  emoji: '🟡', defaultText: 'Tienes una tarea pendiente que aún no es urgente', color: '#D97706', bgColor: '#FFFBEB', borderColor: '#FCD34D' },
  low:    { label: 'Prioridad Baja',   emoji: '🟢', defaultText: 'Tienes una tarea pendiente que no urge', color: '#059669', bgColor: '#F0FDF4', borderColor: '#6EE7B7' },
};

const VOICE_DIR = `${FileSystem.documentDirectory}custom-voices/`;

async function ensureVoiceDir() {
  const info = await FileSystem.getInfoAsync(VOICE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VOICE_DIR, { intermediates: true });
  }
}

async function getCustomVoicePath(slot: VoiceSlot): Promise<string | null> {
  const path = `${VOICE_DIR}${slot}.m4a`;
  const info = await FileSystem.getInfoAsync(path);
  return info.exists ? path : null;
}

async function deleteCustomVoice(slot: VoiceSlot): Promise<void> {
  const path = `${VOICE_DIR}${slot}.m4a`;
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path);
  }
}

function RecordingSlot({ slot }: { slot: VoiceSlot }) {
  const config = SLOT_CONFIG[slot];
  const router = useRouter();

  const [hasCustom, setHasCustom] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<ReturnType<typeof useAudioPlayer> | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  useEffect(() => {
    getCustomVoicePath(slot).then((p) => setHasCustom(!!p));
  }, [slot]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    if ((Platform.OS as string) === 'web') {
      Alert.alert('No disponible', 'La grabación de voz no está disponible en la versión web.');
      return;
    }
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso denegado', 'Necesitas permitir el acceso al micrófono en Ajustes del dispositivo.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await ensureVoiceDir();
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 29) {
            stopRecording();
            return 30;
          }
          return s + 1;
        });
      }, 1000);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.warn('[CustomVoice] startRecording error:', err);
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        const dest = `${VOICE_DIR}${slot}.m4a`;
        await FileSystem.copyAsync({ from: uri, to: dest });
        setHasCustom(true);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.warn('[CustomVoice] stopRecording error:', err);
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  }, [recorder, slot]);

  const playCustomVoice = useCallback(async () => {
    const path = await getCustomVoicePath(slot);
    if (!path) return;
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      // Use createAudioPlayer for one-shot playback
      const { createAudioPlayer } = await import('expo-audio');
      const player = createAudioPlayer({ uri: path });
      playerRef.current = player as any;
      setIsPlaying(true);
      player.play();
      // Auto-stop after 30s max
      setTimeout(() => {
        player.remove?.();
        setIsPlaying(false);
      }, 30000);
    } catch (err) {
      console.warn('[CustomVoice] playCustomVoice error:', err);
      setIsPlaying(false);
    }
  }, [slot]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Eliminar mensaje',
      `¿Eliminar el mensaje personalizado de "${config.label}"? Se usará el mensaje predeterminado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomVoice(slot);
            setHasCustom(false);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  }, [slot, config.label]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <View style={[styles.slot, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
      {/* Header */}
      <View style={styles.slotHeader}>
        <Text style={styles.slotEmoji}>{config.emoji}</Text>
        <View style={styles.slotHeaderText}>
          <Text style={[styles.slotLabel, { color: config.color }]}>{config.label}</Text>
          <Text style={styles.slotStatus}>
            {hasCustom ? '✅ Mensaje personalizado grabado' : '🔔 Usando mensaje predeterminado'}
          </Text>
        </View>
      </View>

      {/* Default text preview */}
      <View style={styles.defaultPreview}>
        <Text style={styles.defaultPreviewLabel}>Mensaje predeterminado:</Text>
        <Text style={styles.defaultPreviewText}>"{config.defaultText}"</Text>
      </View>

      {/* Recording controls */}
      {isRecording ? (
        <View style={styles.recordingActive}>
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTimer}>{formatTime(recordingSeconds)}</Text>
            <Text style={styles.recordingLabel}>Grabando... (máx 30s)</Text>
          </View>
          <Pressable
            onPress={stopRecording}
            style={styles.stopBtn}
            accessibilityRole="button"
            accessibilityLabel="Detener grabación"
          >
            <Text style={styles.stopBtnText}>⏹ Detener</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.slotActions}>
          <Pressable
            onPress={startRecording}
            style={[styles.actionBtn, { backgroundColor: config.color }]}
            accessibilityRole="button"
            accessibilityLabel={`Grabar mensaje para ${config.label}`}
          >
            <Text style={styles.actionBtnText}>🎙️ {hasCustom ? 'Volver a grabar' : 'Grabar mensaje'}</Text>
          </Pressable>

          {hasCustom && (
            <>
              <Pressable
                onPress={playCustomVoice}
                style={[styles.actionBtn, styles.playBtn]}
                accessibilityRole="button"
                accessibilityLabel={`Escuchar mensaje de ${config.label}`}
              >
                <Text style={[styles.actionBtnText, { color: config.color }]}>
                  {isPlaying ? '⏸ Reproduciendo...' : '▶ Escuchar'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                style={[styles.actionBtn, styles.deleteBtn]}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar mensaje de ${config.label}`}
              >
                <Text style={[styles.actionBtnText, styles.deleteBtnText]}>🗑️ Eliminar</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

export default function CustomVoiceScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
            <Text style={styles.backBtnText}>← Volver</Text>
          </Pressable>
          <Text style={styles.title}>🎙️ Mensajes de voz</Text>
          <Text style={styles.subtitle}>
            Graba tus propios mensajes para cada nivel de prioridad. Si no grabas uno, se usará el mensaje predeterminado.
          </Text>
        </View>

        {/* Info note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoNoteText}>
            💡 El mensaje se lee en voz alta cuando recibes una notificación y abres la app. Graba frases cortas y claras (máx 30 segundos).
          </Text>
        </View>

        {/* Recording slots */}
        <View style={styles.slots}>
          <RecordingSlot slot="high" />
          <RecordingSlot slot="medium" />
          <RecordingSlot slot="low" />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: 17,
    color: '#1A56DB',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  infoNote: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#1A56DB',
  },
  infoNoteText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  slots: {
    paddingHorizontal: 20,
    gap: 16,
  },
  slot: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    gap: 12,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotEmoji: {
    fontSize: 32,
  },
  slotHeaderText: {
    flex: 1,
    gap: 2,
  },
  slotLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  slotStatus: {
    fontSize: 13,
    color: '#6B7280',
  },
  defaultPreview: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  defaultPreviewLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  defaultPreviewText: {
    fontSize: 15,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  slotActions: {
    gap: 8,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  deleteBtnText: {
    color: '#DC2626',
  },
  recordingActive: {
    gap: 12,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
  },
  recordingTimer: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DC2626',
    fontVariant: ['tabular-nums'],
  },
  recordingLabel: {
    fontSize: 14,
    color: '#DC2626',
    flex: 1,
  },
  stopBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  stopBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
