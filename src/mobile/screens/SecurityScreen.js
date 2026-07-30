import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import { getSecurityAlerts } from '../api';
import AmbientBackground from '../components/AmbientBackground';
import ThemedSwitch from '../components/ThemedSwitch';
import { isBiometricEnabled, setBiometricEnabled } from '../session';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, radii, screenBackground } from '../theme';
import { getErrorMessage } from '../utils';

export default function SecurityScreen() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const { colors, isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  useEffect(() => { isBiometricEnabled().then(setEnabled).catch((error) => Alert.alert('Security unavailable', getErrorMessage(error))).finally(() => setBusy(false)); }, []);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try { setAlerts((await getSecurityAlerts()).data); }
    catch { setAlerts([]); }
    finally { setAlertsLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadAlerts(); }, [loadAlerts]));

  async function toggle(value) {
    setBusy(true);
    try {
      if (value) {
        const available = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!available || !enrolled) {
          Alert.alert('Biometrics unavailable', 'Configure Face ID, fingerprint, or device biometrics first.');
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable biometric login' });
        if (!result.success) return;
      }
      await setBiometricEnabled(value);
      setEnabled(value);
    } catch (error) {
      Alert.alert('Security update failed', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Security</Text>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.heading}>Biometric login</Text>
            <Text style={styles.description}>Require device biometrics before using the saved refresh session.</Text>
          </View>
          <ThemedSwitch value={enabled} onValueChange={toggle} disabled={busy} />
        </View>

        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.heading}>Appearance</Text>
            <Text style={styles.description}>Switch between the dark and light Ember Glass theme.</Text>
          </View>
          <ThemedSwitch value={isDark} onValueChange={toggleTheme} />
        </View>

        <Text style={styles.sectionTitle}>Account alerts</Text>
        {alertsLoading && <Text style={styles.meta}>Checking for account alerts…</Text>}
        {!alertsLoading && alerts.length === 0 && (
          <Text style={styles.meta}>No unusual activity has been detected on your account.</Text>
        )}
        {alerts.map((alert) => (
          <View key={alert.alertId} style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <View style={[styles.statusBadge, alert.status === 'blocked' && styles.statusBadgeBlocked]}>
                <Text style={styles.statusBadgeText}>{alert.status}</Text>
              </View>
            </View>
            <Text style={styles.meta}>{new Date(alert.createdAt).toLocaleString()} · Risk score {alert.riskScore}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: screenBackground(colors) },
    content: { padding: 24, gap: 14, ...contentColumn(layout.form) },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.glassBorder, borderWidth: 1, borderRadius: radii.lg, padding: 16 },
    copy: { flex: 1, paddingRight: 12 },
    heading: { fontSize: 17, fontWeight: '700', color: colors.text },
    description: { color: colors.textMuted, marginTop: 4, lineHeight: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 6 },
    meta: { color: colors.textMuted, fontSize: 12.5 },
    alertCard: { backgroundColor: 'rgba(255,194,75,0.08)', borderWidth: 1, borderColor: 'rgba(255,194,75,0.3)', borderRadius: radii.md, padding: 14, gap: 6 },
    alertHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    alertMessage: { color: colors.text, fontWeight: '700', flex: 1, fontSize: 13 },
    statusBadge: { backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 3 },
    statusBadgeBlocked: { backgroundColor: 'rgba(255,107,107,0.18)' },
    statusBadgeText: { color: colors.text, fontSize: 10.5, fontWeight: '700', textTransform: 'capitalize' },
  });
}
