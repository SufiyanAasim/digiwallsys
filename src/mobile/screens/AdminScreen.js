import React, { useEffect, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  Alert, ScrollView, StyleSheet, Text, View  } from 'react-native';
import { getAdminOverview, getAuditLogs, getFraudEvents, reviewFraudEvent, runReconciliation } from '../api';
import { colors, commonStyles } from '../theme';
import { formatMoney, getErrorMessage, titleize } from '../utils';

export default function AdminScreen() {
  const [overview, setOverview] = useState(null);
  const [audits, setAudits] = useState([]);
  const [fraud, setFraud] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [overviewResponse, auditResponse, fraudResponse] = await Promise.all([getAdminOverview(), getAuditLogs(), getFraudEvents()]);
      setOverview(overviewResponse.data); setAudits(auditResponse.data); setFraud(fraudResponse.data);
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Admin operations</Text>
        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retry} onPress={load}><Text style={styles.review}>Try again</Text></TouchableOpacity></View>}
        {loading && <Text style={styles.meta}>Loading admin operations…</Text>}
        {overview && <View style={styles.grid}>{Object.entries(overview).map(([key, value]) => <View key={key} style={styles.metric}><Text style={styles.metricValue} numberOfLines={1}>{key === 'wallet_balance' ? formatMoney(value) : value}</Text><Text style={styles.meta} numberOfLines={1}>{titleize(key)}</Text></View>)}</View>}
        <TouchableOpacity style={[styles.primary, !!busy && styles.disabled]} disabled={!!busy} onPress={reconcile}><Text style={styles.white}>{busy === 'reconcile' ? 'Reconciling…' : 'Run ledger reconciliation'}</Text></TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', color: colors.primaryDark }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metric: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 12 },
  metricValue: { fontSize: 18, fontWeight: '800', color: colors.primaryDark }, meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 }, primary: commonStyles.primaryButton, disabled: { backgroundColor: colors.disabled },
  white: commonStyles.primaryButtonText, heading: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 14 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12 }, cardTitle: { fontWeight: '700', color: colors.text }, reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 8 }, review: { color: colors.primary, fontWeight: '700' },
  errorBox: { backgroundColor: '#FCEBEC', borderRadius: 14, padding: 12 }, errorText: { color: colors.danger }, retry: { minHeight: 44, justifyContent: 'center' },
});
