import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getReceipt, getTransactions, transactionExportUrl } from '../api';
import { getAccessToken } from '../session';
import { colors, commonStyles } from '../theme';
import { formatMoney, getErrorMessage } from '../utils';

export default function TransactionHistoryScreen() {
  const [transactions, setTransactions] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try { setTransactions((await getTransactions({ q: query.trim(), limit: 100 })).data.items || []); }
    catch (loadError) { setError(getErrorMessage(loadError, 'Transaction history could not be loaded.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function receipt(reference) {
    try {
      const value = (await getReceipt(reference)).data.receipt;
      Alert.alert('Receipt', `${value.direction === 'debit' ? 'Paid to' : 'Received from'} ${value.counterparty}\n${formatMoney(value.amount, value.currency)}\n${value.reference}`);
    } catch (receiptError) { Alert.alert('Receipt unavailable', getErrorMessage(receiptError)); }
  }

  async function exportCsv() {
    setBusy(true);
    try {
      const token = await getAccessToken();
      const target = `${FileSystem.cacheDirectory}digiwallsys-transactions.csv`;
      const result = await FileSystem.downloadAsync(transactionExportUrl(), target, { headers: { Authorization: `Bearer ${token}` } });
      if (result.status < 200 || result.status >= 300) throw new Error(`Export failed with status ${result.status}`);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType: 'text/csv' });
      else Alert.alert('Export saved', result.uri);
    } catch (exportError) { Alert.alert('Export failed', getErrorMessage(exportError)); }
    finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Transactions</Text></View>
      <View style={styles.searchRow}>
        <TextInput style={styles.search} placeholder="Search name, note, or reference" value={query} onChangeText={setQuery} onSubmitEditing={load} />
        <TouchableOpacity style={styles.searchButton} onPress={load}><Text style={styles.white}>Search</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.export} disabled={busy} onPress={exportCsv} accessibilityRole="button"><Text style={styles.exportText}>{busy ? 'Exporting…' : 'Export CSV'}</Text></TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content}>
        {loading && <Text style={styles.meta}>Loading transactions…</Text>}
        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>}
        {!loading && !error && transactions.length === 0 && <Text style={styles.meta}>No matching transactions.</Text>}
        {transactions.map((item) => (
          <TouchableOpacity key={item.reference} style={styles.card} onPress={() => receipt(item.reference)}>
            <View style={styles.cardDetails}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.counterparty}</Text>
              <Text style={styles.meta} numberOfLines={2}>{item.description || 'Payment'} · {new Date(item.timestamp).toLocaleString()}</Text>
            </View>
            <Text style={item.direction === 'debit' ? styles.debit : styles.credit}>{item.direction === 'debit' ? '-' : '+'}{formatMoney(item.amount, item.currency)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 25, fontWeight: '800', color: colors.primaryDark }, searchRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
  search: { ...commonStyles.input, flex: 1 }, searchButton: { minHeight: 48, justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 14 },
  white: { color: '#fff', fontWeight: '700' }, export: { minHeight: 48, marginHorizontal: 20, alignItems: 'center', justifyContent: 'center' }, exportText: { color: colors.primary, fontWeight: '700' },
  content: { padding: 20 }, card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border },
  cardDetails: { flex: 1, marginRight: 12 },
  cardTitle: { fontWeight: '700', color: colors.text }, meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 }, debit: { color: colors.danger, fontWeight: '800' }, credit: { color: colors.success, fontWeight: '800' },
  errorBox: { backgroundColor: '#FCEBEC', borderRadius: 14, padding: 12 }, errorText: { color: colors.danger }, retry: { minHeight: 44, justifyContent: 'center' }, retryText: { color: colors.primary, fontWeight: '700' },
});
