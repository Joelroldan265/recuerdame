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
import { speak, VOICE_MESSAGES } from '@/lib/speech-service';
import { useSettingsContext } from '@/lib/settings-context';

const STEP_LABELS = ['Grabación', 'Confirmación', 'Prioridad', 'Repetición', 'Hora'];

export default function Step1Screen() {
  const router = useRouter();
  const { settings } = useSettingsContext();
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [textInput, setTextInput] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  useEffect(() => {
    if (settings.soundEnabled) {
      speak(VOICE_MESSAGES.step1, settings.voiceSpeed);
    }

    // Solicitar permisos de micrófono de forma lazy
    const timer = setTimeout(async () => {
      try {
        if (Platform.OS !== 'web') {
          await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
          const { granted } = await requestRecordingPermissionsAsync();
          setHasPermission(granted);
          if (!granted) {
            Alert.alert(
              'Permiso de micrófono',
              'Para grabar recordatorios, necesitamos acceso al micrófono.',
              [{ text: 'Entendido' }]
            );
          }
        } else {
          setHasPermission(false); // web: usar modo texto
        }
      } catch {
        setHasPermission(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const handlePressIn = useCallback(async () => {
    if (!hasPermission) {
      Alert.alert('Sin permiso', 'No se puede grabar sin permiso de micrófono.');
      return;
    }
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      if (settings.soundEnabled) {
        speak(VOICE_MESSAGES.recording, settings.voiceSpeed);
      }
    } catch (err) {
      console.error('[Step1] Error starting recording:', err);
    }
  }, [hasPermission, audioRecorder, settings]);

  const handlePressOut = useCallback(async () => {
    if (!recorderState.isRecording) return;
    try {
      await audioRecorder.stop();
      if (settings.soundEnabled) {
        speak(VOICE_MESSAGES.recordingStop, settings.voiceSpeed);
      }
      // Navegar a paso 2 con el URI del audio
      const uri = audioRecorder.uri;
      if (uri) {
        router.push({
          pathname: '/create/step2',
          params: { audioUri: uri, text: '' },
        });
      }
    } catch (err) {
      console.error('[Step1] Error stopping recording:', err);
    }
  }, [recorderState.isRecording, audioRecorder, settings, router]);

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
            <MicButton
              isRecording={recorderState.isRecording}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              size={130}
              disabled={hasPermission === false}
            />
            <Text style={styles.voiceInstruction}>
              {recorderState.isRecording
                ? '🔴 Grabando... suelta para terminar'
                : hasPermission === false
                ? '❌ Sin permiso de micrófono'
                : 'Mantén pulsado para grabar'}
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
    paddingVertical: 24,
    gap: 20,
  },
  voiceInstruction: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
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
