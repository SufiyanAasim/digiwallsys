import React, { useEffect, useMemo, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

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
  View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import AmbientBackground from '../components/AmbientBackground';
import AppFooter from '../components/AppFooter';
import GradientButton from '../components/GradientButton';
import { loginUser, refreshUserSession, registerUser } from '../api';
import { authenticateBiometric, clearSession, getRefreshToken, isBiometricEnabled, saveSession } from '../session';
import { useAppTheme } from '../ThemeContext';
import { radii } from '../theme';
import { getErrorMessage, isValidEmail } from '../utils';

// Matches the API's registration/reset rule in authController.js.
const MIN_PASSWORD_LENGTH = 10;

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const { colors, commonStyles } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors, commonStyles), [colors, commonStyles]);

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

  const [errorMsg, setErrorMsg] = useState('');

  async function submit() {
    setErrorMsg('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail) || !password || (registering && !name.trim())) {
      setErrorMsg('Please enter a valid email and password.');
      Alert.alert('Missing details', 'Complete all required fields.');
      return;
    }
    // Only enforce a length on sign-up: the API requires 10+ there, but existing
    // accounts may predate that rule, so login must not lock them out client-side.
    if (registering && password.length < MIN_PASSWORD_LENGTH) {
      const msg = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      setErrorMsg(msg);
      Alert.alert('Password too short', msg);
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
        navigation.replace('Home', { justLoggedIn: true, name: response.data.user?.name });
      }
    } catch (error) {
      const msg = getErrorMessage(error);
      setErrorMsg(msg);
      Alert.alert(registering ? 'Registration failed' : 'Login failed', msg);
    } finally {
      setBusy(false);
    }
  }

  async function biometricLogin() {
    try {
      if (!(await authenticateBiometric())) return;
      const response = await refreshUserSession();
      navigation.replace('Home', { justLoggedIn: true, name: response?.data?.user?.name });
    } catch (error) {
      Alert.alert('Biometric login failed', getErrorMessage(error));
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.formColumn}>
          <View style={styles.brandBlock}>
            <Image
              source={require('../assets/wordmark.png')}
              style={styles.wordmarkImage}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="digiwallsys"
            />
            <Text style={styles.subheading}>Secure payments, clearly managed.</Text>
          </View>
          <View style={styles.panel}>
            {Boolean(errorMsg) && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
            {registering && (
              <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={colors.textFaint} value={name} onChangeText={setName} autoComplete="name" accessibilityLabel="Full name" />
            )}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textFaint}
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
                placeholderTextColor={colors.textFaint}
                secureTextEntry={hidden}
                value={password}
                onChangeText={setPassword}
                autoComplete={registering ? 'new-password' : 'current-password'}
                accessibilityLabel="Password"
              />
              <TouchableOpacity onPress={() => setHidden(!hidden)} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} style={styles.iconButton}>
                <Icon name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <GradientButton
              label={restoring ? 'Checking session…' : busy ? 'Please wait…' : registering ? 'Create account' : 'Log in'}
              disabled={busy || restoring}
              onPress={submit}
              style={styles.primary}
            />
            <TouchableOpacity style={styles.secondary} onPress={() => setRegistering(!registering)}>
              <Text style={styles.secondaryText}>{registering ? 'Back to login' : 'Create an account'}</Text>
            </TouchableOpacity>
            {!registering && (
              <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Account Recovery')}>
                <Text style={styles.linkText}>Verify email or reset password</Text>
              </TouchableOpacity>
            )}
            {biometricAvailable && !registering && (
              <TouchableOpacity style={styles.biometric} onPress={biometricLogin}>
                <Icon name="finger-print-outline" size={22} color={colors.primary} />
                <Text style={styles.linkText}>Use biometric login</Text>
              </TouchableOpacity>
            )}
          </View>
          <AppFooter navigation={navigation} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function buildStyles(colors, commonStyles) {
  const isWeb = Platform.OS === 'web';
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    flex: { flexGrow: 1 },
    // On web, center a fixed-width sign-in card in the viewport instead of
    // stretching the fields edge to edge; on mobile it fills the phone width.
    scroll: {
      flexGrow: 1,
      padding: 24,
      paddingTop: isWeb ? 24 : 48,
      ...(isWeb ? { alignItems: 'center', justifyContent: 'center' } : null),
    },
    formColumn: { width: '100%', maxWidth: isWeb ? 460 : undefined },
    brandBlock: { alignItems: 'center', marginBottom: 26 },
    // Source art is 2172x724 (exactly 3:1). An explicit height keeps that ratio:
    // react-native-web's Image ignores aspectRatio here and falls back to the
    // intrinsic height. resizeMode="contain" letterboxes safely on narrow phones.
    wordmarkImage: { width: '100%', maxWidth: 300, height: 100, borderRadius: radii.md },
    subheading: { color: colors.textMuted, marginTop: 10, fontSize: 12.5, textAlign: 'center' },
    panel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.xl,
      padding: 22,
    },
    errorBox: { backgroundColor: 'rgba(255,107,107,0.14)', borderColor: 'rgba(255,107,107,0.35)', borderWidth: 1, borderRadius: radii.md, padding: 12, marginBottom: 16 },
    errorText: { color: colors.danger, fontSize: 14, textAlign: 'center', fontWeight: '600' },
    input: { ...commonStyles.input, marginBottom: 14 },
    passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.glassBorder, borderWidth: 1, borderRadius: radii.md, paddingLeft: 16, marginBottom: 14 },
    passwordInput: { flex: 1, paddingVertical: 15, color: colors.text },
    iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    primary: { marginTop: 4 },
    secondary: { minHeight: 48, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.pill, padding: 14, alignItems: 'center', marginTop: 10 },
    secondaryText: { color: colors.text, fontWeight: '700' },
    link: { alignItems: 'center', marginTop: 18 },
    linkText: { color: colors.primary, fontWeight: '600' },
    biometric: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  });
}
