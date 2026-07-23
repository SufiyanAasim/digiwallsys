import React, { useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  Alert, StyleSheet, Text, View  } from 'react-native';
import { logoutUser } from '../api';
import { clearSession } from '../session';
import { colors } from '../theme';

export default function LogoutScreen({ navigation }) {
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try { await logoutUser(); } catch { /* Clear the local session even if the API is unavailable. */ }
    await clearSession();
    navigation.replace('Login');
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.copy}>Logging out revokes the current refresh token and clears secure local tokens.</Text>
      <TouchableOpacity style={[styles.primary, busy && styles.disabled]} disabled={busy} onPress={() => Alert.alert('Log out?', 'Your saved session will be removed.', [{ text: 'Cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }])}>
        <Text style={styles.primaryText}>{busy ? 'Logging out…' : 'Log out'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Text>Back</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 }, title: { fontSize: 26, fontWeight: '800', color: colors.primaryDark },
  copy: { color: colors.textMuted, lineHeight: 21, marginVertical: 18 }, primary: { minHeight: 48, justifyContent: 'center', backgroundColor: colors.danger, borderRadius: 22, padding: 15, alignItems: 'center' }, disabled: { backgroundColor: colors.disabled },
  primaryText: { color: '#fff', fontWeight: '700' }, back: { padding: 16, alignItems: 'center' },
});
