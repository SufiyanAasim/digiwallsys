import React, { useCallback, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  FlatList, Image, SafeAreaView, StyleSheet, Text, View  } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getBalance, getCurrentUser, getTransactions } from '../api';
import AppFooter from '../components/AppFooter';
import { colors } from '../theme';
import { formatMoney, getErrorMessage } from '../utils';

const actions = [
  ['Add Money', 'Add funds'], ['Send Money', 'Send money'], ['Payment Tools', 'Request & schedule'],
  ['QR Payment', 'QR payments'], ['Transactions', 'Transactions'], ['Notifications', 'Notifications'],
  ['Security', 'Security'], ['Logout', 'Log out'],
];

export default function HomeScreen({ navigation }) {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const visibleActions = user?.role === 'admin' ? [...actions, ['Admin', 'Admin']] : actions;
  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.reference}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View><Text style={styles.title}>digiwallsys</Text><Text style={styles.welcome}>Hello, {user?.name || 'there'}</Text></View>
              <Image source={require('../assets/digiwallsys-icon.png')} style={styles.logo} accessibilityLabel="digiwallsys logo" />
            </View>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balance}>{balance ? formatMoney(balance.balance, balance.currency) : loading ? 'Loading…' : '—'}</Text>
            {!!error && (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={load} style={styles.retry} accessibilityRole="button"><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
              </View>
            )}
            <View style={styles.grid}>
              {visibleActions.map(([route, label]) => (
                <TouchableOpacity key={route} style={styles.action} onPress={() => navigation.navigate(route)} accessibilityRole="button" accessibilityLabel={label}>
                  <Text style={styles.actionText}>{label}</Text>
                </TouchableOpacity>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 48, height: 48, borderRadius: 13 },
  title: { fontSize: 27, fontWeight: '800', color: colors.primaryDark }, welcome: { color: colors.textMuted, marginTop: 2 },
  balanceLabel: { marginTop: 24, color: colors.textMuted }, balance: { fontSize: 34, fontWeight: '800', marginTop: 4, color: colors.text },
  errorBox: { backgroundColor: '#FCEBEC', borderRadius: 14, padding: 12, marginTop: 14 },
  errorText: { color: colors.danger }, retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, retryText: { color: colors.primary, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  action: { flexBasis: '30%', flexGrow: 1, minWidth: '28%', minHeight: 58, backgroundColor: colors.surfaceMuted, borderRadius: 14, justifyContent: 'center', alignItems: 'center', padding: 8 },
  actionText: { color: colors.primaryDark, fontWeight: '700', textAlign: 'center', fontSize: 12 },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 22, marginBottom: 10 },
  empty: { color: colors.textMuted, lineHeight: 21, paddingVertical: 14 },
  transaction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border },
  transactionDetails: { flex: 1, marginRight: 12 },
  transactionTitle: { fontWeight: '700', color: colors.text }, meta: { color: colors.textMuted, marginTop: 3 },
  debit: { color: colors.danger, fontWeight: '800' }, credit: { color: colors.success, fontWeight: '800' },
});
