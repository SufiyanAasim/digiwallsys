import React from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../ThemeContext';

// Soft rose/amber glow behind every screen. The blobs are sized from the actual
// viewport so the glow fills a wide desktop monitor edge to edge instead of
// sitting as two small circles in the middle of the page.
// Screen-level usage. On web the shell paints one AmbientLayer across the whole
// content area, so screens must not paint a second one — that produced a
// brighter band wherever the capped content column sat. On native each screen
// still paints its own.
export default function AmbientBackground() {
  if (Platform.OS === 'web') return null;
  return <AmbientLayer />;
}

// Always paints. Used by the web shell (and by AmbientBackground on native).
export function AmbientLayer() {
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  // On web scale with the viewport (never smaller than a phone-sized blob);
  // on native keep the original fixed sizes.
  const topSize = isWeb ? Math.max(width * 0.85, height * 0.9, 520) : 420;
  const bottomSize = isWeb ? Math.max(width * 0.7, height * 0.8, 460) : 380;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]} pointerEvents="none">
      <LinearGradient colors={[colors.background, colors.background]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[colors.gradientAmbientTop, 'transparent']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.7, y: 0.55 }}
        style={[
          styles.blob,
          {
            top: -topSize * 0.3,
            left: -topSize * 0.2,
            width: topSize,
            height: topSize,
            borderRadius: topSize,
          },
        ]}
      />
      <LinearGradient
        colors={[colors.gradientAmbientBottom, 'transparent']}
        start={{ x: 1, y: 0.1 }}
        end={{ x: 0.2, y: 0.7 }}
        style={[
          styles.blob,
          {
            top: isWeb ? height * 0.18 : 160,
            right: -bottomSize * 0.28,
            width: bottomSize,
            height: bottomSize,
            borderRadius: bottomSize,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blob: { position: 'absolute' },
});
