import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export const StepIndicator = memo(function StepIndicator({
  currentStep,
  totalSteps,
  labels,
}: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i + 1 === currentStep && styles.dotActive,
              i + 1 < currentStep && styles.dotCompleted,
            ]}
          >
            {i + 1 < currentStep && (
              <Text style={styles.dotCheck}>✓</Text>
            )}
          </View>
        ))}
      </View>
      {labels && labels[currentStep - 1] && (
        <Text style={styles.label}>{labels[currentStep - 1]}</Text>
      )}
      <Text style={styles.counter}>
        Paso {currentStep} de {totalSteps}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1A56DB',
  },
  dotCompleted: {
    backgroundColor: '#0E9F6E',
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  dotCheck: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A56DB',
  },
  counter: {
    fontSize: 14,
    color: '#6B7280',
  },
});
