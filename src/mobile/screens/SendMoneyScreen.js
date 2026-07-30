import { useEffect, useMemo, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  Alert, ScrollView, StyleSheet, Text, TextInput, View  } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getBudgetCategories, getSharedWallets, getUsers, getWallets, sendMoney } from '../api';
import AmbientBackground from '../components/AmbientBackground';
import GradientButton from '../components/GradientButton';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, screenBackground } from '../theme';
import { formatMoney, getErrorMessage, parsePositiveAmount } from '../utils';

export default function SendMoneyScreen({ navigation, route }) {
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [sharedWallets, setSharedWallets] = useState([]);
  const [receiverId, setReceiverId] = useState(route.params?.receiverId || '');
  const [amount, setAmount] = useState(route.params?.amount ? String(route.params.amount) : '');
  const [description, setDescription] = useState(route.params?.description || '');
  const [category, setCategory] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [fromOwnerId, setFromOwnerId] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [busy, setBusy] = useState(false);
  const { colors, commonStyles } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors, commonStyles), [colors, commonStyles]);

  useEffect(() => {
    getUsers().then((response) => setUsers(response.data)).catch((error) => {
      Alert.alert('Recipients unavailable', getErrorMessage(error));
    }).finally(() => setLoadingUsers(false));
    getBudgetCategories().then((response) => setCategories(response.data)).catch(() => setCategories([]));
    getWallets().then((response) => setWallets(response.data)).catch(() => setWallets([]));
    getSharedWallets().then((response) => setSharedWallets(response.data)).catch(() => setSharedWallets([]));
  }, []);

  useEffect(() => {
    if (fromOwnerId) {
      const shared = sharedWallets.find((w) => String(w.owner_userid) === String(fromOwnerId));
      if (shared) setCurrency(shared.currency);
    }
  }, [fromOwnerId, sharedWallets]);

  async function submit() {
    const parsedAmount = parsePositiveAmount(amount);
    if (!Number.isInteger(Number(receiverId)) || parsedAmount === null) {
      Alert.alert('Check payment details', 'Choose a recipient and enter a positive amount with up to two decimal places.');
      return;
    }
    setBusy(true);
    try {
      const response = await sendMoney(Number(receiverId), parsedAmount, description.trim(), category, {
        currency,
        fromOwnerId: fromOwnerId || undefined,
      });
      Alert.alert('Payment sent', `Reference: ${response.data.transaction.reference}`);
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Payment failed', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Send money</Text>

        {sharedWallets.length > 0 && (
          <>
            <Text style={styles.label}>Spend from</Text>
            <Picker selectedValue={fromOwnerId} onValueChange={setFromOwnerId} style={styles.picker} enabled={!busy}>
              <Picker.Item label="My own wallet" value="" />
              {sharedWallets.map((w) => (
                <Picker.Item key={`${w.owner_userid}-${w.currency}`} label={`${w.owner_name}'s wallet (${formatMoney(w.balance, w.currency)})`} value={w.owner_userid} />
              ))}
            </Picker>
          </>
        )}

        {!fromOwnerId && wallets.length > 1 && (
          <>
            <Text style={styles.label}>Currency</Text>
            <Picker selectedValue={currency} onValueChange={setCurrency} style={styles.picker} enabled={!busy}>
              {wallets.map((w) => <Picker.Item key={w.walletid} label={`${w.currency} (${formatMoney(w.balance, w.currency)})`} value={w.currency} />)}
            </Picker>
          </>
        )}

        <Text style={styles.label}>Recipient</Text>
        <Picker selectedValue={receiverId} onValueChange={setReceiverId} style={styles.picker} enabled={!loadingUsers && !busy} accessibilityLabel="Recipient">
          <Picker.Item label={loadingUsers ? 'Loading recipients…' : 'Select recipient'} value="" />
          {users.map((user) => <Picker.Item key={user.userid} label={user.name} value={user.userid} />)}
        </Picker>
        <TextInput style={styles.input} placeholder="Amount" placeholderTextColor={colors.textFaint} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} accessibilityLabel="Payment amount" />
        <TextInput style={styles.input} placeholder="Description (optional)" placeholderTextColor={colors.textFaint} value={description} onChangeText={setDescription} maxLength={255} accessibilityLabel="Payment description" />
        {categories.length > 0 && (
          <>
            <Text style={styles.label}>Budget category (optional)</Text>
            <Picker selectedValue={category} onValueChange={setCategory} style={styles.picker} enabled={!busy}>
              <Picker.Item label="No category" value="" />
              {categories.map((item) => <Picker.Item key={item.categoryid} label={item.name} value={item.name} />)}
            </Picker>
          </>
        )}
        <GradientButton label={busy ? 'Sending…' : 'Confirm payment'} disabled={busy} onPress={submit} />
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Text style={styles.backText}>Cancel</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function buildStyles(colors, commonStyles) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: screenBackground(colors) }, content: { padding: 24, gap: 12, ...contentColumn(layout.form) },
    title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 8 }, label: { fontWeight: '700', color: colors.text },
    picker: { backgroundColor: colors.surface, color: colors.text, minHeight: 48 }, input: commonStyles.input,
    back: { alignItems: 'center', padding: 12 }, backText: { color: colors.textMuted, fontWeight: '600' },
  });
}
