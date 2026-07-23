import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

// Monogram mark: a lowercase "i" sits behind, a lowercase "d" overlaps it in front —
// short for digiwallsys, and legible at app-icon scale without the old wallet glyph.
export default function Logo({ size = 40, radius }) {
  const cornerRadius = radius ?? size * 0.28;
  const glyphSize = size * 0.62;

  return (
    <LinearGradient
      colors={colors.gradientPrimary}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, { width: size, height: size, borderRadius: cornerRadius }]}
    >
      <Text
        style={[
          styles.glyph,
          styles.glyphBack,
          { fontSize: glyphSize, lineHeight: glyphSize, left: size * 0.50, top: size * 0.15 },
        ]}
      >
        i
      </Text>
      <Text
        style={[
          styles.glyph,
          styles.glyphFront,
          { fontSize: glyphSize, lineHeight: glyphSize, left: size * 0.12, top: size * 0.13 },
        ]}
      >
        d
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glyph: { position: 'absolute', fontWeight: '800', includeFontPadding: false },
  glyphBack: { color: 'rgba(255,255,255,0.55)' },
  glyphFront: { color: '#1A0A0E' },
});
