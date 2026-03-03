import React, { memo, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface MicButtonProps {
  isRecording: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  size?: number;
  disabled?: boolean;
}

export const MicButton = memo(function MicButton({
  isRecording,
  onPressIn,
  onPressOut,
  size = 120,
  disabled = false,
}: MicButtonProps) {
  const wave1 = useRef(new Animated.Value(1)).current;
  const wave2 = useRef(new Animated.Value(1)).current;
  const wave3 = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRecording) {
      animRef.current = Animated.loop(
        Animated.stagger(200, [
          Animated.sequence([
            Animated.timing(wave1, { toValue: 1.3, duration: 600, useNativeDriver: true }),
            Animated.timing(wave1, { toValue: 1, duration: 600, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(wave2, { toValue: 1.5, duration: 600, useNativeDriver: true }),
            Animated.timing(wave2, { toValue: 1, duration: 600, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(wave3, { toValue: 1.7, duration: 600, useNativeDriver: true }),
            Animated.timing(wave3, { toValue: 1, duration: 600, useNativeDriver: true }),
          ]),
        ])
      );
      animRef.current.start();
    } else {
      animRef.current?.stop();
      wave1.setValue(1);
      wave2.setValue(1);
      wave3.setValue(1);
    }

    return () => {
      animRef.current?.stop();
    };
  }, [isRecording, wave1, wave2, wave3]);

  const handlePressIn = () => {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    onPressIn();
  };

  const handlePressOut = () => {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onPressOut();
  };

  const innerSize = size;
  const wave1Size = size * 1.3;
  const wave2Size = size * 1.5;
  const wave3Size = size * 1.7;

  return (
    <View style={[styles.container, { width: wave3Size, height: wave3Size }]}>
      {/* Ondas de grabación */}
      {isRecording && (
        <>
          <Animated.View
            style={[
              styles.wave,
              {
                width: wave3Size,
                height: wave3Size,
                borderRadius: wave3Size / 2,
                backgroundColor: '#1A56DB',
                opacity: 0.08,
                transform: [{ scale: wave3 }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.wave,
              {
                width: wave2Size,
                height: wave2Size,
                borderRadius: wave2Size / 2,
                backgroundColor: '#1A56DB',
                opacity: 0.12,
                transform: [{ scale: wave2 }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.wave,
              {
                width: wave1Size,
                height: wave1Size,
                borderRadius: wave1Size / 2,
                backgroundColor: '#1A56DB',
                opacity: 0.18,
                transform: [{ scale: wave1 }],
              },
            ]}
          />
        </>
      )}

      {/* Botón principal */}
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'Grabando. Suelta para terminar.' : 'Toca y mantén para grabar'}
        style={({ pressed }) => [
          styles.button,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: isRecording ? '#FF5A1F' : '#1A56DB',
            transform: [{ scale: pressed ? 0.95 : 1 }],
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <View style={[styles.micBody, { backgroundColor: '#FFFFFF' }]} />
          <View style={[styles.micBase, { borderColor: '#FFFFFF' }]} />
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: {
    position: 'absolute',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBody: {
    width: 20,
    height: 32,
    borderRadius: 10,
    marginBottom: 4,
  },
  micBase: {
    width: 32,
    height: 16,
    borderWidth: 3,
    borderRadius: 16,
    borderTopWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});
