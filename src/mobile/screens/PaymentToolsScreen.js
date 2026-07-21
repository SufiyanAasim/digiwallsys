import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  acceptPaymentRequest,
  cancelSchedule,
  createPaymentRequest,
  createSchedule,
  getCurrentUser,
  getPaymentRequests,
  getSchedules,
  getUsers,
  updatePaymentRequest,
} from '../api';
import { colors, commonStyles } from '../theme';
import { formatMoney, getErrorMessage, parsePositiveAmount, titleize } from '../utils';

export default function PaymentToolsScreen() {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userId, setUserId] = useState('');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [scheduleAmount, setScheduleAmount] = useState('');
  const [scheduleNote, setScheduleNote] = useState('');
  const [nextRunAt, setNextRunAt] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [userResponse, requestResponse, scheduleResponse, currentUserResponse] = await Promise.all([
        getUsers(), getPaymentRequests(), getSchedules(), getCurrentUser(),
      ]);
      setUsers(userResponse.data);
      setRequests(requestResponse.data);
      setSchedules(scheduleResponse.data);
      setCurrentUser(currentUserResponse.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Payment tools could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function act(key, callback, success) {
    setBusy(key);
    try {
      await callback();
      Alert.alert('Success', success);
      await load();
    } catch (actionError) {
      Alert.alert('Action failed', getErrorMessage(actionError));
    } finally {
      setBusy('');
    }
  }

  function requestPayment() {
    const amount = parsePositiveAmount(requestAmount);
    if (!Number.isInteger(Number(userId)) || amount === null) {
      Alert.alert('Check request details', 'Choose a person and enter a positive amount with up to two decimal places.');
      return;
    }
    act('create-request', () => createPaymentRequest(Number(userId), amount, requestNote.trim()), 'Payment request created.');
  }

  function schedulePayment() {
    const amount = parsePositiveAmount(scheduleAmount);
    const date = new Date(nextRunAt);
    if (!Number.isInteger(Number(userId)) || amount === null || Number.isNaN(date.getTime()) || date <= new Date()) {
      Alert.alert('Check schedule details', 'Choose a person, enter a valid amount, and provide a future date and time.');
      return;
    }
    act(
      'create-schedule',
      () => createSchedule({ receiverId: Number(userId), amount, description: scheduleNote.trim(), nextRunAt: date.toISOString(), frequency }),
      'Transfer scheduled.'
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Requests & schedules</Text>
        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.action}>Try again</Text></TouchableOpacity></View>}
        {loading && <Text style={styles.meta}>Loading payment tools…</Text>}

        <Text style={styles.label}>Person</Text>
        <Picker selectedValue={userId} onValueChange={setUserId} style={styles.picker} enabled={!loading && !busy} accessibilityLabel="Person">
          <Picker.Item label={loading ? 'Loading people…' : 'Select person'} value="" />
          {users.map((user) => <Picker.Item key={user.userid} label={user.name} value={user.userid} />)}
        </Picker>

        <Text style={styles.sectionLabel}>Request a payment</Text>
        <TextInput style={styles.input} placeholder="Amount to request" keyboardType="decimal-pad" value={requestAmount} onChangeText={setRequestAmount} />
        <TextInput style={styles.input} placeholder="Request note (optional)" value={requestNote} onChangeText={setRequestNote} maxLength={255} />
        <TouchableOpacity style={[styles.primary, !!busy && styles.disabled]} disabled={!!busy} onPress={requestPayment}>
          <Text style={styles.white}>{busy === 'create-request' ? 'Creating…' : 'Request payment'}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Schedule a transfer</Text>
        <TextInput style={styles.input} placeholder="Transfer amount" keyboardType="decimal-pad" value={scheduleAmount} onChangeText={setScheduleAmount} />
        <TextInput style={styles.input} placeholder="Transfer note (optional)" value={scheduleNote} onChangeText={setScheduleNote} maxLength={255} />
        <TextInput style={styles.input} placeholder="Date and time, e.g. 2026-08-01 10:00" value={nextRunAt} onChangeText={setNextRunAt} />
        <Text style={styles.hint}>The date and time are interpreted in your device timezone.</Text>
        <Picker selectedValue={frequency} onValueChange={setFrequency} style={styles.picker} enabled={!busy}>
          {['once', 'daily', 'weekly', 'monthly'].map((value) => <Picker.Item key={value} label={titleize(value)} value={value} />)}
        </Picker>
        <TouchableOpacity style={[styles.secondary, !!busy && styles.disabled]} disabled={!!busy} onPress={schedulePayment}>
          <Text style={styles.secondaryText}>{busy === 'create-schedule' ? 'Scheduling…' : 'Schedule transfer'}</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Payment requests</Text>
        {!loading && !error && requests.length === 0 && <Text style={styles.meta}>No payment requests yet.</Text>}
        {requests.map((request) => (
          <View key={request.requestid} style={styles.card}>
            <Text style={styles.cardTitle}>{formatMoney(request.amount, request.currency)} · {titleize(request.status)}</Text>
            <Text style={styles.meta}>{request.requester_name} requested from {request.payer_name || 'QR payer'} · {request.note || 'No note'}</Text>
            {request.status === 'pending' && <View style={styles.row}>
              {request.payer_userid === currentUser?.id && <TouchableOpacity disabled={!!busy} onPress={() => act(`pay-${request.requestid}`, () => acceptPaymentRequest(request.requestid), 'Request paid.')}><Text style={styles.action}>Pay</Text></TouchableOpacity>}
              {request.payer_userid === currentUser?.id && <TouchableOpacity disabled={!!busy} onPress={() => act(`decline-${request.requestid}`, () => updatePaymentRequest(request.requestid, 'decline'), 'Request declined.')}><Text style={styles.rowDanger}>Decline</Text></TouchableOpacity>}
              {request.requester_userid === currentUser?.id && <TouchableOpacity disabled={!!busy} onPress={() => act(`cancel-${request.requestid}`, () => updatePaymentRequest(request.requestid, 'cancel'), 'Request cancelled.')}><Text style={styles.rowDanger}>Cancel</Text></TouchableOpacity>}
            </View>}
          </View>
        ))}

        <Text style={styles.heading}>Scheduled transfers</Text>
        {!loading && !error && schedules.length === 0 && <Text style={styles.meta}>No scheduled transfers yet.</Text>}
        {schedules.map((schedule) => (
          <View key={schedule.scheduleid} style={styles.card}>
            <Text style={styles.cardTitle}>{formatMoney(schedule.amount, schedule.currency)} to {schedule.receiver_name}</Text>
            <Text style={styles.meta}>{titleize(schedule.frequency)} · {titleize(schedule.status)} · {new Date(schedule.next_run_at).toLocaleString()}</Text>
            {schedule.status === 'active' && <TouchableOpacity disabled={!!busy} onPress={() => act(`schedule-${schedule.scheduleid}`, () => cancelSchedule(schedule.scheduleid), 'Schedule cancelled.')}><Text style={styles.danger}>Cancel schedule</Text></TouchableOpacity>}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', color: colors.primaryDark }, label: { fontWeight: '700', color: colors.text },
  sectionLabel: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 12 },
  picker: { backgroundColor: colors.surface, color: colors.text }, input: commonStyles.input,
  primary: commonStyles.primaryButton, secondary: { minHeight: 48, justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 20, padding: 14, alignItems: 'center' },
  disabled: { backgroundColor: colors.disabled }, white: commonStyles.primaryButtonText, secondaryText: { color: colors.primaryDark, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 }, heading: { fontSize: 19, fontWeight: '800', color: colors.text, marginTop: 16 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 }, cardTitle: { fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, marginTop: 4, lineHeight: 18 }, row: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 10 },
  action: { color: colors.primary, fontWeight: '700' }, danger: { color: colors.danger, fontWeight: '700', marginTop: 8 }, rowDanger: { color: colors.danger, fontWeight: '700' },
  errorBox: { backgroundColor: '#FCEBEC', borderRadius: 14, padding: 12 }, errorText: { color: colors.danger }, retry: { minHeight: 44, justifyContent: 'center' },
});
