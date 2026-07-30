import { useMemo } from 'react';
import TouchableOpacity from './TouchableOpacity';

import { Platform, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '../ThemeContext';
import { MotionSection } from '../motion';

export default function AppFooter({ navigation }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  // On web the persistent sidebar already surfaces Credits and the version — avoid showing it twice.
  if (Platform.OS === 'web') return null;
  return (
    <MotionSection style={styles.footerContainer} delay={180}>
      <TouchableOpacity
        onPress={() => navigation && navigation.navigate('Credits')}
        accessibilityRole="button"
        accessibilityLabel="View Credits"
      >
        <Text style={styles.linkText}>Credits</Text>
      </TouchableOpacity>
      <Text style={styles.separator}>·</Text>
      <Text style={styles.versionText}>v1.9.0 "Crest"</Text>
      <Text style={styles.separator}>·</Text>
      <Text style={styles.taglineText}>digiwallsys digital wallet</Text>
    </MotionSection>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    footerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 20,
      gap: 6,
    },
    linkText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
      textDecorationLine: 'underline',
    },
    separator: {
      color: colors.textMuted,
      fontSize: 13,
    },
    versionText: {
      color: colors.text,
      fontSize: 13,
      fontFamily: 'monospace',
      fontWeight: '600',
    },
    taglineText: {
      color: colors.textMuted,
      fontSize: 13,
    },
  });
}
