import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { forgotPassword, resendVerification, resetPassword, verifyEmail } from '../api';
import { colors, commonStyles } from '../theme';
import { getErrorMessage, isValidEmail } from '../utils';

export default function AccountRecoveryScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState('');

  async function run(action) {
    if (['forgot', 'resend'].includes(action) && !isValidEmail(email)) {
      Alert.alert('Invalid email', 'Enter a valid account email address.');
      return;
    }
    if (['reset', 'verify'].includes(action) && !token.trim()) {
      Alert.alert('Token required', 'Enter the token from your email.');
      return;
    }
    if (action === 'reset' && password.length < 10) {
      Alert.alert('Password too short', 'Use at least 10 characters.');
      return;
    }
    setBusy(action);
    try {
      let response;
      if (action === 'forgot') response = await forgotPassword(email.trim().toLowerCase());
      if (action === 'resend') response = await resendVerification(email.trim().toLowerCase());
      if (action === 'reset') response = await resetPassword(token.trim(), password);
      if (action === 'verify') response = await verifyEmail(token.trim());
      const developmentToken = response.data.resetToken || response.data.verificationToken;
      Alert.alert('Success', developmentToken ? `${response.data.message}\nDevelopment token: ${developmentToken}` : response.data.message);
    } catch (error) {
      Alert.alert('Request failed', getErrorMessage(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Account security</Text>
        <Text style={styles.help}>Use your account email to request a token, then paste that token below.</Text>
        <TextInput style={styles.input} placeholder="Account email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} accessibilityLabel="Account email" />
        <TouchableOpacity style={styles.secondary} disabled={!!busy} onPress={() => run('forgot')}><Text>{busy === 'forgot' ? 'Sending…' : 'Send password-reset email'}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondary} disabled={!!busy} onPress={() => run('resend')}><Text>{busy === 'resend' ? 'Sending…' : 'Resend verification email'}</Text></TouchableOpacity>
        <TextInput style={styles.input} placeholder="Verification or reset token" value={token} onChangeText={setToken} />
        <TouchableOpacity style={styles.secondary} disabled={!!busy} onPress={() => run('verify')}><Text>{busy === 'verify' ? 'Verifying…' : 'Verify email'}</Text></TouchableOpacity>
        <TextInput style={styles.input} placeholder="New password (10+ characters)" secureTextEntry value={password} onChangeText={setPassword} />
        <TouchableOpacity style={[styles.primary, !!busy && styles.disabled]} disabled={!!busy} onPress={() => run('reset')}><Text style={styles.primaryText}>{busy === 'reset' ? 'Resetting…' : 'Reset password'}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.goBack()}><Text>Back</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 14 },
  title: { fontSize: 26, fontWeight: '800', color: colors.primaryDark },
  help: { color: colors.textMuted, lineHeight: 20, marginBottom: 6 },
  input: commonStyles.input,
  primary: commonStyles.primaryButton, disabled: { backgroundColor: colors.disabled },
  primaryText: commonStyles.primaryButtonText,
  secondary: { minHeight: 48, justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 22, padding: 14, alignItems: 'center' },
  link: { alignItems: 'center', padding: 12 },
});
