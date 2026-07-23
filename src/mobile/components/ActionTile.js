import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import TouchableOpacity from './TouchableOpacity';
import { useAppTheme } from '../ThemeContext';
import { radii } from '../theme';

export default function ActionTile({ icon, label, onPress }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={17} color={colors.text} />
      </View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    tile: {
      flexBasis: '31%',
      flexGrow: 1,
      minWidth: 92,
      minHeight: 78,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 6,
      gap: 8,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: radii.sm,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { color: colors.text, fontWeight: '600', fontSize: 11.5, textAlign: 'center' },
  });
}
