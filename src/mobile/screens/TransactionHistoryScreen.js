import React, { useEffect, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  Alert, ScrollView, StyleSheet, Text, TextInput, View  } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getBudgetCategories, getReceipt, getTransactions, transactionExportUrl, transactionStatementUrl, updateTransactionCategory } from '../api';
import AmbientBackground from '../components/AmbientBackground';
import { getAccessToken } from '../session';
import { colors, commonStyles, radii } from '../theme';
import { formatMoney, getErrorMessage } from '../utils';

export default function TransactionHistoryScreen() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
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
  useEffect(() => {
    load();
    getBudgetCategories().then((response) => setCategories(response.data)).catch(() => setCategories([]));
  }, []);

  async function receipt(reference) {
    try {
      const value = (await getReceipt(reference)).data.receipt;
      Alert.alert('Receipt', `${value.direction === 'debit' ? 'Paid to' : 'Received from'} ${value.counterparty}\n${formatMoney(value.amount, value.currency)}\n${value.reference}`);
    } catch (receiptError) { Alert.alert('Receipt unavailable', getErrorMessage(receiptError)); }
  }

  async function tagCategory(item) {
    if (item.direction !== 'debit' || categories.length === 0) return;
    Alert.alert(
      'Tag category',
      item.counterparty,
      [
        { text: 'No category', onPress: () => applyCategory(item.reference, null) },
        ...categories.map((category) => ({ text: category.name, onPress: () => applyCategory(item.reference, category.name) })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  async function applyCategory(reference, category) {
    try {
      await updateTransactionCategory(reference, category);
      setTransactions((current) => current.map((t) => (t.reference === reference ? { ...t, category } : t)));
    } catch (tagError) { Alert.alert('Could not tag category', getErrorMessage(tagError)); }
  }

  async function downloadFile(url, filename, mimeType) {
    setBusy(true);
    try {
      const token = await getAccessToken();
      const target = `${FileSystem.cacheDirectory}${filename}`;
      const result = await FileSystem.downloadAsync(url, target, { headers: { Authorization: `Bearer ${token}` } });
      if (result.status < 200 || result.status >= 300) throw new Error(`Export failed with status ${result.status}`);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType });
      else Alert.alert('Export saved', result.uri);
    } catch (exportError) { Alert.alert('Export failed', getErrorMessage(exportError)); }
    finally { setBusy(false); }
  }

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <View style={styles.header}><Text style={styles.title}>Transactions</Text></View>
      <View style={styles.searchRow}>
        <TextInput style={styles.search} placeholder="Search name, note, or reference" placeholderTextColor={colors.textFaint} value={query} onChangeText={setQuery} onSubmitEditing={load} />
        <TouchableOpacity style={styles.searchButton} onPress={load}><Text style={styles.white}>Search</Text></TouchableOpacity>
      </View>
      <View style={styles.exportRow}>
        <TouchableOpacity style={styles.export} disabled={busy} onPress={() => downloadFile(transactionExportUrl(), 'digiwallsys-transactions.csv', 'text/csv')} accessibilityRole="button">
          <Text style={styles.exportText}>{busy ? 'Exporting…' : 'Export CSV'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.export} disabled={busy} onPress={() => downloadFile(transactionStatementUrl(), 'digiwallsys-statement.pdf', 'application/pdf')} accessibilityRole="button">
          <Text style={styles.exportText}>{busy ? 'Exporting…' : 'Export statement (PDF)'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading && <Text style={styles.meta}>Loading transactions…</Text>}
        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>}
        {!loading && !error && transactions.length === 0 && <Text style={styles.meta}>No matching transactions.</Text>}
        {transactions.map((item) => (
          <TouchableOpacity key={item.reference} style={styles.card} onPress={() => receipt(item.reference)} onLongPress={() => tagCategory(item)}>
            <View style={styles.cardDetails}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.counterparty}</Text>
              <Text style={styles.meta} numberOfLines={2}>{item.description || 'Payment'} · {new Date(item.timestamp).toLocaleString()}</Text>
              {!!item.category && <View style={styles.categoryTag}><Text style={styles.categoryTagText}>{item.category}</Text></View>}
            </View>
            <Text style={item.direction === 'debit' ? styles.debit : styles.credit}>{item.direction === 'debit' ? '-' : '+'}{formatMoney(item.amount, item.currency)}</Text>
          </TouchableOpacity>
        ))}
        {transactions.some((item) => item.direction === 'debit') && categories.length > 0 && (
          <Text style={styles.hint}>Tip: long-press a payment you sent to tag it with a budget category.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 25, fontWeight: '800', color: colors.text }, searchRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
  search: { ...commonStyles.input, flex: 1 }, searchButton: { minHeight: 48, justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 14 },
  white: { color: '#1A0A0E', fontWeight: '700' },
  exportRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginTop: 4 },
  export: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, exportText: { color: colors.primary, fontWeight: '700', fontSize: 12.5 },
  content: { padding: 20 }, card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border },
  cardDetails: { flex: 1, marginRight: 12, gap: 4 },
  cardTitle: { fontWeight: '700', color: colors.text }, meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 }, debit: { color: colors.danger, fontWeight: '800' }, credit: { color: colors.success, fontWeight: '800' },
  categoryTag: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2 },
  categoryTagText: { color: colors.primary, fontSize: 10.5, fontWeight: '700' },
  hint: { color: colors.textFaint, fontSize: 11, marginTop: 8 },
  errorBox: { backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', borderRadius: 14, padding: 12 }, errorText: { color: colors.danger }, retry: { minHeight: 44, justifyContent: 'center' }, retryText: { color: colors.primary, fontWeight: '700' },
});
