import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

// Monogram mark: a lowercase "i" sits behind, a lowercase "d" overlaps it in front —
// short for digiwallsys. Frosted/translucent glyphs plus a top sheen sell the same
// glass material as the rest of the Ember Glass design system.
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
      <LinearGradient
        colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />
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
      <View style={[styles.border, { borderRadius: cornerRadius }]} pointerEvents="none" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glyph: { position: 'absolute', fontWeight: '800', includeFontPadding: false },
  glyphBack: { color: 'rgba(255,255,255,0.32)' },
  glyphFront: {
    color: 'rgba(255,255,255,0.92)',
    textShadowColor: 'rgba(26,10,14,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  border: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
});
