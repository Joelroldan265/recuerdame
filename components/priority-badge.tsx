import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Priority, PRIORITY_CONFIG } from '@/lib/task-types';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md' | 'lg';
}

export const PriorityBadge = memo(function PriorityBadge({
  priority,
  size = 'md',
}: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  const sizeStyles = {
    sm: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 13, borderRadius: 8 },
    md: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 15, borderRadius: 10 },
    lg: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 18, borderRadius: 12 },
  }[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          borderRadius: sizeStyles.borderRadius,
          borderColor: config.color,
        },
      ]}
    >
      <Text style={[styles.text, { color: config.color, fontSize: sizeStyles.fontSize }]}>
        {config.emoji} {config.label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
  },
});
