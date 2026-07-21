import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createFundingIntent, getFundingIntents } from '../api';
import { colors, commonStyles } from '../theme';
import { formatMoney, getErrorMessage, parsePositiveAmount, titleize } from '../utils';

export default function AddMoneyScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [intents, setIntents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try { setIntents((await getFundingIntents()).data); }
    catch (loadError) { setError(getErrorMessage(loadError, 'Funding activity could not be loaded.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function createIntent() {
    const parsedAmount = parsePositiveAmount(amount);
    if (parsedAmount === null) {
      Alert.alert('Invalid amount', 'Enter a positive amount with up to two decimal places.');
      return;
    }
    setBusy(true);
    try {
      const response = await createFundingIntent(parsedAmount);
      Alert.alert('Funding started', response.data.message);
      setAmount('');
      await load();
    } catch (error) {
      Alert.alert('Funding failed', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add funds</Text>
        <Text style={styles.note}>Your balance changes only after the configured provider sends a verified, signed webhook.</Text>
        <TextInput style={styles.input} placeholder="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} accessibilityLabel="Funding amount" />
        <TouchableOpacity style={[styles.primary, busy && styles.disabled]} disabled={busy} onPress={createIntent} accessibilityRole="button"><Text style={styles.primaryText}>{busy ? 'Starting…' : 'Continue with provider'}</Text></TouchableOpacity>
        <Text style={styles.heading}>Recent funding</Text>
        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>}
        {loading && <Text style={styles.meta}>Loading funding activity…</Text>}
        {!loading && !error && intents.length === 0 && <Text style={styles.meta}>No funding attempts yet.</Text>}
        {intents.map((intent) => (
          <View key={intent.fundingid} style={styles.card}>
            <Text style={styles.cardTitle}>{formatMoney(intent.amount, intent.currency)} · {titleize(intent.status)}</Text>
            <Text style={styles.meta}>{intent.provider}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Text>Back</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: 24 },
  title: { fontSize: 26, fontWeight: '800', color: colors.primaryDark },
  note: { color: colors.textMuted, lineHeight: 20, marginVertical: 14 },
  input: commonStyles.input,
  primary: { ...commonStyles.primaryButton, marginTop: 12 }, disabled: { backgroundColor: colors.disabled },
  primaryText: commonStyles.primaryButtonText, heading: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 28, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTitle: { fontWeight: '700', color: colors.text }, meta: { color: colors.textMuted, marginTop: 3 },
  errorBox: { backgroundColor: '#FCEBEC', borderRadius: 14, padding: 12 }, errorText: { color: colors.danger },
  retry: { minHeight: 44, justifyContent: 'center' }, retryText: { color: colors.primary, fontWeight: '700' },
  back: { padding: 14, alignItems: 'center' },
});
