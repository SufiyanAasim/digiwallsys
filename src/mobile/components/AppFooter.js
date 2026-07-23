import React from 'react';
import TouchableOpacity from './TouchableOpacity';

import {  StyleSheet, Text, View  } from 'react-native';
import { colors } from '../theme';

export default function AppFooter({ navigation }) {
  return (
    <View style={styles.footerContainer}>
      <TouchableOpacity
        onPress={() => navigation && navigation.navigate('Credits')}
        accessibilityRole="button"
        accessibilityLabel="View Credits"
      >
        <Text style={styles.linkText}>Credits</Text>
      </TouchableOpacity>
      <Text style={styles.separator}>·</Text>
      <Text style={styles.versionText}>v1.5.5 "Armada"</Text>
      <Text style={styles.separator}>·</Text>
      <Text style={styles.taglineText}>digiwallsys digital wallet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
