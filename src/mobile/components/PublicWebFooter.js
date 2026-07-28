import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import TouchableOpacity from './TouchableOpacity';
import { useAppTheme } from '../ThemeContext';

export const PUBLIC_FOOTER_HEIGHT = 52;

// A fixed footer for the public (unauthenticated) web pages -- Login and its
// "Create an account" state, the only screens with no sidebar to already
// surface Credits and the version. `position: fixed` keeps it pinned to the
// viewport bottom regardless of how far the page above it scrolls; the
// screen that renders this must add PUBLIC_FOOTER_HEIGHT of bottom padding
// to its scroll content so the last section is never hidden behind it.
// Native and authed web routes are unaffected -- this only ever renders here.
export default function PublicWebFooter({ navigation }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.bar}>
      <TouchableOpacity
        onPress={() => navigation && navigation.navigate('Credits')}
        accessibilityRole="button"
        accessibilityLabel="View Credits"
      >
        <Text style={styles.link}>Credits</Text>
      </TouchableOpacity>
      <Text style={styles.dot}>·</Text>
      <Text style={styles.version}>v1.8.0 &quot;Estuary&quot;</Text>
      <Text style={styles.dot}>·</Text>
      <Text style={styles.tagline}>digiwallsys digital wallet</Text>
    </View>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    bar: {
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      height: PUBLIC_FOOTER_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 6,
      paddingHorizontal: 12,
      backgroundColor: colors.backgroundElevated,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
      zIndex: 20,
    },
    link: { color: colors.primary, fontWeight: '700', fontSize: 12.5, textDecorationLine: 'underline' },
    dot: { color: colors.textMuted, fontSize: 12.5 },
    version: { color: colors.text, fontSize: 12.5, fontFamily: 'monospace', fontWeight: '600' },
    tagline: { color: colors.textMuted, fontSize: 12.5 },
  });
}
