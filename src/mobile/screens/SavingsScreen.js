import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import TouchableOpacity from '../components/TouchableOpacity';
import { archiveSavingsGoal, contributeToSavingsGoal, createSavingsGoal, getSavingsGoals, withdrawFromSavingsGoal } from '../api';
import AmbientBackground from '../components/AmbientBackground';
import { useConfirm } from '../components/ConfirmProvider';
import GradientButton from '../components/GradientButton';
import ThemedSwitch from '../components/ThemedSwitch';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, radii, screenBackground } from '../theme';
import { formatMoney, getErrorMessage, parsePositiveAmount } from '../utils';

export default function SavingsScreen() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [roundUp, setRoundUp] = useState(false);
  const [amounts, setAmounts] = useState({});
  const { colors, commonStyles } = useAppTheme();
  const confirm = useConfirm();
  const styles = useMemo(() => buildStyles(colors, commonStyles), [colors, commonStyles]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setGoals((await getSavingsGoals()).data); }
    catch (loadError) { setError(getErrorMessage(loadError, 'Savings goals could not be loaded.')); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function create() {
    const targetAmount = parsePositiveAmount(target);
    if (!name.trim() || targetAmount === null) {
      Alert.alert('Check goal details', 'Enter a goal name and a positive target amount.');
      return;
    }
    setBusy('create');
    try {
      await createSavingsGoal(name.trim(), targetAmount, roundUp);
      setName(''); setTarget(''); setRoundUp(false);
      await load();
    } catch (createError) { Alert.alert('Could not create goal', getErrorMessage(createError)); }
    finally { setBusy(''); }
  }

  async function adjust(goalId, direction) {
    const amount = parsePositiveAmount(amounts[goalId]);
    if (amount === null) { Alert.alert('Invalid amount', 'Enter a positive amount with up to two decimal places.'); return; }
    setBusy(`${direction}-${goalId}`);
    try {
      if (direction === 'contribute') await contributeToSavingsGoal(goalId, amount);
      else await withdrawFromSavingsGoal(goalId, amount);
      setAmounts({ ...amounts, [goalId]: '' });
      await load();
    } catch (adjustError) { Alert.alert('Action failed', getErrorMessage(adjustError)); }
    finally { setBusy(''); }
  }

  async function archive(goalId) {
    const goal = goals.find((g) => g.goalid === goalId);
    const ok = await confirm({
      title: 'Archive this goal?',
      message: `${goal?.name || 'This goal'} will be hidden and any earmarked amount returns to your available balance.`,
      confirmLabel: 'Archive',
      destructive: true,
    });
    if (!ok) return;
    setBusy(`archive-${goalId}`);
    try { await archiveSavingsGoal(goalId); await load(); }
    catch (archiveError) { Alert.alert('Could not archive goal', getErrorMessage(archiveError)); }
    finally { setBusy(''); }
  }

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Savings goals</Text>
        <Text style={styles.subtitle}>Earmark part of your balance toward something specific.</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>New goal</Text>
          <TextInput style={styles.input} placeholder="Goal name (e.g. New laptop)" placeholderTextColor={colors.textFaint} value={name} onChangeText={setName} maxLength={80} />
          <TextInput style={styles.input} placeholder="Target amount" placeholderTextColor={colors.textFaint} keyboardType="decimal-pad" value={target} onChangeText={setTarget} />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Round up direct transfers into this goal</Text>
            <ThemedSwitch value={roundUp} onValueChange={setRoundUp} />
          </View>
          <GradientButton label={busy === 'create' ? 'Creating…' : 'Create goal'} disabled={busy === 'create'} onPress={create} />
        </View>

        {loading && <Text style={styles.meta}>Loading savings goals…</Text>}
        {!loading && !error && goals.length === 0 && <Text style={styles.meta}>No savings goals yet — create one above.</Text>}

        {goals.map((goal) => {
          const progress = Math.min(Number(goal.current_amount) / Number(goal.target_amount), 1);
          return (
            <View key={goal.goalid} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalName}>{goal.name}</Text>
                {goal.round_up_enabled && <View style={styles.roundUpBadge}><Text style={styles.roundUpBadgeText}>Round-up</Text></View>}
              </View>
              <Text style={styles.goalMeta}>
                {formatMoney(goal.current_amount, goal.currency)} of {formatMoney(goal.target_amount, goal.currency)}
                {goal.status === 'completed' ? ' · Complete 🎉' : ''}
              </Text>
              <View style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%` }]} /></View>
              <View style={styles.goalActions}>
                <TextInput
                  style={styles.goalInput}
                  placeholder="Amount"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  value={amounts[goal.goalid] || ''}
                  onChangeText={(value) => setAmounts({ ...amounts, [goal.goalid]: value })}
                />
                <TouchableOpacity style={styles.smallButton} disabled={!!busy} onPress={() => adjust(goal.goalid, 'contribute')}>
                  <Text style={styles.smallButtonText}>{busy === `contribute-${goal.goalid}` ? '…' : 'Add'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallButtonMuted} disabled={!!busy} onPress={() => adjust(goal.goalid, 'withdraw')}>
                  <Text style={styles.smallButtonMutedText}>{busy === `withdraw-${goal.goalid}` ? '…' : 'Take out'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.archiveLink} disabled={!!busy} onPress={() => archive(goal.goalid)}>
                <Text style={styles.archiveLinkText}>Archive goal</Text>
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
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    switchLabel: { color: colors.textMuted, flex: 1, fontSize: 12.5 },
    goalCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.lg, padding: 16, gap: 10 },
    goalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    goalName: { color: colors.text, fontWeight: '800', fontSize: 15 },
    roundUpBadge: { backgroundColor: colors.accentSoft, borderColor: colors.accent, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2 },
    roundUpBadgeText: { color: colors.accent, fontSize: 10.5, fontWeight: '700' },
    goalMeta: { color: colors.textMuted, fontSize: 12.5 },
    track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
    fill: { height: '100%', backgroundColor: colors.success, borderRadius: 4 },
    goalActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    goalInput: { flex: 1, minHeight: 42, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.sm, paddingHorizontal: 12, color: colors.text },
    smallButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colors.primary, borderRadius: radii.sm },
    smallButtonText: { color: colors.mode === 'light' ? '#FFFFFF' : '#1A0A0E', fontWeight: '800', fontSize: 12.5 },
    smallButtonMuted: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.sm },
    smallButtonMutedText: { color: colors.text, fontWeight: '700', fontSize: 12.5 },
    archiveLink: { alignSelf: 'flex-start' },
    archiveLinkText: { color: colors.textFaint, fontSize: 11.5, textDecorationLine: 'underline' },
    errorBox: { backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', borderRadius: 14, padding: 12 },
    errorText: { color: colors.danger }, retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, retryText: { color: colors.primary, fontWeight: '700' },
  });
}
