import React, { useEffect, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  Alert, ScrollView, StyleSheet, Text, TextInput, View  } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getBudgetCategories, getUsers, sendMoney } from '../api';
import AmbientBackground from '../components/AmbientBackground';
import GradientButton from '../components/GradientButton';
import { colors, commonStyles } from '../theme';
import { getErrorMessage, parsePositiveAmount } from '../utils';

export default function SendMoneyScreen({ navigation, route }) {
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [receiverId, setReceiverId] = useState(route.params?.receiverId || '');
  const [amount, setAmount] = useState(route.params?.amount ? String(route.params.amount) : '');
  const [description, setDescription] = useState(route.params?.description || '');
  const [category, setCategory] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getUsers().then((response) => setUsers(response.data)).catch((error) => {
      Alert.alert('Recipients unavailable', getErrorMessage(error));
    }).finally(() => setLoadingUsers(false));
    getBudgetCategories().then((response) => setCategories(response.data)).catch(() => setCategories([]));
  }, []);

  async function submit() {
    const parsedAmount = parsePositiveAmount(amount);
    if (!Number.isInteger(Number(receiverId)) || parsedAmount === null) {
      Alert.alert('Check payment details', 'Choose a recipient and enter a positive amount with up to two decimal places.');
      return;
    }
    setBusy(true);
    try {
      const response = await sendMoney(Number(receiverId), parsedAmount, description.trim(), category);
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 8 }, label: { fontWeight: '700', color: colors.text },
  picker: { backgroundColor: colors.surface, color: colors.text }, input: commonStyles.input,
  back: { alignItems: 'center', padding: 12 }, backText: { color: colors.textMuted, fontWeight: '600' },
});
