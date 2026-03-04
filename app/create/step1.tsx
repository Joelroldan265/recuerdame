import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { ScreenContainer } from '@/components/screen-container';
import { MicButton } from '@/components/mic-button';
import { BigButton } from '@/components/big-button';
import { StepIndicator } from '@/components/step-indicator';
import { speak, stopSpeaking, VOICE_MESSAGES } from '@/lib/speech-service';
import { useSettingsContext } from '@/lib/settings-context';

const STEP_LABELS = ['Grabación', 'Confirmación', 'Prioridad', 'Repetición', 'Hora'];
const MAX_RECORDING_SECONDS = 30;

/** Formatea segundos como "0:05", "1:23" */
function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Step1Screen() {
  const router = useRouter();
  const { settings } = useSettingsContext();
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [textInput, setTextInput] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Estado del micrófono: 'idle' | 'speaking' | 'ready' | 'recording'
  const [micState, setMicState] = useState<'idle' | 'speaking' | 'ready' | 'recording'>('idle');

  // Cronómetro de grabación
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isMountedRef = useRef(true);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  // ─── Inicialización ────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    if (settings.soundEnabled) {
      setMicState('speaking');
      speak(VOICE_MESSAGES.step1, settings.voiceSpeed, () => {
        if (isMountedRef.current) setMicState('ready');
      });
    } else {
      setMicState('ready');
    }

    // Solicitar permisos de micrófono de forma lazy
    const timer = setTimeout(async () => {
      if (!isMountedRef.current) return;
      try {
        if (Platform.OS !== 'web') {
          await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
          const { granted } = await requestRecordingPermissionsAsync();
          if (isMountedRef.current) setHasPermission(granted);
          if (!granted) {
            Alert.alert(
              'Permiso de micrófono',
              'Para grabar recordatorios, necesitamos acceso al micrófono.',
              [{ text: 'Entendido' }]
            );
          }
        } else {
          if (isMountedRef.current) setHasPermission(false);
        }
      } catch {
        if (isMountedRef.current) setHasPermission(false);
      }
    }, 300);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      stopSpeaking();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Cronómetro ────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordingSeconds(prev => {
        if (prev >= MAX_RECORDING_SECONDS - 1) {
          // Detener automáticamente al llegar al límite
          return prev + 1;
        }
        return prev + 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Auto-stop al llegar al límite máximo
  useEffect(() => {
    if (recordingSeconds >= MAX_RECORDING_SECONDS && micState === 'recording') {
      handlePressOut();
    }
  }, [recordingSeconds]);

  // ─── Saltar instrucción ────────────────────────────────────────────────────
  const handleSkipInstruction = useCallback(() => {
    stopSpeaking();
    if (isMountedRef.current) setMicState('ready');
  }, []);

  // ─── Grabación ─────────────────────────────────────────────────────────────
  const handlePressIn = useCallback(async () => {
    if (micState === 'speaking') return;
    if (!hasPermission) {
      Alert.alert('Sin permiso', 'No se puede grabar sin permiso de micrófono.');
      return;
    }
    try {
      stopSpeaking();
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setMicState('recording');
      startTimer();
    } catch (err) {
      console.error('[Step1] Error starting recording:', err);
    }
  }, [micState, hasPermission, audioRecorder, startTimer]);

  const handlePressOut = useCallback(async () => {
    if (!recorderState.isRecording) return;
    try {
      stopTimer();
      await audioRecorder.stop();
      setMicState('idle');
      const uri = audioRecorder.uri;
      if (uri) {
        router.push({
          pathname: '/create/step2',
          params: { audioUri: uri, text: '' },
        });
      }
    } catch (err) {
      console.error('[Step1] Error stopping recording:', err);
      stopTimer();
      setMicState('ready');
    }
  }, [recorderState.isRecording, audioRecorder, router, stopTimer]);

  const handleTextContinue = useCallback(() => {
    const trimmed = textInput.trim();
    if (!trimmed) {
      Alert.alert('Texto vacío', 'Por favor escribe tu recordatorio.');
      return;
    }
    router.push({
      pathname: '/create/step2',
      params: { audioUri: '', text: trimmed },
    });
  }, [textInput, router]);

  // ─── Instrucción visual ────────────────────────────────────────────────────
  const micInstruction = (() => {
    if (micState === 'speaking') return '🔊 Escucha las instrucciones...';
    if (micState === 'recording') return `🔴 Grabando ${formatTime(recordingSeconds)} — suelta para terminar`;
    if (hasPermission === false) return '❌ Sin permiso de micrófono';
    if (micState === 'ready') return '✅ Listo — mantén pulsado para grabar';
    return 'Mantén pulsado para grabar';
  })();

  const micDisabled = micState === 'speaking' || hasPermission === false;

  // Color del cronómetro: verde → amarillo → rojo según tiempo
  const timerColor = recordingSeconds >= 25 ? '#EF4444' : recordingSeconds >= 15 ? '#F59E0B' : '#0E9F6E';

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Indicador de pasos */}
        <StepIndicator currentStep={1} totalSteps={5} labels={STEP_LABELS} />

        {/* Título */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>🎙️ Tu recordatorio</Text>
          <Text style={styles.subtitle}>Graba o escribe lo que quieres recordar</Text>
        </View>

        {/* Selector de modo */}
        <View style={styles.modeSelector}>
          <Pressable
            onPress={() => setMode('voice')}
            style={[styles.modeBtn, mode === 'voice' && styles.modeBtnActive]}
          >
            <Text style={[styles.modeBtnText, mode === 'voice' && styles.modeBtnTextActive]}>
              🎙️ Voz
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('text')}
            style={[styles.modeBtn, mode === 'text' && styles.modeBtnActive]}
          >
            <Text style={[styles.modeBtnText, mode === 'text' && styles.modeBtnTextActive]}>
              ⌨️ Texto
            </Text>
          </Pressable>
        </View>

        {mode === 'voice' ? (
          <View style={styles.voiceContainer}>

            {/* Banner: app hablando + botón saltar */}
            {micState === 'speaking' && (
              <View style={styles.speakingBanner}>
                <Text style={styles.speakingBannerText}>
                  🔊 Escucha la instrucción...
                </Text>
                <Pressable
                  onPress={handleSkipInstruction}
                  style={styles.skipBtn}
                >
                  <Text style={styles.skipBtnText}>Saltar ⏭</Text>
                </Pressable>
              </View>
            )}

            {/* Cronómetro de grabación */}
            {micState === 'recording' && (
              <View style={styles.timerContainer}>
                <Text style={[styles.timerText, { color: timerColor }]}>
                  {formatTime(recordingSeconds)}
                </Text>
                <View style={styles.timerBar}>
                  <View
                    style={[
                      styles.timerBarFill,
                      {
                        width: `${(recordingSeconds / MAX_RECORDING_SECONDS) * 100}%` as `${number}%`,
                        backgroundColor: timerColor,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.timerLimit}>máx. {MAX_RECORDING_SECONDS}s</Text>
              </View>
            )}

            <MicButton
              isRecording={recorderState.isRecording}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              size={130}
              disabled={micDisabled}
            />

            <Text style={[
              styles.voiceInstruction,
              micState === 'ready' && styles.voiceInstructionReady,
              micState === 'speaking' && styles.voiceInstructionSpeaking,
              micState === 'recording' && styles.voiceInstructionRecording,
            ]}>
              {micInstruction}
            </Text>

            {hasPermission === false && (
              <BigButton
                label="Usar modo texto"
                onPress={() => setMode('text')}
                variant="secondary"
                style={styles.fallbackBtn}
              />
            )}
          </View>
        ) : (
          <View style={styles.textContainer}>
            <TextInput
              style={styles.textInput}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Escribe tu recordatorio aquí..."
              placeholderTextColor="#9CA3AF"
              multiline
              autoFocus
              returnKeyType="done"
              accessibilityLabel="Escribe tu recordatorio"
            />
            <BigButton
              label="Continuar →"
              onPress={handleTextContinue}
              variant="primary"
              fullWidth
              disabled={!textInput.trim()}
            />
          </View>
        )}

        {/* Botón cancelar */}
        <BigButton
          label="Cancelar"
          onPress={() => router.back()}
          variant="ghost"
          style={styles.cancelBtn}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  titleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
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
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeBtnTextActive: {
    color: '#1A56DB',
  },
  voiceContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  speakingBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  speakingBannerText: {
    fontSize: 16,
    color: '#1D4ED8',
    fontWeight: '600',
    textAlign: 'center',
  },
  skipBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  skipBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  timerContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  timerText: {
    fontSize: 42,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  timerBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  timerLimit: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  voiceInstruction: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  voiceInstructionReady: {
    color: '#0E9F6E',
    fontWeight: '700',
  },
  voiceInstructionSpeaking: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  voiceInstructionRecording: {
    color: '#EF4444',
    fontWeight: '700',
  },
  fallbackBtn: {
    marginTop: 8,
  },
  textContainer: {
    gap: 16,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1A56DB',
    borderRadius: 16,
    padding: 20,
    fontSize: 22,
    color: '#111827',
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 32,
  },
  cancelBtn: {
    marginTop: 8,
    alignSelf: 'center',
  },
});
