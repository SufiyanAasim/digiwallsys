import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../ThemeContext';

// Soft rose/amber glow behind every screen. On web the viewport is far larger
// than a phone, so the blobs scale up to fill a desktop monitor organically
// instead of reading as two small circles in the corner.
export default function AmbientBackground() {
  const { colors } = useAppTheme();
  const isWeb = Platform.OS === 'web';
  const topSize = isWeb ? 1100 : 420;
  const bottomSize = isWeb ? 980 : 380;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]} pointerEvents="none">
      <LinearGradient colors={[colors.background, colors.background]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[colors.gradientAmbientTop, 'transparent']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.7, y: 0.55 }}
        style={[
          styles.blob,
          { top: isWeb ? -280 : -140, left: isWeb ? -200 : -80, width: topSize, height: topSize, borderRadius: topSize },
        ]}
      />
      <LinearGradient
        colors={[colors.gradientAmbientBottom, 'transparent']}
        start={{ x: 1, y: 0.1 }}
        end={{ x: 0.2, y: 0.7 }}
        style={[
          styles.blob,
          { top: isWeb ? 200 : 160, right: isWeb ? -280 : -120, width: bottomSize, height: bottomSize, borderRadius: bottomSize },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blob: { position: 'absolute' },
});
