import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Switch, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { isBiometricEnabled, setBiometricEnabled } from '../session';
import { colors } from '../theme';
import { getErrorMessage } from '../utils';

export default function SecurityScreen() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  useEffect(() => { isBiometricEnabled().then(setEnabled).catch((error) => Alert.alert('Security unavailable', getErrorMessage(error))).finally(() => setBusy(false)); }, []);

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
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Security</Text>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.heading}>Biometric login</Text>
          <Text style={styles.description}>Require device biometrics before using the saved refresh session.</Text>
        </View>
        <Switch value={enabled} onValueChange={toggle} disabled={busy} trackColor={{ true: colors.accent }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  title: { fontSize: 26, fontWeight: '800', color: colors.primaryDark, marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16 },
  copy: { flex: 1, paddingRight: 12 },
  heading: { fontSize: 17, fontWeight: '700', color: colors.text },
  description: { color: colors.textMuted, marginTop: 4, lineHeight: 20 },
});
