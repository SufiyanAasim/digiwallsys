import React, { useEffect, useMemo, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View  } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
  getNotificationPreferences,
  getNotifications,
  markNotificationRead,
  registerPushDevice,
  updateNotificationPreferences,
} from '../api';
import AmbientBackground from '../components/AmbientBackground';
import GradientButton from '../components/GradientButton';
import ThemedSwitch from '../components/ThemedSwitch';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, screenBackground } from '../theme';
import { getErrorMessage, parsePositiveAmount } from '../utils';

const preferenceLabels = { moneyMovement: 'Money movement', securityEvents: 'Security events', pushEnabled: 'Push notifications' };

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);
  const [preferences, setPreferences] = useState({ moneyMovement: true, securityEvents: true, pushEnabled: true, spendingAlertAmount: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const { colors, commonStyles } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors, commonStyles), [colors, commonStyles]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [notificationResponse, preferenceResponse] = await Promise.all([getNotifications(), getNotificationPreferences()]);
      setItems(notificationResponse.data);
      const value = preferenceResponse.data;
      setPreferences({
        moneyMovement: value.money_movement,
        securityEvents: value.security_events,
        pushEnabled: value.push_enabled,
        spendingAlertAmount: value.spending_alert_amount || '',
      });
    } catch (loadError) { setError(getErrorMessage(loadError, 'Notifications could not be loaded.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (preferences.spendingAlertAmount !== '' && parsePositiveAmount(preferences.spendingAlertAmount) === null) {
      Alert.alert('Invalid alert amount', 'Enter a positive amount with up to two decimal places, or leave it blank.');
      return;
    }
    setBusy('save');
    try { await updateNotificationPreferences(preferences); Alert.alert('Saved', 'Notification preferences updated.'); }
    catch (error) { Alert.alert('Save failed', getErrorMessage(error)); }
    finally { setBusy(''); }
  }

  async function enablePush() {
    setBusy('push');
    try {
      if (!Device.isDevice) throw new Error('Push registration requires a physical device.');
      const current = await Notifications.getPermissionsAsync();
      const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Notification permission was not granted.');
      if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.DEFAULT });
      const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
      if (!projectId) throw new Error('EXPO_PUBLIC_EAS_PROJECT_ID is not configured.');
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      await registerPushDevice(token.data, Platform.OS);
      Alert.alert('Push enabled', 'This device is registered for alerts.');
    } catch (error) { Alert.alert('Push setup failed', getErrorMessage(error)); }
    finally { setBusy(''); }
  }

  async function readNotification(id) {
    try { await markNotificationRead(id); await load(); }
    catch (readError) { Alert.alert('Unable to update notification', getErrorMessage(readError)); }
  }

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Notifications</Text>
        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retry} onPress={load}><Text style={styles.secondaryText}>Try again</Text></TouchableOpacity></View>}
        {loading && <Text style={styles.meta}>Loading notifications…</Text>}
        {['moneyMovement', 'securityEvents', 'pushEnabled'].map((key) => (
          <View style={styles.row} key={key}><Text style={styles.rowLabel}>{preferenceLabels[key]}</Text><ThemedSwitch value={preferences[key]} onValueChange={(value) => setPreferences({ ...preferences, [key]: value })} /></View>
        ))}
        <TextInput style={styles.input} placeholder="Spending alert amount" placeholderTextColor={colors.textFaint} keyboardType="decimal-pad" value={String(preferences.spendingAlertAmount)} onChangeText={(value) => setPreferences({ ...preferences, spendingAlertAmount: value })} />
        <View style={styles.buttonRow}><GradientButton label={busy === 'save' ? 'Saving…' : 'Save preferences'} disabled={!!busy} onPress={save} /><TouchableOpacity style={styles.secondary} disabled={!!busy} onPress={enablePush}><Text style={styles.secondaryText}>{busy === 'push' ? 'Registering…' : 'Register push'}</Text></TouchableOpacity></View>
        <Text style={styles.heading}>Inbox</Text>
        {!loading && !error && items.length === 0 && <Text style={styles.meta}>You have no notifications yet.</Text>}
        {items.map((item) => (
          <TouchableOpacity key={item.notificationid} style={[styles.card, !item.read_at && styles.unread]} onPress={() => readNotification(item.notificationid)} disabled={!!item.read_at} accessibilityLabel={`${item.title}. ${item.body}${item.read_at ? '' : '. Unread'}`}>
            <Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.meta}>{item.body}</Text><Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function buildStyles(colors, commonStyles) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: screenBackground(colors) }, content: { padding: 20, gap: 10, ...contentColumn(layout.form) },
    title: { fontSize: 25, fontWeight: '800', color: colors.text }, row: { minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12 }, rowLabel: { color: colors.text },
    input: commonStyles.input, buttonRow: { gap: 8 },
    secondary: { minHeight: 48, justifyContent: 'center', backgroundColor: colors.surfaceMuted, padding: 13, borderRadius: 20, alignItems: 'center' }, secondaryText: { color: colors.text, fontWeight: '700' },
    heading: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 14 }, card: { borderRadius: 14, padding: 14, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }, unread: { backgroundColor: colors.surfaceMuted, borderLeftColor: colors.primary, borderLeftWidth: 4 }, cardTitle: { fontWeight: '800', color: colors.text },
    meta: { color: colors.textMuted, marginTop: 4 }, date: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
    errorBox: { backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', borderRadius: 14, padding: 12 }, errorText: { color: colors.danger }, retry: { minHeight: 44, justifyContent: 'center' },
  });
}
