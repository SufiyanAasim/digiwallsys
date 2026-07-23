import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TouchableOpacity from './TouchableOpacity';
import { colors, radii } from '../theme';

export default function GradientButton({ label, onPress, disabled, style, textStyle, ...props }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[styles.wrap, disabled && styles.disabled, style]}
      {...props}
    >
      <LinearGradient
        colors={disabled ? [colors.disabled, colors.disabled] : colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      >
        <Text style={[styles.text, textStyle]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radii.pill, overflow: 'hidden' },
  disabled: { opacity: 0.6 },
  fill: { minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  text: { color: '#1A0A0E', fontWeight: '800', fontSize: 15, letterSpacing: -0.1 },
});
