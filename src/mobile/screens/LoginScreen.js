import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { loginUser, refreshUserSession, registerUser } from '../api';
import { authenticateBiometric, clearSession, getRefreshToken, isBiometricEnabled, saveSession } from '../session';
import { colors, commonStyles } from '../theme';
import { getErrorMessage, isValidEmail } from '../utils';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const biometricEnabled = await isBiometricEnabled();
        if (active) setBiometricAvailable(biometricEnabled);
        if (await getRefreshToken() && !biometricEnabled) {
          await refreshUserSession();
          if (active) navigation.replace('Home');
        }
      } catch {
        await clearSession();
      } finally {
        if (active) setRestoring(false);
      }
    }
    restore();
    return () => { active = false; };
  }, [navigation]);

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail) || !password || (registering && !name.trim())) {
      Alert.alert('Missing details', 'Complete all required fields.');
      return;
    }
    if (password.length < 10) {
      Alert.alert('Password too short', 'Use at least 10 characters.');
      return;
    }
    setBusy(true);
    try {
      if (registering) {
        const response = await registerUser(name.trim(), normalizedEmail, password);
        Alert.alert(
          'Account created',
          response.data.verificationToken
            ? `Development verification token: ${response.data.verificationToken}`
            : 'Check your email for the verification link.'
        );
        setRegistering(false);
      } else {
        const response = await loginUser(normalizedEmail, password);
        await saveSession(response.data);
        navigation.replace('Home');
      }
    } catch (error) {
      Alert.alert(registering ? 'Registration failed' : 'Login failed', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function biometricLogin() {
    try {
      if (!(await authenticateBiometric())) return;
      await refreshUserSession();
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Biometric login failed', getErrorMessage(error));
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.flex} keyboardShouldPersistTaps="handled">
          <Image source={require('../assets/login-bg.png')} style={styles.image} accessibilityIgnoresInvertColors />
          <View style={styles.panel}>
            <Image source={require('../assets/digiwallsys-icon.png')} style={styles.logo} accessibilityLabel="digiwallsys logo" />
            <Text style={styles.heading}>digiwallsys</Text>
            <Text style={styles.subheading}>Secure payments, clearly managed.</Text>
            {registering && (
              <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} autoComplete="name" accessibilityLabel="Full name" />
            )}
            <TextInput
              style={styles.input}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoComplete="email"
              accessibilityLabel="Email address"
            />
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password (10+ characters)"
                secureTextEntry={hidden}
                value={password}
                onChangeText={setPassword}
                autoComplete={registering ? 'new-password' : 'current-password'}
                accessibilityLabel="Password"
              />
              <TouchableOpacity onPress={() => setHidden(!hidden)} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} style={styles.iconButton}>
                <Icon name={hidden ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.primary, (busy || restoring) && styles.disabled]} disabled={busy || restoring} onPress={submit} accessibilityRole="button">
              <Text style={styles.primaryText}>{restoring ? 'Checking session…' : busy ? 'Please wait…' : registering ? 'Create account' : 'Log in'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => setRegistering(!registering)}>
              <Text>{registering ? 'Back to login' : 'Create an account'}</Text>
            </TouchableOpacity>
            {!registering && (
              <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Account Recovery')}>
                <Text style={styles.linkText}>Verify email or reset password</Text>
              </TouchableOpacity>
            )}
            {biometricAvailable && !registering && (
              <TouchableOpacity style={styles.biometric} onPress={biometricLogin}>
                <Icon name="finger-print-outline" size={24} color={colors.primary} />
                <Text style={styles.linkText}>Use biometric login</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primaryDark },
  flex: { flexGrow: 1 },
  image: { width: '100%', height: 260 },
  panel: { flex: 1, marginTop: -28, padding: 24, backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 12 },
  heading: { fontSize: 29, fontWeight: '800', color: colors.primaryDark },
  subheading: { color: colors.textMuted, marginTop: 3, marginBottom: 24 },
  input: { ...commonStyles.input, marginBottom: 14 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingLeft: 15, marginBottom: 14 },
  passwordInput: { flex: 1, paddingVertical: 15 },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  primary: commonStyles.primaryButton,
  primaryText: commonStyles.primaryButtonText,
  disabled: { backgroundColor: colors.disabled },
  secondary: { minHeight: 48, backgroundColor: colors.surfaceMuted, borderRadius: 24, padding: 14, alignItems: 'center', marginTop: 10 },
  link: { alignItems: 'center', marginTop: 18 },
  linkText: { color: colors.primary, fontWeight: '600' },
  biometric: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 18 },
});
