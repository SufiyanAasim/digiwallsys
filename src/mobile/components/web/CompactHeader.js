import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import HamburgerMenu from '../HamburgerMenu';
import Logo from '../Logo';
import TouchableOpacity from '../TouchableOpacity';
import Wordmark from '../Wordmark';
import { useLogout } from '../ConfirmProvider';
import { useAppTheme } from '../../ThemeContext';
import { radii } from '../../theme';

export default function CompactHeader({ activeRoute, user, onNavigate }) {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { requestLogout } = useLogout();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const initials = String(user?.name || 'DW')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const action = (label, icon, onPress, active = false) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.action, active && styles.actionActive]}
    >
      <Icon name={icon} size={18} color={active ? colors.primary : colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <HamburgerMenu activeRoute={activeRoute} user={user} onNavigate={onNavigate} />
        <Logo size={30} />
        <View>
          <Wordmark size={15} />
          <Text style={styles.route} numberOfLines={1}>{activeRoute}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        {action('Home', 'home-outline', () => onNavigate('Home'), activeRoute === 'Home')}
        {action('Credits', 'information-circle-outline', () => onNavigate('Credits'), activeRoute === 'Credits')}
        {action(isDark ? 'Switch to light theme' : 'Switch to dark theme', isDark ? 'moon-outline' : 'sunny-outline', toggleTheme)}
        {action('Log out', 'log-out-outline', requestLogout)}
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials || 'DW'}</Text></View>
      </View>
    </View>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    header: {
      width: '100%',
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: colors.backgroundElevated,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
      zIndex: 2,
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 },
    route: { color: colors.textMuted, fontSize: 9.5, fontWeight: '700', marginTop: 1, maxWidth: 92 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    action: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    actionActive: { backgroundColor: colors.primarySoft, borderColor: colors.borderStrong },
    avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: colors.primary, fontWeight: '900', fontSize: 10.5 },
  });
}
