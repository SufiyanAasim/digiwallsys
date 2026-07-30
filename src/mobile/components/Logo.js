import { Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../ThemeContext';

// Monogram mark: a lowercase "i" sits behind, a lowercase "d" overlaps it in front —
// short for digiwallsys. The glyphs invert tone per theme (light glass in dark mode,
// dark glass in light mode) so the mark always reads against its own gradient badge.
export default function Logo({ size = 40, radius }) {
  const { colors } = useAppTheme();
  const isDark = colors.mode === 'dark';
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
        colors={isDark ? ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />
      <Text
        style={[
          styles.glyph,
          isDark ? styles.glyphBackDark : styles.glyphBackLight,
          { fontSize: glyphSize, lineHeight: glyphSize, left: size * 0.50, top: size * 0.15 },
        ]}
      >
        i
      </Text>
      <Text
        style={[
          styles.glyph,
          isDark ? styles.glyphFrontDark : styles.glyphFrontLight,
          { fontSize: glyphSize, lineHeight: glyphSize, left: size * 0.12, top: size * 0.13 },
        ]}
      >
        d
      </Text>
      <View style={[styles.border, { borderRadius: cornerRadius, pointerEvents: 'none' }]} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glyph: { position: 'absolute', fontWeight: '800', includeFontPadding: false },
  // Dark mode: light/frosted-white glass glyphs on the gradient.
  glyphBackDark: { color: 'rgba(255,255,255,0.32)' },
  glyphFrontDark: {
    color: 'rgba(255,255,255,0.92)',
    ...Platform.select({
      web: { textShadow: '0 1px 3px rgba(26,10,14,0.35)' },
      default: {
        textShadowColor: 'rgba(26,10,14,0.35)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  // Light mode: dark/smoked-glass glyphs on the same gradient.
  glyphBackLight: { color: 'rgba(26,10,14,0.22)' },
  glyphFrontLight: {
    color: 'rgba(26,10,14,0.85)',
    ...Platform.select({
      web: { textShadow: '0 1px 3px rgba(255,255,255,0.45)' },
      default: {
        textShadowColor: 'rgba(255,255,255,0.45)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  border: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
});
