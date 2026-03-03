import React, { memo } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type BigButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';

interface BigButtonProps {
  label: string;
  onPress: () => void;
  variant?: BigButtonVariant;
  emoji?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<BigButtonVariant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: '#1A56DB', text: '#FFFFFF' },
  secondary: { bg: '#E5E7EB', text: '#111827' },
  success:   { bg: '#0E9F6E', text: '#FFFFFF' },
  danger:    { bg: '#FF5A1F', text: '#FFFFFF' },
  ghost:     { bg: 'transparent', text: '#1A56DB', border: '#1A56DB' },
};

export const BigButton = memo(function BigButton({
  label,
  onPress,
  variant = 'primary',
  emoji,
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}: BigButtonProps) {
  const variantStyle = VARIANT_STYLES[variant];

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: variantStyle.bg,
          borderWidth: variantStyle.border ? 2 : 0,
          borderColor: variantStyle.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text} size="small" />
      ) : (
        <Text style={[styles.label, { color: variantStyle.text }, textStyle]}>
          {emoji ? `${emoji}  ` : ''}{label}
        </Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    minHeight: 64,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
