import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from '../Logo';
import { useLogout } from '../ConfirmProvider';
import ThemedSwitch from '../ThemedSwitch';
import TouchableOpacity from '../TouchableOpacity';
import Wordmark from '../Wordmark';
import { useAppTheme } from '../../ThemeContext';
import { radii } from '../../theme';

const NAV_ITEMS = [
  { route: 'Home', label: 'Home', icon: 'home-outline' },
  { route: 'Analytics', label: 'Analytics', icon: 'bar-chart-outline' },
  { route: 'Add Money', label: 'Add funds', icon: 'add-circle-outline' },
  { route: 'Send Money', label: 'Send money', icon: 'arrow-redo-outline' },
  { route: 'Payment Tools', label: 'Requests & schedules', icon: 'arrow-undo-outline' },
  { route: 'Payment Calendar', label: 'Payment calendar', icon: 'calendar-outline' },
  { route: 'QR Payment', label: 'QR payments', icon: 'qr-code-outline' },
  { route: 'Savings', label: 'Savings goals', icon: 'trending-up-outline' },
  { route: 'Budgets', label: 'Budget categories', icon: 'pie-chart-outline' },
  { route: 'Wallets', label: 'Wallets', icon: 'wallet-outline' },
  { route: 'Family', label: 'Family wallet', icon: 'people-outline' },
  { route: 'Transactions', label: 'Transactions', icon: 'time-outline' },
  { route: 'Notifications', label: 'Notifications', icon: 'notifications-outline' },
  { route: 'Security', label: 'Security', icon: 'shield-checkmark-outline' },
];

export default function Sidebar({ activeRoute, user, onNavigate }) {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { requestLogout } = useLogout();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const initials = (user?.name || 'DW').trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const items = user?.role === 'admin' ? [...NAV_ITEMS, { route: 'Admin', label: 'Admin operations', icon: 'settings-outline' }] : NAV_ITEMS;

  return (
    <View style={styles.sidebar}>
      {/* The sidebar sits outside the content area's AmbientLayer, so it had
          none of the rose glow every other surface picks up and read as a flat
          slab beside them. This gives it the same wash on its own. */}
      <LinearGradient
        colors={[colors.gradientAmbientTop, 'transparent']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 0.45 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.brandRow}>
        <Logo size={32} />
        <Wordmark size={17} />
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <View style={styles.profileText}>
          <Text style={styles.profileName} numberOfLines={1}>{user?.name || 'Welcome'}</Text>
          <Text style={styles.profileRole} numberOfLines={1}>{user?.role === 'admin' ? 'Administrator' : 'Member'}</Text>
        </View>
      </View>

      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          const active = activeRoute === item.route;
          return (
            <TouchableOpacity
              key={item.route}
              onPress={() => onNavigate(item.route)}
              style={[styles.navItem, active && styles.navItemActive]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              {active && (
                <LinearGradient
                  colors={colors.gradientPrimary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.activeBar}
                  pointerEvents="none"
                />
              )}
              <Icon name={item.icon} size={18} color={active ? colors.primary : colors.textMuted} />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.themeRow}>
          <Icon name={isDark ? 'moon-outline' : 'sunny-outline'} size={16} color={colors.textMuted} />
          <Text style={styles.themeLabel}>{isDark ? 'Dark' : 'Light'} theme</Text>
          <ThemedSwitch value={isDark} onValueChange={toggleTheme} />
        </View>
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('Credits')} accessibilityRole="button" accessibilityLabel="Credits">
          <Icon name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text style={styles.navLabel}>Credits</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutItem} onPress={requestLogout} accessibilityRole="button" accessibilityLabel="Log out">
          <Icon name="log-out-outline" size={18} color={colors.primary} />
          <Text style={styles.logoutLabel}>Log out</Text>
        </TouchableOpacity>
        <Text style={styles.version}>v1.8.0 "Estuary"</Text>
      </View>
    </View>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    sidebar: {
      width: 248,
      minWidth: 248,
      height: '100%',
      overflow: 'hidden',
      backgroundColor: colors.backgroundElevated,
      borderRightWidth: 1,
      borderRightColor: colors.glassBorder,
      paddingVertical: 22,
      paddingHorizontal: 16,
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, marginBottom: 16 },
    profileCard: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder,
      borderRadius: radii.md, padding: 12, marginBottom: 14,
    },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
    profileText: { flex: 1 },
    profileName: { color: colors.text, fontWeight: '700', fontSize: 13 },
    profileRole: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
    nav: { flex: 1 },
    // Tightened so the full nav fits without clipping on a ~1000px-tall window.
    navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 10, borderRadius: radii.sm, marginBottom: 1 },
    navItemActive: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    // Gradient rail on the active item's leading edge, so the selection is the
    // brand's own rose-to-amber rather than a plain tinted rectangle.
    activeBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
    navLabel: { color: colors.textMuted, fontWeight: '600', fontSize: 13.5 },
    navLabelActive: { color: colors.text },
    footer: { borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: 12, marginTop: 8 },
    themeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 4 },
    themeLabel: { color: colors.textMuted, fontWeight: '600', fontSize: 12.5, flex: 1 },
    logoutItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 10, borderRadius: radii.sm },
    logoutLabel: { color: colors.primary, fontWeight: '700', fontSize: 13.5 },
    version: { color: colors.textFaint, fontSize: 10.5, fontFamily: 'monospace', marginTop: 8, paddingHorizontal: 10 },
  });
}
