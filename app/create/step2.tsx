import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { BigButton } from '@/components/big-button';
import { StepIndicator } from '@/components/step-indicator';
import { speak, VOICE_MESSAGES } from '@/lib/speech-service';
import { useSettingsContext } from '@/lib/settings-context';

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

  useEffect(() => {
    if (settings.soundEnabled) {
      speak(VOICE_MESSAGES.step2, settings.voiceSpeed);
    }

    // Si hay audio, intentar transcribir (simulado — en producción usar Whisper)
    if (audioUri && !initialText) {
      setIsTranscribing(true);
      // Simulación: en producción, enviar audioUri al backend Whisper
      const timer = setTimeout(() => {
        setTaskText('Recordatorio grabado por voz');
        setIsTranscribing(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

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
            <Text style={styles.transcribingText}>Transcribiendo tu grabación...</Text>
          </View>
        ) : (
          <View style={styles.textContainer}>
            <Text style={styles.textLabel}>Tu recordatorio:</Text>
            <TextInput
              style={styles.textInput}
              value={taskText}
              onChangeText={setTaskText}
              multiline
              autoFocus={!audioUri}
              returnKeyType="done"
              accessibilityLabel="Texto del recordatorio. Puedes editarlo."
              placeholder="Escribe tu recordatorio..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
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
    gap: 16,
  },
  transcribingText: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
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
  actions: {
    gap: 12,
  },
});
