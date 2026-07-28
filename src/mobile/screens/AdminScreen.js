import React, { useEffect, useMemo, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  Alert, ScrollView, StyleSheet, Text, TextInput, View  } from 'react-native';
import { getAdminOverview, getAuditLogs, getFraudEvents, getFxRates, reviewFraudEvent, runReconciliation, setFxRate } from '../api';
import AmbientBackground from '../components/AmbientBackground';
import GradientButton from '../components/GradientButton';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, screenBackground } from '../theme';
import { formatMoney, getErrorMessage, titleize } from '../utils';

export default function AdminScreen() {
  const [overview, setOverview] = useState(null);
  const [audits, setAudits] = useState([]);
  const [fraud, setFraud] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [quoteCurrency, setQuoteCurrency] = useState('EUR');
  const [rateValue, setRateValue] = useState('');
  const { colors, commonStyles } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors, commonStyles), [colors, commonStyles]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [overviewResponse, auditResponse, fraudResponse, rateResponse] = await Promise.all([
        getAdminOverview(), getAuditLogs(), getFraudEvents(), getFxRates(),
      ]);
      setOverview(overviewResponse.data); setAudits(auditResponse.data); setFraud(fraudResponse.data); setRates(rateResponse.data);
    } catch (loadError) { setError(getErrorMessage(loadError, 'Admin data could not be loaded.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function reconcile() {
    setBusy('reconcile');
    try {
      const response = await runReconciliation();
      Alert.alert('Reconciliation complete', `${response.data.discrepancy_count} discrepancies found.`);
      await load();
    } catch (error) { Alert.alert('Reconciliation failed', getErrorMessage(error)); }
    finally { setBusy(''); }
  }

  async function review(eventId, status) {
    setBusy(`review-${eventId}`);
    try { await reviewFraudEvent(eventId, status); await load(); }
    catch (error) { Alert.alert('Review failed', getErrorMessage(error)); }
    finally { setBusy(''); }
  }

  async function saveRate() {
    const rate = Number(rateValue);
    if (!(rate > 0) || baseCurrency.length !== 3 || quoteCurrency.length !== 3 || baseCurrency === quoteCurrency) {
      Alert.alert('Check rate details', 'Enter two distinct 3-letter currency codes and a positive rate.');
      return;
    }
    setBusy('rate');
    try {
      await setFxRate(baseCurrency.toUpperCase(), quoteCurrency.toUpperCase(), rate);
      setRateValue('');
      await load();
    } catch (error) { Alert.alert('Could not set rate', getErrorMessage(error)); }
    finally { setBusy(''); }
  }

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Admin operations</Text>
        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retry} onPress={load}><Text style={styles.review}>Try again</Text></TouchableOpacity></View>}
        {loading && <Text style={styles.meta}>Loading admin operations…</Text>}
        {overview && <View style={styles.grid}>{Object.entries(overview).map(([key, value]) => <View key={key} style={styles.metric}><Text style={styles.metricValue} numberOfLines={1}>{key === 'wallet_balance' ? formatMoney(value) : value}</Text><Text style={styles.meta} numberOfLines={1}>{titleize(key)}</Text></View>)}</View>}
        <GradientButton label={busy === 'reconcile' ? 'Reconciling…' : 'Run ledger reconciliation'} disabled={!!busy} onPress={reconcile} />

        <Text style={styles.heading}>Exchange rates</Text>
        <Text style={styles.meta}>Required before users can convert between currencies.</Text>
        <View style={styles.rateRow}>
          <TextInput style={styles.rateInput} placeholder="USD" placeholderTextColor={colors.textFaint} autoCapitalize="characters" maxLength={3} value={baseCurrency} onChangeText={setBaseCurrency} />
          <Text style={styles.meta}>→</Text>
          <TextInput style={styles.rateInput} placeholder="EUR" placeholderTextColor={colors.textFaint} autoCapitalize="characters" maxLength={3} value={quoteCurrency} onChangeText={setQuoteCurrency} />
          <TextInput style={[styles.rateInput, styles.rateValueInput]} placeholder="Rate" placeholderTextColor={colors.textFaint} keyboardType="decimal-pad" value={rateValue} onChangeText={setRateValue} />
        </View>
        <TouchableOpacity style={[styles.secondary, busy === 'rate' && styles.disabled]} disabled={busy === 'rate'} onPress={saveRate}>
          <Text style={styles.secondaryText}>{busy === 'rate' ? 'Saving…' : 'Set rate'}</Text>
        </TouchableOpacity>
        {rates.length === 0 && <Text style={styles.meta}>No exchange rates configured yet.</Text>}
        {rates.map((rate) => (
          <View key={rate.rateid} style={styles.card}>
            <Text style={styles.cardTitle}>1 {rate.base_currency} = {Number(rate.rate).toFixed(4)} {rate.quote_currency}</Text>
            <Text style={styles.meta}>Set {new Date(rate.effective_at).toLocaleString()}</Text>
          </View>
        ))}

        <Text style={styles.heading}>Fraud events</Text>
        {!loading && !error && fraud.length === 0 && <Text style={styles.meta}>No fraud events match this view.</Text>}
        {fraud.slice(0, 20).map((event) => <View key={event.fraudeventid} style={styles.card}><Text style={styles.cardTitle}>{titleize(event.event_type)} · {titleize(event.status)}</Text><Text style={styles.meta}>Risk {event.risk_score} · {event.email || 'system'}</Text>{['open', 'blocked'].includes(event.status) && <View style={styles.reviewRow}><TouchableOpacity disabled={!!busy} onPress={() => review(event.fraudeventid, 'reviewed')}><Text style={styles.review}>Mark reviewed</Text></TouchableOpacity><TouchableOpacity disabled={!!busy} onPress={() => review(event.fraudeventid, 'dismissed')}><Text style={styles.review}>Dismiss</Text></TouchableOpacity></View>}</View>)}
        <Text style={styles.heading}>Audit log</Text>
        {!loading && !error && audits.length === 0 && <Text style={styles.meta}>No audit entries yet.</Text>}
        {audits.slice(0, 30).map((audit) => <View key={audit.auditid} style={styles.card}><Text style={styles.cardTitle}>{titleize(audit.action.replaceAll('.', '_'))}</Text><Text style={styles.meta}>{titleize(audit.resource_type)} · {audit.actor_email || 'system'} · {new Date(audit.created_at).toLocaleString()}</Text></View>)}
      </ScrollView>
    </View>
  );
}

function buildStyles(colors, commonStyles) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: screenBackground(colors) }, content: { padding: 20, gap: 10, ...contentColumn(layout.page) },
    title: { fontSize: 24, fontWeight: '800', color: colors.text }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metric: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 12 },
    metricValue: { fontSize: 18, fontWeight: '800', color: colors.text }, meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    heading: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 14 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12 }, cardTitle: { fontWeight: '700', color: colors.text }, reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 8 }, review: { color: colors.primary, fontWeight: '700' },
    rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rateInput: { ...commonStyles.input, flex: 1, minHeight: 44, textAlign: 'center' },
    rateValueInput: { flex: 1.4 },
    secondary: { minHeight: 44, justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 20, alignItems: 'center' },
    secondaryText: { color: colors.text, fontWeight: '700' }, disabled: { opacity: 0.6 },
    errorBox: { backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', borderRadius: 14, padding: 12 }, errorText: { color: colors.danger }, retry: { minHeight: 44, justifyContent: 'center' },
  });
}
