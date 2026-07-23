import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../ThemeContext';

export default function AmbientBackground() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]} pointerEvents="none">
      <LinearGradient colors={[colors.background, colors.background]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[colors.gradientAmbientTop, 'transparent']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.7, y: 0.55 }}
        style={styles.blobTop}
      />
      <LinearGradient
        colors={[colors.gradientAmbientBottom, 'transparent']}
        start={{ x: 1, y: 0.1 }}
        end={{ x: 0.2, y: 0.7 }}
        style={styles.blobBottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blobTop: { position: 'absolute', top: -140, left: -80, width: 420, height: 420, borderRadius: 420 },
  blobBottom: { position: 'absolute', top: 160, right: -120, width: 380, height: 380, borderRadius: 380 },
});
