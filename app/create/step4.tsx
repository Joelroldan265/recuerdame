import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { BigButton } from '@/components/big-button';
import { StepIndicator } from '@/components/step-indicator';
import { speak, VOICE_MESSAGES } from '@/lib/speech-service';
import { useSettingsContext } from '@/lib/settings-context';
import { RepeatType, REPEAT_CONFIG } from '@/lib/task-types';

const STEP_LABELS = ['Grabación', 'Confirmación', 'Prioridad', 'Repetición', 'Hora'];

export default function Step4Screen() {
  const router = useRouter();
  const { settings } = useSettingsContext();
  const { text, priority } = useLocalSearchParams<{ text: string; priority: string }>();
  const [selected, setSelected] = useState<RepeatType | null>(null);

  useEffect(() => {
    if (settings.soundEnabled) {
      speak(VOICE_MESSAGES.step4, settings.voiceSpeed);
    }
  }, []);

  const handleSelect = useCallback((repeatType: RepeatType) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelected(repeatType);
  }, []);

  const handleContinue = useCallback(() => {
    if (!selected) return;
    router.push({
      pathname: '/create/step5',
      params: { text, priority, repeatType: selected },
    });
  }, [selected, text, priority, router]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepIndicator currentStep={4} totalSteps={5} labels={STEP_LABELS} />

        <View style={styles.titleContainer}>
          <Text style={styles.title}>🔁 Repetición</Text>
          <Text style={styles.subtitle}>¿Con qué frecuencia quieres este recordatorio?</Text>
        </View>

        <View style={styles.options}>
          {(Object.keys(REPEAT_CONFIG) as RepeatType[]).map((repeatType) => {
            const config = REPEAT_CONFIG[repeatType];
            const isSelected = selected === repeatType;
            return (
              <Pressable
                key={repeatType}
                onPress={() => handleSelect(repeatType)}
                accessibilityRole="radio"
                accessibilityLabel={`${config.label}: ${config.description}`}
                accessibilityState={{ checked: isSelected }}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  { transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <Text style={styles.optionEmoji}>{config.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {config.label}
                  </Text>
                  <Text style={styles.optionDescription}>{config.description}</Text>
                </View>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <BigButton
          label="Continuar →"
          onPress={handleContinue}
          variant="primary"
          fullWidth
          disabled={!selected}
        />
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
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  optionSelected: {
    borderColor: '#1A56DB',
    backgroundColor: '#EFF6FF',
    borderWidth: 3,
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  optionLabelSelected: {
    color: '#1A56DB',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A56DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
