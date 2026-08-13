import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import TouchableOpacity from '../components/TouchableOpacity';
import {
  getBalance,
  getCurrentUser,
  getNotificationPreferences,
  getPaymentRequests,
  getTransactions,
  getWallets,
} from '../api';
import AmbientBackground from '../components/AmbientBackground';
import { ChartLegend } from '../components/DonutChart';
import DonutChart from '../components/DonutChart';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, radii, screenBackground } from '../theme';
import { formatMoney, getErrorMessage } from '../utils';

const MAX_PAGES = 4;

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function fetchMonthTransactions(from, currency) {
  const items = [];
  let cursor;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await getTransactions({ from, currency, limit: 100, ...(cursor ? { cursor } : {}) });
    const batch = response.data.items || [];
    items.push(...batch);
    if (!response.data.nextCursor || batch.length < 100) break;
    cursor = response.data.nextCursor;
  }
  return items;
}


export default function AnalyticsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const { colors, commonStyles } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors, commonStyles), [colors, commonStyles]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const monthStart = startOfMonth();
      const from = monthStart.toISOString();
      const walletsResponse = await getWallets();
      const walletCurrencies = walletsResponse.data.map((wallet) => wallet.currency);
      const currency = walletCurrencies.includes(selectedCurrency)
        ? selectedCurrency
        : walletCurrencies[0];
      if (!currency) throw new Error('Create a wallet before opening analytics.');
      setCurrencies(walletCurrencies);
      if (currency !== selectedCurrency) setSelectedCurrency(currency);
      const [balanceResponse, preferenceResponse, currentUserResponse, requestResponse, transactions] = await Promise.all([
        getBalance(currency),
        getNotificationPreferences(),
        getCurrentUser(),
        getPaymentRequests(),
        fetchMonthTransactions(from, currency),
      ]);

      const totalIn = transactions.filter((t) => t.direction === 'credit').reduce((sum, t) => sum + Number(t.amount), 0);
      const totalOut = transactions.filter((t) => t.direction === 'debit').reduce((sum, t) => sum + Number(t.amount), 0);
      const alertAmount = preferenceResponse.data.spending_alert_currency === currency
        ? Number(preferenceResponse.data.spending_alert_amount) || 0
        : 0;
      const balance = Number(balanceResponse.data.balance) || 0;
      const myId = currentUserResponse.data.id;

      const requestSpend = requestResponse.data
        .filter((r) => r.status === 'paid' && r.currency === currency
          && r.payer_userid === myId && new Date(r.updated_at) >= monthStart)
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const directSpend = Math.max(totalOut - requestSpend, 0);

      setSummary({
        currency,
        totalIn,
        totalOut,
        balance,
        net: totalIn - totalOut,
        count: transactions.length,
        alertAmount,
        capped: transactions.length >= 100 * MAX_PAGES,
        directSpend,
        requestSpend,
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Analytics could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [selectedCurrency]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const alertRatio = summary?.alertAmount ? Math.min(summary.totalOut / summary.alertAmount, 1) : 0;
  const overAlert = !!summary?.alertAmount && summary.totalOut > summary.alertAmount;
  const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>{monthLabel}</Text>
        {currencies.length > 1 && (
          <View style={styles.currencyPicker}>
            <Picker
              selectedValue={selectedCurrency}
              onValueChange={setSelectedCurrency}
              dropdownIconColor={colors.text}
              style={styles.picker}
            >
              {currencies.map((currency) => (
                <Picker.Item key={currency} label={`${currency} wallet`} value={currency} />
              ))}
            </Picker>
          </View>
        )}

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
          </View>
        )}
        {loading && <Text style={styles.meta}>Crunching this month's activity…</Text>}

        {summary && (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Balance vs. spent this month</Text>
              <View style={styles.chartRow}>
                <DonutChart
                  centerValue={formatMoney(summary.balance, summary.currency)}
                  centerLabel="In your account"
                  segments={[
                    { value: summary.totalOut, color: colors.chartSeries[0] },
                    { value: summary.balance, color: colors.chartSeries[2] },
                  ]}
                />
                <ChartLegend
                  segments={[
                    { label: 'Spent this month', color: colors.chartSeries[0], valueLabel: formatMoney(summary.totalOut, summary.currency) },
                    { label: 'In your account', color: colors.chartSeries[2], valueLabel: formatMoney(summary.balance, summary.currency) },
                    { label: 'Received this month', color: colors.chartSeries[1], valueLabel: formatMoney(summary.totalIn, summary.currency) },
                  ]}
                />
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Where this month's spend went</Text>
              {summary.totalOut > 0 ? (
                <View style={styles.chartRow}>
                  <DonutChart
                    centerValue={formatMoney(summary.totalOut, summary.currency)}
                    centerLabel="Total spent"
                    segments={[
                      { value: summary.directSpend, color: colors.chartSeries[0] },
                      { value: summary.requestSpend, color: colors.chartSeries[1] },
                    ]}
                  />
                  <ChartLegend
                    segments={[
                      { label: 'Direct transfers', color: colors.chartSeries[0], valueLabel: formatMoney(summary.directSpend, summary.currency) },
                      { label: 'Requests & QR payments', color: colors.chartSeries[1], valueLabel: formatMoney(summary.requestSpend, summary.currency) },
                    ]}
                  />
                </View>
              ) : (
                <Text style={styles.meta}>No spending yet this month.</Text>
              )}
              <Text style={styles.footnote}>
                digiwallsys wallet-to-wallet transfers split into "Direct transfers" (Send money) and "Requests & QR payments" (paid requests and scanned codes) — the closest equivalents to card-style in-person vs. online spend in a peer-to-peer wallet.
              </Text>
            </View>

            <View style={styles.lockCard}>
              <View style={styles.lockHeader}>
                <Text style={styles.lockTitle}>Monthly spending alert</Text>
                {overAlert && <View style={styles.overBadge}><Text style={styles.overBadgeText}>Above alert</Text></View>}
              </View>
              {summary.alertAmount ? (
                <>
                  <Text style={styles.lockMeta}>
                    {formatMoney(summary.totalOut, summary.currency)} spent of {formatMoney(summary.alertAmount, summary.currency)} limit
                  </Text>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${alertRatio * 100}%` }, overAlert && styles.fillOver]} />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.lockMeta}>No monthly spending alert set yet.</Text>
                  <TouchableOpacity style={styles.lockLink} onPress={() => navigation.navigate('Notifications')}>
                    <Text style={styles.lockLinkText}>Set a spending alert amount</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <Text style={styles.footnote}>
              Based on {summary.count} transaction{summary.count === 1 ? '' : 's'} since the 1st{summary.capped ? ' (showing the most recent activity only)' : ''}.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function buildStyles(colors, commonStyles) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: screenBackground(colors) },
    content: { padding: 20, paddingBottom: 40, gap: 14, ...contentColumn(layout.page) },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    subtitle: { color: colors.textMuted, marginTop: -8, marginBottom: 4 },
    currencyPicker: { ...commonStyles.picker, paddingHorizontal: 0, overflow: 'hidden' },
    picker: { color: colors.text, minHeight: 48, backgroundColor: 'transparent' },
    meta: { color: colors.textMuted },
    chartCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.lg, padding: 18 },
    cardTitle: { color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 14 },
    chartRow: { alignItems: 'center', gap: 16 },
    lockCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.lg, padding: 18 },
    lockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    lockTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
    overBadge: { backgroundColor: 'rgba(255,107,107,0.18)', borderColor: 'rgba(255,107,107,0.4)', borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
    overBadgeText: { color: colors.danger, fontWeight: '700', fontSize: 11 },
    lockMeta: { color: colors.textMuted, marginTop: 8, fontSize: 12.5 },
    track: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceMuted, marginTop: 12, overflow: 'hidden' },
    fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 5 },
    fillOver: { backgroundColor: colors.danger },
    lockLink: { marginTop: 12 },
    lockLinkText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    footnote: { color: colors.textFaint, fontSize: 11, lineHeight: 16, marginTop: 12 },
    errorBox: { backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', borderRadius: 14, padding: 12 },
    errorText: { color: colors.danger }, retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, retryText: { color: colors.primary, fontWeight: '700' },
  });
}
