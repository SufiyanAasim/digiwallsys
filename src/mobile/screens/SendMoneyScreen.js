import React, { useEffect, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  Alert, ScrollView, StyleSheet, Text, TextInput, View  } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getUsers, sendMoney } from '../api';
import { colors, commonStyles } from '../theme';
import { getErrorMessage, parsePositiveAmount } from '../utils';

export default function SendMoneyScreen({ navigation, route }) {
  const [users, setUsers] = useState([]);
  const [receiverId, setReceiverId] = useState(route.params?.receiverId || '');
  const [amount, setAmount] = useState(route.params?.amount ? String(route.params.amount) : '');
  const [description, setDescription] = useState(route.params?.description || '');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getUsers().then((response) => setUsers(response.data)).catch((error) => {
      Alert.alert('Recipients unavailable', getErrorMessage(error));
    }).finally(() => setLoadingUsers(false));
  }, []);

  async function submit() {
    const parsedAmount = parsePositiveAmount(amount);
    if (!Number.isInteger(Number(receiverId)) || parsedAmount === null) {
      Alert.alert('Check payment details', 'Choose a recipient and enter a positive amount with up to two decimal places.');
      return;
    }
    setBusy(true);
    try {
      const response = await sendMoney(Number(receiverId), parsedAmount, description.trim());
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Send money</Text>
        <Text style={styles.label}>Recipient</Text>
        <Picker selectedValue={receiverId} onValueChange={setReceiverId} style={styles.picker} enabled={!loadingUsers && !busy} accessibilityLabel="Recipient">
          <Picker.Item label={loadingUsers ? 'Loading recipients…' : 'Select recipient'} value="" />
          {users.map((user) => <Picker.Item key={user.userid} label={user.name} value={user.userid} />)}
        </Picker>
        <TextInput style={styles.input} placeholder="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} accessibilityLabel="Payment amount" />
        <TextInput style={styles.input} placeholder="Description (optional)" value={description} onChangeText={setDescription} maxLength={255} accessibilityLabel="Payment description" />
        <TouchableOpacity style={[styles.primary, busy && styles.disabled]} disabled={busy} onPress={submit} accessibilityRole="button"><Text style={styles.primaryText}>{busy ? 'Sending…' : 'Confirm payment'}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Text>Cancel</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: colors.primaryDark, marginBottom: 8 }, label: { fontWeight: '700', color: colors.text },
  picker: { backgroundColor: colors.surface, color: colors.text }, input: commonStyles.input,
  primary: commonStyles.primaryButton, primaryText: commonStyles.primaryButtonText,
  disabled: { backgroundColor: colors.disabled },
  back: { alignItems: 'center', padding: 12 },
});
