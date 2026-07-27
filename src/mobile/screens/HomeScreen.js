import React, { useCallback, useMemo, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  FlatList, Platform, SafeAreaView, StyleSheet, Text, View  } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getBalance, getCurrentUser, getTransactions } from '../api';
import ActionTile from '../components/ActionTile';
import AmbientBackground from '../components/AmbientBackground';
import AppFooter from '../components/AppFooter';
import { useLogout } from '../components/ConfirmProvider';
import { useToast } from '../components/ToastProvider';
import Wordmark from '../components/Wordmark';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, radii } from '../theme';
import { formatMoney, getErrorMessage } from '../utils';

const LOGOUT_ACTION = 'Logout';

const actions = [
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
  ['Logout', 'Log out', 'log-out-outline'],
];

export default function HomeScreen({ navigation, route }) {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const { requestLogout } = useLogout();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [balanceResponse, transactionResponse, userResponse] = await Promise.all([
        getBalance(), getTransactions({ limit: 8 }), getCurrentUser(),
      ]);
        setBalance(balanceResponse.data);
        setTransactions(transactionResponse.data.items || []);
        setUser(userResponse.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Your wallet could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  useFocusEffect(useCallback(() => {
    if (route.params?.justLoggedIn) {
      showToast('Signed in successfully', `Welcome back, ${route.params.name || 'there'}`);
      navigation.setParams({ justLoggedIn: false, name: undefined });
    }
  }, [route.params?.justLoggedIn]));

  const visibleActions = user?.role === 'admin' ? [...actions, ['Admin', 'Admin', 'settings-outline']] : actions;
  const initials = (user?.name || 'DW').trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground />
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.reference}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Wordmark size={19} />
                <Text style={styles.welcome}>Hello, {user?.name || 'there'}</Text>
              </View>
              <View style={styles.headerActions}>
                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    style={styles.themeToggle}
                    onPress={toggleTheme}
                    accessibilityRole="button"
                    accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                  >
                    <Icon name={isDark ? 'moon-outline' : 'sunny-outline'} size={18} color={colors.text} />
                  </TouchableOpacity>
                )}
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
              </View>
            </View>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Available balance</Text>
              <Text style={styles.balance}>{balance ? formatMoney(balance.balance, balance.currency) : loading ? 'Loading…' : '—'}</Text>
            </View>
            {!!error && (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={load} style={styles.retry} accessibilityRole="button"><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
              </View>
            )}
            <View style={styles.grid}>
              {visibleActions.map(([route, label, icon]) => (
                <ActionTile
                  key={route}
                  icon={icon}
                  label={label}
                  onPress={route === LOGOUT_ACTION ? requestLogout : () => navigation.navigate(route)}
                />
              ))}
            </View>
            <Text style={styles.heading}>Recent transactions</Text>
          </>
        }
        ListEmptyComponent={!loading && !error ? <Text style={styles.empty}>No transactions yet. Your completed payments will appear here.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.transaction}>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionTitle} numberOfLines={1}>{item.counterparty}</Text>
              <Text style={styles.meta}>{new Date(item.timestamp).toLocaleDateString()}</Text>
            </View>
            <Text style={item.direction === 'debit' ? styles.debit : styles.credit}>{item.direction === 'debit' ? '-' : '+'}{formatMoney(item.amount, item.currency)}</Text>
          </View>
        )}
        ListFooterComponent={<AppFooter navigation={navigation} />}
      />
    </SafeAreaView>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { padding: 20, paddingBottom: 36, ...contentColumn(layout.wide) },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    welcome: { color: colors.textMuted, marginTop: 2, fontSize: 12.5 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    themeToggle: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
    balanceCard: {
      marginTop: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.xl,
      padding: 22,
    },
    balanceLabel: { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
    balance: { fontSize: 36, fontWeight: '800', marginTop: 8, color: colors.text, letterSpacing: -0.5 },
    errorBox: { backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', borderRadius: radii.md, padding: 12, marginTop: 14 },
    errorText: { color: colors.danger }, retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, retryText: { color: colors.primary, fontWeight: '700' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
    heading: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 26, marginBottom: 10 },
    empty: { color: colors.textMuted, lineHeight: 21, paddingVertical: 14 },
    transaction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border },
    transactionDetails: { flex: 1, marginRight: 12 },
    transactionTitle: { fontWeight: '700', color: colors.text }, meta: { color: colors.textMuted, marginTop: 3 },
    debit: { color: colors.danger, fontWeight: '800' }, credit: { color: colors.success, fontWeight: '800' },
  });
}
