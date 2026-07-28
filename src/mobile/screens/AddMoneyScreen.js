import React, { useEffect, useMemo, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  Alert, ScrollView, StyleSheet, Text, TextInput, View  } from 'react-native';
import { createFundingIntent, getFundingIntents } from '../api';
import AmbientBackground from '../components/AmbientBackground';
import GradientButton from '../components/GradientButton';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, screenBackground } from '../theme';
import { formatMoney, getErrorMessage, parsePositiveAmount, titleize } from '../utils';

export default function AddMoneyScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [intents, setIntents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { colors, commonStyles } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors, commonStyles), [colors, commonStyles]);

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
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add funds</Text>
        <Text style={styles.note}>Your balance changes only after the configured provider sends a verified, signed webhook.</Text>
        <TextInput style={styles.input} placeholder="Amount" placeholderTextColor={colors.textFaint} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} accessibilityLabel="Funding amount" />
        <GradientButton label={busy ? 'Starting…' : 'Continue with provider'} disabled={busy} onPress={createIntent} style={styles.primary} />
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
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Text style={styles.backText}>Back</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function buildStyles(colors, commonStyles) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: screenBackground(colors) }, content: { padding: 24, ...contentColumn(layout.form) },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    note: { color: colors.textMuted, lineHeight: 20, marginVertical: 14 },
    input: commonStyles.input,
    primary: { marginTop: 12 },
    heading: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 28, marginBottom: 10 },
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
    cardTitle: { fontWeight: '700', color: colors.text }, meta: { color: colors.textMuted, marginTop: 3 },
    errorBox: { backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', borderRadius: 14, padding: 12 }, errorText: { color: colors.danger },
    retry: { minHeight: 44, justifyContent: 'center' }, retryText: { color: colors.primary, fontWeight: '700' },
    back: { padding: 14, alignItems: 'center' }, backText: { color: colors.textMuted, fontWeight: '600' },
  });
}
