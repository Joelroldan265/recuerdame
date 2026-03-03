import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { BigButton } from '@/components/big-button';
import { StepIndicator } from '@/components/step-indicator';
import { speak, VOICE_MESSAGES } from '@/lib/speech-service';
import { useSettingsContext } from '@/lib/settings-context';
import { trpc } from '@/lib/trpc';

const STEP_LABELS = ['Grabación', 'Confirmación', 'Prioridad', 'Repetición', 'Hora'];

export default function Step2Screen() {
  const router = useRouter();
  const { settings } = useSettingsContext();
  const { audioUri, text: initialText } = useLocalSearchParams<{
    audioUri: string;
    text: string;
  }>();

  const [taskText, setTaskText] = useState(initialText ?? '');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const transcribeMutation = trpc.voice.transcribe.useMutation();

  useEffect(() => {
    if (settings.soundEnabled) {
      speak(VOICE_MESSAGES.step2, settings.voiceSpeed);
    }

    // Si hay audio y no hay texto inicial, transcribir
    if (audioUri && !initialText) {
      transcribeRecording(audioUri);
    }
  }, []);

  const transcribeRecording = useCallback(async (uri: string) => {
    if (Platform.OS === 'web') {
      // En web no hay acceso al sistema de archivos nativo
      setTaskText('');
      return;
    }

    setIsTranscribing(true);
    setTranscribeError(null);

    try {
      // Leer el archivo de audio como base64 usando expo-file-system/legacy
      const FileSystem = await import('expo-file-system/legacy');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Determinar el tipo MIME según la extensión del URI
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'm4a';
      const mimeMap: Record<string, string> = {
        m4a: 'audio/m4a',
        mp4: 'audio/mp4',
        wav: 'audio/wav',
        webm: 'audio/webm',
        ogg: 'audio/ogg',
        mp3: 'audio/mpeg',
      };
      const mimeType = mimeMap[ext] ?? 'audio/m4a';

      // Llamar al backend para transcribir
      const result = await transcribeMutation.mutateAsync({
        audioBase64: base64,
        mimeType,
      });

      if (result.text && result.text.trim()) {
        setTaskText(result.text.trim());
        if (settings.soundEnabled) {
          speak(result.text.trim(), settings.voiceSpeed);
        }
      } else {
        setTranscribeError('No se pudo transcribir el audio. Escribe el recordatorio manualmente.');
      }
    } catch (err) {
      console.error('[Step2] Transcription error:', err);
      setTranscribeError('Error al transcribir. Escribe el recordatorio manualmente.');
    } finally {
      setIsTranscribing(false);
    }
  }, [transcribeMutation, settings]);

  const handleContinue = useCallback(() => {
    const trimmed = taskText.trim();
    if (!trimmed) return;
    router.push({
      pathname: '/create/step3',
      params: { text: trimmed },
    });
  }, [taskText, router]);

  const handleReRecord = useCallback(() => {
    router.back();
  }, [router]);

  const handleRetryTranscription = useCallback(() => {
    if (audioUri) {
      setTaskText('');
      transcribeRecording(audioUri);
    }
  }, [audioUri, transcribeRecording]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <StepIndicator currentStep={2} totalSteps={5} labels={STEP_LABELS} />

        <View style={styles.titleContainer}>
          <Text style={styles.title}>✏️ Confirma el texto</Text>
          <Text style={styles.subtitle}>¿Está correcto tu recordatorio?</Text>
        </View>

        {isTranscribing ? (
          <View style={styles.transcribingContainer}>
            <ActivityIndicator size="large" color="#1A56DB" />
            <Text style={styles.transcribingText}>🎙️ Transcribiendo tu grabación...</Text>
            <Text style={styles.transcribingSubtext}>Esto puede tardar unos segundos</Text>
          </View>
        ) : (
          <>
            {/* Mensaje de error de transcripción */}
            {transcribeError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️ {transcribeError}</Text>
                {audioUri ? (
                  <BigButton
                    label="🔄 Reintentar"
                    onPress={handleRetryTranscription}
                    variant="secondary"
                    style={styles.retryBtn}
                  />
                ) : null}
              </View>
            )}

            <View style={styles.textContainer}>
              <Text style={styles.textLabel}>Tu recordatorio:</Text>
              <TextInput
                style={styles.textInput}
                value={taskText}
                onChangeText={setTaskText}
                multiline
                autoFocus={!audioUri || !!transcribeError}
                returnKeyType="done"
                accessibilityLabel="Texto del recordatorio. Puedes editarlo."
                placeholder="Escribe tu recordatorio..."
                placeholderTextColor="#9CA3AF"
              />
              {taskText.trim().length > 0 && (
                <Text style={styles.charCount}>{taskText.trim().length} caracteres</Text>
              )}
            </View>
          </>
        )}

        <View style={styles.actions}>
          <BigButton
            label="✅ Suena bien, continuar"
            onPress={handleContinue}
            variant="success"
            fullWidth
            disabled={!taskText.trim() || isTranscribing}
          />
          <BigButton
            label="🎙️ Grabar de nuevo"
            onPress={handleReRecord}
            variant="secondary"
            fullWidth
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 20,
    gap: 20,
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
  transcribingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  transcribingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A56DB',
    textAlign: 'center',
  },
  transcribingSubtext: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    gap: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#92400E',
    fontWeight: '500',
  },
  retryBtn: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textContainer: {
    gap: 8,
  },
  textLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
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
  charCount: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  actions: {
    gap: 12,
  },
});
