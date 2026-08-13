import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import TouchableOpacity from '../components/TouchableOpacity';
import { createBudgetCategory, deleteBudgetCategory, getBudgetCategories, getWallets } from '../api';
import AmbientBackground from '../components/AmbientBackground';
import { useConfirm } from '../components/ConfirmProvider';
import GradientButton from '../components/GradientButton';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, radii, screenBackground } from '../theme';
import { formatMoney, getErrorMessage, parsePositiveAmount } from '../utils';

export default function BudgetsScreen() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [currencies, setCurrencies] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const { colors, commonStyles } = useAppTheme();
  const confirm = useConfirm();
  const styles = useMemo(() => buildStyles(colors, commonStyles), [colors, commonStyles]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [categoriesResponse, walletsResponse] = await Promise.all([getBudgetCategories(), getWallets()]);
      const availableCurrencies = walletsResponse.data.map((wallet) => wallet.currency);
      setCategories(categoriesResponse.data);
      setCurrencies(availableCurrencies);
      if (!availableCurrencies.includes(currency) && availableCurrencies[0]) setCurrency(availableCurrencies[0]);
    }
    catch (loadError) { setError(getErrorMessage(loadError, 'Budget categories could not be loaded.')); }
    finally { setLoading(false); }
  }, [currency]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function create() {
    const monthlyLimit = parsePositiveAmount(limit);
    if (!name.trim() || monthlyLimit === null) {
      Alert.alert('Check category details', 'Enter a category name and a positive monthly limit.');
      return;
    }
    setBusy('create');
    try {
      await createBudgetCategory(name.trim(), monthlyLimit, currency);
      setName(''); setLimit('');
      await load();
    } catch (createError) { Alert.alert('Could not create category', getErrorMessage(createError)); }
    finally { setBusy(''); }
  }

  async function remove(categoryId) {
    const category = categories.find((c) => c.categoryid === categoryId);
    const ok = await confirm({
      title: 'Delete this category?',
      message: `${category?.name || 'This category'} will be removed. Transactions already tagged with it keep their tag.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setBusy(`delete-${categoryId}`);
    try { await deleteBudgetCategory(categoryId); await load(); }
    catch (deleteError) { Alert.alert('Could not delete category', getErrorMessage(deleteError)); }
    finally { setBusy(''); }
  }

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Budget categories</Text>
        <Text style={styles.subtitle}>Tag transactions by category to track spend against a monthly limit.</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>New category</Text>
          <TextInput style={styles.input} placeholder="Category name (e.g. Groceries)" placeholderTextColor={colors.textFaint} value={name} onChangeText={setName} maxLength={60} />
          <TextInput style={styles.input} placeholder="Monthly limit" placeholderTextColor={colors.textFaint} keyboardType="decimal-pad" value={limit} onChangeText={setLimit} />
          <View style={styles.pickerWrap}>
            <Picker selectedValue={currency} onValueChange={setCurrency} style={styles.picker} dropdownIconColor={colors.text}>
              {currencies.map((item) => <Picker.Item key={item} label={`${item} wallet`} value={item} />)}
            </Picker>
          </View>
          <GradientButton label={busy === 'create' ? 'Creating…' : 'Create category'} disabled={busy === 'create'} onPress={create} />
        </View>

        {loading && <Text style={styles.meta}>Loading budget categories…</Text>}
        {!loading && !error && categories.length === 0 && (
          <Text style={styles.meta}>No categories yet. Tag a transaction from Send money or Transactions once you've created one.</Text>
        )}

        {categories.map((category) => {
          const spent = Number(category.spent_this_month);
          const overLimit = spent > Number(category.monthly_limit);
          const ratio = Math.min(spent / Number(category.monthly_limit), 1);
          return (
            <View key={category.categoryid} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {overLimit && <View style={styles.overBadge}><Text style={styles.overBadgeText}>Over limit</Text></View>}
              </View>
              <Text style={styles.goalMeta}>
                {formatMoney(spent, category.currency)} of {formatMoney(category.monthly_limit, category.currency)} this month
              </Text>
              <View style={styles.track}><View style={[styles.fill, overLimit && styles.fillOver, { width: `${ratio * 100}%` }]} /></View>
              <TouchableOpacity style={styles.deleteLink} disabled={!!busy} onPress={() => remove(category.categoryid)}>
                <Text style={styles.deleteLinkText}>{busy === `delete-${category.categoryid}` ? 'Removing…' : 'Delete category'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
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
    formCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.lg, padding: 18, gap: 12 },
    cardTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
    input: commonStyles.input,
    pickerWrap: { ...commonStyles.picker, paddingHorizontal: 0, overflow: 'hidden' },
    picker: { color: colors.text, minHeight: 48, backgroundColor: 'transparent' },
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.lg, padding: 16, gap: 10 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    categoryName: { color: colors.text, fontWeight: '800', fontSize: 15 },
    overBadge: { backgroundColor: 'rgba(255,107,107,0.18)', borderColor: 'rgba(255,107,107,0.4)', borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
    overBadgeText: { color: colors.danger, fontWeight: '700', fontSize: 11 },
    goalMeta: { color: colors.textMuted, fontSize: 12.5 },
    track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
    fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
    fillOver: { backgroundColor: colors.danger },
    deleteLink: { alignSelf: 'flex-start' },
    deleteLinkText: { color: colors.textFaint, fontSize: 11.5, textDecorationLine: 'underline' },
    errorBox: { backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', borderRadius: 14, padding: 12 },
    errorText: { color: colors.danger }, retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, retryText: { color: colors.primary, fontWeight: '700' },
  });
}
