import { useMemo, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  Alert, ScrollView, StyleSheet, Text, TextInput, View  } from 'react-native';
import { forgotPassword, resendVerification, resetPassword, verifyEmail } from '../api';
import AmbientBackground from '../components/AmbientBackground';
import GradientButton from '../components/GradientButton';
import Wordmark from '../components/Wordmark';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, screenBackground } from '../theme';
import { getErrorMessage, isValidEmail } from '../utils';

export default function AccountRecoveryScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState('');
  const { colors, commonStyles } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors, commonStyles), [colors, commonStyles]);

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
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandBlock}>
          <Wordmark size={30} />
        </View>
        <Text style={styles.title}>Account security</Text>
        <Text style={styles.help}>Use your account email to request a token, then paste that token below.</Text>
        <TextInput style={styles.input} placeholder="Account email" placeholderTextColor={colors.textFaint} autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} accessibilityLabel="Account email" />
        <TouchableOpacity style={styles.secondary} disabled={!!busy} onPress={() => run('forgot')}><Text style={styles.secondaryText}>{busy === 'forgot' ? 'Sending…' : 'Send password-reset email'}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondary} disabled={!!busy} onPress={() => run('resend')}><Text style={styles.secondaryText}>{busy === 'resend' ? 'Sending…' : 'Resend verification email'}</Text></TouchableOpacity>
        <TextInput style={styles.input} placeholder="Verification or reset token" placeholderTextColor={colors.textFaint} value={token} onChangeText={setToken} />
        <TouchableOpacity style={styles.secondary} disabled={!!busy} onPress={() => run('verify')}><Text style={styles.secondaryText}>{busy === 'verify' ? 'Verifying…' : 'Verify email'}</Text></TouchableOpacity>
        <TextInput style={styles.input} placeholder="New password (10+ characters)" placeholderTextColor={colors.textFaint} secureTextEntry value={password} onChangeText={setPassword} />
        <GradientButton label={busy === 'reset' ? 'Resetting…' : 'Reset password'} disabled={!!busy} onPress={() => run('reset')} />
        <TouchableOpacity style={styles.link} onPress={() => navigation.goBack()}><Text style={styles.linkText}>Back</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function buildStyles(colors, commonStyles) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: screenBackground(colors) },
    content: { padding: 24, gap: 14, ...contentColumn(layout.form) },
    // Source art is 2172x724 (exactly 3:1); the wrapper View holds the ratio.
    brandBlock: { alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    help: { color: colors.textMuted, lineHeight: 20, marginBottom: 6 },
    input: commonStyles.input,
    secondary: { minHeight: 48, justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 22, padding: 14, alignItems: 'center' },
    secondaryText: { color: colors.text, fontWeight: '600' },
    link: { alignItems: 'center', padding: 12 }, linkText: { color: colors.primary, fontWeight: '600' },
  });
}
