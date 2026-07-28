import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import TouchableOpacity from '../components/TouchableOpacity';
import { addCurrencyWallet, convertCurrency, getConversions, getWallets } from '../api';
import AmbientBackground from '../components/AmbientBackground';
import GradientButton from '../components/GradientButton';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, radii, screenBackground } from '../theme';
import { formatMoney, getErrorMessage, parsePositiveAmount } from '../utils';

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'INR', 'PKR'];

export default function WalletsScreen() {
  const [wallets, setWallets] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [newCurrency, setNewCurrency] = useState('EUR');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [amount, setAmount] = useState('');
  const { colors, commonStyles } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors, commonStyles), [colors, commonStyles]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [walletResponse, conversionResponse] = await Promise.all([getWallets(), getConversions()]);
      setWallets(walletResponse.data);
      setConversions(conversionResponse.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Wallets could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function createWallet() {
    setBusy('create');
    try {
      await addCurrencyWallet(newCurrency);
      await load();
    } catch (createError) { Alert.alert('Could not add wallet', getErrorMessage(createError)); }
    finally { setBusy(''); }
  }

  async function convert() {
    const parsedAmount = parsePositiveAmount(amount);
    if (parsedAmount === null || fromCurrency === toCurrency) {
      Alert.alert('Check conversion details', 'Choose two different currencies and a positive amount.');
      return;
    }
    setBusy('convert');
    try {
      await convertCurrency(fromCurrency, toCurrency, parsedAmount);
      setAmount('');
      await load();
    } catch (convertError) { Alert.alert('Conversion failed', getErrorMessage(convertError)); }
    finally { setBusy(''); }
  }

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Wallets</Text>
        <Text style={styles.subtitle}>Hold more than one currency and convert between your own wallets.</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
          </View>
        )}
        {loading && <Text style={styles.meta}>Loading wallets…</Text>}

        <View style={styles.walletRow}>
          {wallets.map((wallet) => (
            <View key={wallet.walletid} style={styles.walletCard}>
              <Text style={styles.walletCurrency}>{wallet.currency}</Text>
              <Text style={styles.walletBalance}>{formatMoney(wallet.balance, wallet.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Add a currency</Text>
          <Picker selectedValue={newCurrency} onValueChange={setNewCurrency} style={styles.picker}>
            {COMMON_CURRENCIES.map((code) => <Picker.Item key={code} label={code} value={code} />)}
          </Picker>
          <GradientButton label={busy === 'create' ? 'Adding…' : 'Add wallet'} disabled={busy === 'create'} onPress={createWallet} />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Convert between your wallets</Text>
          <Text style={styles.label}>From</Text>
          <Picker selectedValue={fromCurrency} onValueChange={setFromCurrency} style={styles.picker}>
            {wallets.map((w) => <Picker.Item key={w.walletid} label={`${w.currency} (${formatMoney(w.balance, w.currency)})`} value={w.currency} />)}
          </Picker>
          <Text style={styles.label}>To</Text>
          <Picker selectedValue={toCurrency} onValueChange={setToCurrency} style={styles.picker}>
            {COMMON_CURRENCIES.map((code) => <Picker.Item key={code} label={code} value={code} />)}
          </Picker>
          <TextInput style={styles.input} placeholder="Amount" placeholderTextColor={colors.textFaint} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
          <GradientButton label={busy === 'convert' ? 'Converting…' : 'Convert'} disabled={busy === 'convert'} onPress={convert} />
          <Text style={styles.hint}>Uses the exchange rate an administrator has set. If none is set for this pair, conversion is unavailable.</Text>
        </View>

        <Text style={styles.heading}>Recent conversions</Text>
        {!loading && conversions.length === 0 && <Text style={styles.meta}>No conversions yet.</Text>}
        {conversions.map((item) => (
          <View key={item.conversionid} style={styles.card}>
            <Text style={styles.cardRowTitle}>
              {formatMoney(item.from_amount, item.from_currency)} → {formatMoney(item.to_amount, item.to_currency)}
            </Text>
            <Text style={styles.meta}>Rate {Number(item.rate).toFixed(4)} · {new Date(item.created_at).toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function buildStyles(colors, commonStyles) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: screenBackground(colors) },
    content: { padding: 20, paddingBottom: 40, gap: 14, ...contentColumn(layout.form) },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    subtitle: { color: colors.textMuted, marginTop: -8, marginBottom: 4 },
    meta: { color: colors.textMuted },
    walletRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    walletCard: { flexBasis: '31%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.md, padding: 14 },
    walletCurrency: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    walletBalance: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 4 },
    formCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.lg, padding: 18, gap: 10 },
    cardTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
    label: { color: colors.textMuted, fontWeight: '600', fontSize: 12 },
    picker: { backgroundColor: colors.surfaceMuted, color: colors.text },
    input: commonStyles.input,
    hint: { color: colors.textFaint, fontSize: 11, lineHeight: 15 },
    heading: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 6 },
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.md, padding: 14, gap: 4 },
    cardRowTitle: { color: colors.text, fontWeight: '700' },
    errorBox: { backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', borderRadius: 14, padding: 12 },
    errorText: { color: colors.danger }, retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, retryText: { color: colors.primary, fontWeight: '700' },
  });
}
