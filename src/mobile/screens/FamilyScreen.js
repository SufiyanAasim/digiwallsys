import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import TouchableOpacity from '../components/TouchableOpacity';
import { addFamilyMember, getFamilyMembers, getSharedWallets, removeFamilyMember } from '../api';
import AmbientBackground from '../components/AmbientBackground';
import { useConfirm } from '../components/ConfirmProvider';
import GradientButton from '../components/GradientButton';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, radii, screenBackground } from '../theme';
import { formatMoney, getErrorMessage, isValidEmail, parsePositiveAmount } from '../utils';

export default function FamilyScreen() {
  const [members, setMembers] = useState([]);
  const [sharedWallets, setSharedWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [email, setEmail] = useState('');
  const [limit, setLimit] = useState('');
  const { colors, commonStyles } = useAppTheme();
  const confirm = useConfirm();
  const styles = useMemo(() => buildStyles(colors, commonStyles), [colors, commonStyles]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [memberResponse, sharedResponse] = await Promise.all([getFamilyMembers(), getSharedWallets()]);
      setMembers(memberResponse.data);
      setSharedWallets(sharedResponse.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Family wallet details could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function invite() {
    if (!isValidEmail(email)) {
      Alert.alert('Invalid email', 'Enter the digiwallsys account email of the person to add.');
      return;
    }
    const spendingLimit = limit.trim() ? parsePositiveAmount(limit) : null;
    if (limit.trim() && spendingLimit === null) {
      Alert.alert('Invalid limit', 'Enter a positive monthly spending limit, or leave it blank for no limit.');
      return;
    }
    setBusy('invite');
    try {
      await addFamilyMember(email.trim().toLowerCase(), spendingLimit);
      setEmail(''); setLimit('');
      await load();
    } catch (inviteError) { Alert.alert('Could not add member', getErrorMessage(inviteError)); }
    finally { setBusy(''); }
  }

  async function remove(userId) {
    const member = members.find((m) => m.userid === userId);
    const ok = await confirm({
      title: 'Remove this member?',
      message: `${member?.name || 'This member'} will no longer be able to spend from your wallet.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    setBusy(`remove-${userId}`);
    try { await removeFamilyMember(userId); await load(); }
    catch (removeError) { Alert.alert('Could not remove member', getErrorMessage(removeError)); }
    finally { setBusy(''); }
  }

  const otherMembers = members.filter((m) => m.role !== 'owner');

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Family wallet</Text>
        <Text style={styles.subtitle}>Share your USD wallet with people you trust, with an optional monthly limit.</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
          </View>
        )}
        {loading && <Text style={styles.meta}>Loading…</Text>}

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Add a member</Text>
          <Text style={styles.hint}>They must already have a digiwallsys account. Only the wallet owner can add members.</Text>
          <TextInput style={styles.input} placeholder="Their account email" placeholderTextColor={colors.textFaint} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Monthly spending limit (optional)" placeholderTextColor={colors.textFaint} keyboardType="decimal-pad" value={limit} onChangeText={setLimit} />
          <GradientButton label={busy === 'invite' ? 'Adding…' : 'Add member'} disabled={busy === 'invite'} onPress={invite} />
        </View>

        <Text style={styles.heading}>Members of your wallet</Text>
        {!loading && otherMembers.length === 0 && <Text style={styles.meta}>Just you so far.</Text>}
        {otherMembers.map((member) => (
          <View key={member.userid} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardRowTitle}>{member.name}</Text>
              <TouchableOpacity disabled={!!busy} onPress={() => remove(member.userid)}>
                <Text style={styles.removeLink}>{busy === `remove-${member.userid}` ? 'Removing…' : 'Remove'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.meta}>{member.email}</Text>
            <Text style={styles.meta}>
              {member.spending_limit ? `Monthly limit: ${formatMoney(member.spending_limit)}` : 'No spending limit'}
            </Text>
          </View>
        ))}

        <Text style={styles.heading}>Wallets shared with you</Text>
        {!loading && sharedWallets.length === 0 && <Text style={styles.meta}>No one has added you to their wallet.</Text>}
        {sharedWallets.map((wallet) => (
          <View key={`${wallet.walletid}`} style={styles.card}>
            <Text style={styles.cardRowTitle}>{wallet.owner_name}'s wallet</Text>
            <Text style={styles.meta}>{formatMoney(wallet.balance, wallet.currency)} available</Text>
            <Text style={styles.meta}>{wallet.spending_limit ? `Your monthly limit: ${formatMoney(wallet.spending_limit, wallet.currency)}` : 'No spending limit set for you'}</Text>
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
    formCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.lg, padding: 18, gap: 10 },
    cardTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
    input: commonStyles.input,
    hint: { color: colors.textFaint, fontSize: 11, lineHeight: 15 },
    heading: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 6 },
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.md, padding: 14, gap: 4 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardRowTitle: { color: colors.text, fontWeight: '700' },
    removeLink: { color: colors.danger, fontWeight: '700', fontSize: 12.5 },
    errorBox: { backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', borderRadius: 14, padding: 12 },
    errorText: { color: colors.danger }, retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, retryText: { color: colors.primary, fontWeight: '700' },
  });
}
