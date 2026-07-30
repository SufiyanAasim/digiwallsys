import { useMemo } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import TouchableOpacity from './TouchableOpacity';
import { useAppTheme } from '../ThemeContext';
import { MotionSection } from '../motion';

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
    <MotionSection style={styles.bar} delay={220} distance={10}>
      <TouchableOpacity
        onPress={() => navigation && navigation.navigate('Credits')}
        accessibilityRole="button"
        accessibilityLabel="View Credits"
      >
        <Text style={styles.link}>Credits</Text>
      </TouchableOpacity>
      <Text style={styles.dot}>·</Text>
      <Text style={styles.version}>v1.9.0 &quot;Crest&quot;</Text>
      <Text style={styles.dot}>·</Text>
      <Text style={styles.tagline}>digiwallsys digital wallet</Text>
    </MotionSection>
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
      // alignItems only centers items within their own wrapped line; with
      // flexWrap set, the line itself packs to the cross-axis start by
      // default, leaving the single line of text pinned to the bar's top
      // edge with all the bar's extra height as dead space below it.
      // alignContent centers the line (or lines, on a narrow viewport)
      // within the bar's full height instead.
      alignContent: 'center',
      gap: 6,
      paddingHorizontal: 12,
      backgroundColor: colors.mode === 'dark' ? 'rgba(0,26,21,0.90)' : 'rgba(239,250,247,0.92)',
      borderTopWidth: 1,
      borderTopColor: colors.borderStrong,
      zIndex: 20,
      backdropFilter: 'blur(20px) saturate(130%)',
      WebkitBackdropFilter: 'blur(20px) saturate(130%)',
    },
    link: { color: colors.primary, fontWeight: '700', fontSize: 12.5, textDecorationLine: 'underline' },
    dot: { color: colors.textMuted, fontSize: 12.5 },
    version: { color: colors.text, fontSize: 12.5, fontFamily: 'monospace', fontWeight: '600' },
    tagline: { color: colors.textMuted, fontSize: 12.5 },
  });
}
