import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
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

  // Ref para evitar doble-transcripción en StrictMode
  const hasTranscribed = useRef(false);

  const transcribeMutation = trpc.voice.transcribe.useMutation();
  // Guardamos la mutación en ref para que el useEffect siempre tenga la versión actual
  const transcribeMutationRef = useRef(transcribeMutation);
  transcribeMutationRef.current = transcribeMutation;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Función de transcripción estable (no depende de closures que cambien)
  const doTranscribe = useCallback(async (uri: string) => {
    if (Platform.OS === 'web') {
      // En web no hay acceso al sistema de archivos nativo
      setTranscribeError('La grabación de voz no está disponible en web. Escribe el recordatorio manualmente.');
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
        caf: 'audio/x-caf',
      };
      const mimeType = mimeMap[ext] ?? 'audio/m4a';

      // Llamar al backend para transcribir con Whisper
      const result = await transcribeMutationRef.current.mutateAsync({
        audioBase64: base64,
        mimeType,
      });

      if (result.text && result.text.trim()) {
        const transcribed = result.text.trim();
        setTaskText(transcribed);
        // Leer el texto transcrito en voz alta para confirmar
        if (settingsRef.current.soundEnabled) {
          speak(transcribed, settingsRef.current.voiceSpeed);
        }
      } else {
        setTranscribeError('No se detectó texto en la grabación. Escribe el recordatorio manualmente.');
      }
    } catch (err) {
      console.error('[Step2] Transcription error:', err);
      setTranscribeError('No se pudo transcribir. Escribe el recordatorio manualmente.');
    } finally {
      setIsTranscribing(false);
    }
  }, []); // Sin dependencias: usa refs para acceder a valores actuales

  useEffect(() => {
    // Anunciar el paso
    if (settingsRef.current.soundEnabled) {
      speak(VOICE_MESSAGES.step2, settingsRef.current.voiceSpeed);
    }

    // Si hay audio y no hay texto inicial, transcribir (solo una vez)
    if (audioUri && !initialText && !hasTranscribed.current) {
      hasTranscribed.current = true;
      doTranscribe(audioUri);
    }
  }, [audioUri, initialText, doTranscribe]);

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

  const handleRetry = useCallback(() => {
    if (audioUri) {
      hasTranscribed.current = false;
      setTaskText('');
      setTranscribeError(null);
      hasTranscribed.current = true;
      doTranscribe(audioUri);
    }
  }, [audioUri, doTranscribe]);

  const handleReadAloud = useCallback(() => {
    if (taskText.trim()) {
      speak(taskText.trim(), settingsRef.current.voiceSpeed);
    }
  }, [taskText]);

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
            {/* Banner de error */}
            {transcribeError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️ {transcribeError}</Text>
                {audioUri ? (
                  <BigButton
                    label="🔄 Reintentar"
                    onPress={handleRetry}
                    variant="secondary"
                    style={styles.inlineBtnSmall}
                  />
                ) : null}
              </View>
            )}

            {/* Campo de texto */}
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
                placeholder="Escribe tu recordatorio aquí..."
                placeholderTextColor="#9CA3AF"
              />
              {taskText.trim().length > 0 && (
                <View style={styles.textMeta}>
                  <Text style={styles.charCount}>{taskText.trim().length} caracteres</Text>
                  <BigButton
                    label="🔊 Leer"
                    onPress={handleReadAloud}
                    variant="ghost"
                    style={styles.inlineBtnSmall}
                  />
                </View>
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
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 22,
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
  textMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  inlineBtnSmall: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  actions: {
    gap: 12,
  },
});
