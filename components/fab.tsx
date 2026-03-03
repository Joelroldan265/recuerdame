import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface FABProps {
  onPress: () => void;
  label?: string;
}

export const FAB = memo(function FAB({ onPress, label = 'Nuevo recordatorio' }: FABProps) {
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.fab,
        {
          bottom: insets.bottom + 80, // encima del tab bar
          transform: [{ scale: pressed ? 0.92 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text style={styles.icon}>🎙️</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1A56DB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 100,
  },
  icon: {
    fontSize: 28,
  },
});
