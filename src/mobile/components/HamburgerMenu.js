import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import TouchableOpacity from './TouchableOpacity';
import Wordmark from './Wordmark';
import { useLogout } from './ConfirmProvider';
import { useAppTheme } from '../ThemeContext';
import { radii } from '../theme';

const menuRoutes = [
  ['Home', 'Home', 'home-outline'],
  ['Analytics', 'Analytics', 'bar-chart-outline'],
  ['Add Money', 'Add funds', 'add-circle-outline'],
  ['Send Money', 'Send money', 'arrow-redo-outline'],
  ['Payment Tools', 'Request & schedule', 'arrow-undo-outline'],
  ['Payment Calendar', 'Payment calendar', 'calendar-outline'],
  ['QR Payment', 'QR payments', 'qr-code-outline'],
  ['Savings', 'Savings goals', 'trending-up-outline'],
  ['Budgets', 'Budget categories', 'pie-chart-outline'],
  ['Wallets', 'Wallets', 'wallet-outline'],
  ['Family', 'Family wallet', 'people-outline'],
  ['Transactions', 'Transactions', 'time-outline'],
  ['Notifications', 'Notifications', 'notifications-outline'],
  ['Security', 'Security', 'shield-checkmark-outline'],
  ['Credits', 'Credits & Tech', 'information-circle-outline'],
];

export default function HamburgerMenu({ activeRoute, user, onNavigate }) {
  const [open, setOpen] = useState(false);
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { requestLogout } = useLogout();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const visibleRoutes = user?.role === 'admin'
    ? [...menuRoutes, ['Admin', 'Admin Console', 'settings-outline']]
    : menuRoutes;

  function handleNavigate(route) {
    setOpen(false);
    onNavigate?.(route);
  }

  function handleLogout() {
    setOpen(false);
    requestLogout();
  }

  return (
    <>
      <TouchableOpacity
        style={styles.menuTrigger}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
      >
        <Icon name="menu-outline" size={22} color={colors.text} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <View style={styles.brandGroup}>
                <Wordmark size={20} />
                {!!user?.name && <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close navigation menu"
              >
                <Icon name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.menuList} keyboardShouldPersistTaps="handled">
              {visibleRoutes.map(([route, label, icon]) => {
                const isActive = activeRoute === route;
                return (
                  <TouchableOpacity
                    key={route}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => handleNavigate(route)}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                  >
                    <Icon name={icon} size={18} color={isActive ? colors.primary : colors.textMuted} />
                    <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={toggleTheme}
                accessibilityRole="button"
                accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                <Icon name={isDark ? 'moon-outline' : 'sunny-outline'} size={18} color={colors.textMuted} />
                <Text style={styles.menuItemText}>{isDark ? 'Light Theme' : 'Dark Theme'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.logoutItem]}
                onPress={handleLogout}
                accessibilityRole="button"
                accessibilityLabel="Log out"
              >
                <Icon name="log-out-outline" size={18} color={colors.danger} />
                <Text style={styles.logoutText}>Log out</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    menuTrigger: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalOverlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.55)' },
    backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
    drawer: {
      width: '80%',
      maxWidth: 320,
      height: '100%',
      backgroundColor: colors.backgroundElevated,
      borderRightWidth: 1,
      borderRightColor: colors.glassBorder,
      paddingTop: 16,
      paddingBottom: 24,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
    },
    brandGroup: { flex: 1, gap: 2 },
    userName: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuList: { paddingHorizontal: 12, paddingVertical: 12, gap: 4 },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: radii.sm,
    },
    menuItemActive: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.borderStrong },
    menuItemText: { color: colors.textMuted, fontWeight: '600', fontSize: 13.5 },
    menuItemTextActive: { color: colors.primary, fontWeight: '800' },
    divider: { height: 1, backgroundColor: colors.glassBorder, marginVertical: 8 },
    logoutItem: { marginTop: 4 },
    logoutText: { color: colors.danger, fontWeight: '700', fontSize: 13.5 },
  });
}
