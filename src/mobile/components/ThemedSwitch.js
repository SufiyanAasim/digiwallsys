import React from 'react';
import { Switch } from 'react-native';
import { useAppTheme } from '../ThemeContext';

// Plain RN Switch renders browser/OS default thumb+track colors on web unless every
// state is themed explicitly — this keeps it on-brand in both light and dark mode.
export default function ThemedSwitch({ value, onValueChange, disabled }) {
  const { colors } = useAppTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
      thumbColor={value ? '#FFFFFF' : colors.textFaint}
      ios_backgroundColor={colors.surfaceMuted}
      activeThumbColor="#FFFFFF"
    />
  );
}
