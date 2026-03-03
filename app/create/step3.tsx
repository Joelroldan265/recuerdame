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
import { Priority, PRIORITY_CONFIG } from '@/lib/task-types';

const STEP_LABELS = ['Grabación', 'Confirmación', 'Prioridad', 'Repetición', 'Hora'];

const PRIORITY_DESCRIPTIONS: Record<Priority, string> = {
  high: 'Urgente, no puede esperar',
  medium: 'Importante pero no urgente',
  low: 'Cuando pueda, sin prisa',
};

export default function Step3Screen() {
  const router = useRouter();
  const { settings } = useSettingsContext();
  const { text } = useLocalSearchParams<{ text: string }>();
  const [selected, setSelected] = useState<Priority | null>(null);

  useEffect(() => {
    if (settings.soundEnabled) {
      speak(VOICE_MESSAGES.step3, settings.voiceSpeed);
    }
  }, []);

  const handleSelect = useCallback((priority: Priority) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelected(priority);
  }, []);

  const handleContinue = useCallback(() => {
    if (!selected) return;
    router.push({
      pathname: '/create/step4',
      params: { text, priority: selected },
    });
  }, [selected, text, router]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepIndicator currentStep={3} totalSteps={5} labels={STEP_LABELS} />

        <View style={styles.titleContainer}>
          <Text style={styles.title}>🎯 Prioridad</Text>
          <Text style={styles.subtitle}>¿Qué tan importante es este recordatorio?</Text>
        </View>

        {/* Resumen del texto */}
        <View style={styles.textSummary}>
          <Text style={styles.textSummaryLabel}>Recordatorio:</Text>
          <Text style={styles.textSummaryValue} numberOfLines={2}>{text}</Text>
        </View>

        {/* Opciones de prioridad */}
        <View style={styles.options}>
          {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((priority) => {
            const config = PRIORITY_CONFIG[priority];
            const isSelected = selected === priority;
            return (
              <Pressable
                key={priority}
                onPress={() => handleSelect(priority)}
                accessibilityRole="radio"
                accessibilityLabel={`Prioridad ${config.label}: ${PRIORITY_DESCRIPTIONS[priority]}`}
                accessibilityState={{ checked: isSelected }}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderColor: isSelected ? config.color : '#E5E7EB',
                    backgroundColor: isSelected ? config.bgColor : '#FFFFFF',
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    borderWidth: isSelected ? 3 : 1.5,
                  },
                ]}
              >
                <Text style={styles.optionEmoji}>{config.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: isSelected ? config.color : '#111827' }]}>
                    {config.label}
                  </Text>
                  <Text style={styles.optionDescription}>{PRIORITY_DESCRIPTIONS[priority]}</Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: config.color }]}>
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
  textSummary: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  textSummaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  textSummaryValue: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '600',
    lineHeight: 26,
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  optionEmoji: {
    fontSize: 36,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 22,
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 15,
    color: '#6B7280',
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
