import React, { useEffect, useMemo, useRef, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {
  Alert,
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
import LandingHero from '../components/LandingHero';
import PublicWebFooter, { PUBLIC_FOOTER_HEIGHT } from '../components/PublicWebFooter';
import Wordmark from '../components/Wordmark';
import { loginUser, refreshUserSession, registerUser } from '../api';
import { authenticateBiometric, clearSession, getRefreshToken, isBiometricEnabled, saveSession } from '../session';
import { useAppTheme } from '../ThemeContext';
import { radii, screenBackground } from '../theme';
import { getErrorMessage, isValidEmail } from '../utils';

// Matches the API's registration/reset rule in authController.js.
const MIN_PASSWORD_LENGTH = 10;

export default function LoginScreen({ navigation, onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);
  // Off by default on web: staying signed in across browser restarts is a
  // choice the account holder makes, not something a payments app assumes.
  const [remember, setRemember] = useState(false);
  const { colors, commonStyles } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors, commonStyles), [colors, commonStyles]);
  const emailRef = useRef(null);
  const isWeb = Platform.OS === 'web';
  // Web only: the marketing page and the sign-in form are two states of this
  // screen rather than one long scroll. The form used to sit permanently below
  // the hero, so it peeked into the bottom of the landing viewport and
  // "Get started" merely scrolled to it. Now the landing stands on its own and
  // the form replaces it. Native has no landing at all, so it starts here.
  const [authOpen, setAuthOpen] = useState(!isWeb);
  const showLanding = isWeb && !authOpen;

  useEffect(() => {
    if (!authOpen || !isWeb) return;
    // The visitor may have scrolled down the landing before pressing
    // "Get started"; the form that replaces it must start from the top.
    if (typeof document !== 'undefined') {
      (document.scrollingElement || document.documentElement).scrollTo({ top: 0 });
    }
    // Hand off straight into typing rather than leaving the click as the only
    // thing that happened.
    emailRef.current?.focus();
  }, [authOpen, isWeb]);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const biometricEnabled = await isBiometricEnabled();
        if (active) setBiometricAvailable(biometricEnabled);
        if (await getRefreshToken() && !biometricEnabled) {
          if (active) {
            const current = await refreshUserSession();
            onAuthenticated?.(current.user);
            navigation.replace('Home');
          }
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
        await saveSession(response.data, { remember: isWeb ? remember : true });
        onAuthenticated?.(response.data.user);
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
      onAuthenticated?.(response?.user);
      navigation.replace('Home', { justLoggedIn: true, name: response?.user?.name });
    } catch (error) {
      Alert.alert('Biometric login failed', getErrorMessage(error));
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {showLanding ? <LandingHero onGetStarted={() => setAuthOpen(true)} /> : (
          <View style={styles.formColumn}>
          {isWeb && (
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => { setRegistering(false); setAuthOpen(false); }}
              accessibilityRole="button"
              accessibilityLabel="Back to overview"
            >
              <Text style={styles.backLinkText}>← Back to overview</Text>
            </TouchableOpacity>
          )}
          {/* The hero carries the wordmark on the landing state, so this only
              renders once the form has replaced it -- never both at once. */}
          <View style={styles.brandBlock}>
            <Wordmark size={42} />
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
              ref={emailRef}
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
            {isWeb && !registering && (
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRemember(!remember)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: remember }}
                accessibilityLabel="Keep me signed in on this browser"
              >
                <View style={[styles.checkbox, remember && styles.checkboxOn]}>
                  {remember && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.rememberText}>Keep me signed in on this browser</Text>
              </TouchableOpacity>
            )}
            <GradientButton
              label={restoring ? 'Checking session…' : busy ? 'Please wait…' : registering ? 'Create account' : 'Log in'}
              disabled={busy || restoring}
              onPress={submit}
              style={styles.primary}
            />
            <TouchableOpacity
              style={styles.secondary}
              onPress={() => setRegistering(!registering)}
              accessibilityRole="button"
              accessibilityLabel={registering ? 'Back to login' : 'Create an account'}
            >
              <Text style={styles.secondaryText}>{registering ? 'Back to login' : 'Create an account'}</Text>
            </TouchableOpacity>
            {!registering && (
              <TouchableOpacity
                style={styles.link}
                onPress={() => navigation.navigate('Account Recovery')}
                accessibilityRole="button"
                accessibilityLabel="Verify email or reset password"
              >
                <Text style={styles.linkText}>Verify email or reset password</Text>
              </TouchableOpacity>
            )}
            {biometricAvailable && !registering && (
              <TouchableOpacity
                style={styles.biometric}
                onPress={biometricLogin}
                accessibilityRole="button"
                accessibilityLabel="Use biometric login"
              >
                <Icon name="finger-print-outline" size={22} color={colors.primary} />
                <Text style={styles.linkText}>Use biometric login</Text>
              </TouchableOpacity>
            )}
          </View>
          <AppFooter navigation={navigation} />
          </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <PublicWebFooter navigation={navigation} />
    </SafeAreaView>
  );
}

function buildStyles(colors, commonStyles) {
  const isWeb = Platform.OS === 'web';
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: screenBackground(colors) },
    flex: { flexGrow: 1 },
    // On web, center a fixed-width sign-in card in the viewport instead of
    // stretching the fields edge to edge; on mobile it fills the phone width.
    scroll: {
      flexGrow: 1,
      padding: 24,
      paddingTop: isWeb ? 24 : 48,
      // PublicWebFooter is fixed outside this scroll content, so its own
      // height has to be reserved here or the last section ends up behind it.
      paddingBottom: isWeb ? 24 + PUBLIC_FOOTER_HEIGHT : 24,
      ...(isWeb ? { alignItems: 'center', justifyContent: 'center' } : null),
    },
    formColumn: { width: '100%', maxWidth: isWeb ? 460 : undefined },
    // The wordmark is drawn as gradient text, not artwork: the PNG had its
    // gradient baked in as an opaque rectangle, so it always read as a coloured
    // box sitting on the page. Text also stays sharp at any size and re-reads
    // the palette when the theme is toggled.
    // Without this the marketing page is unreachable again once the form
    // opens: the swap is local state, so browser Back leaves the route too.
    backLink: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', marginBottom: 4 },
    backLinkText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
    brandBlock: { alignItems: 'center', marginBottom: 26 },
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
    rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginBottom: 6 },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    rememberText: { color: colors.textMuted, fontSize: 13, flex: 1 },
    primary: { marginTop: 4 },
    secondary: { minHeight: 48, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.pill, padding: 14, alignItems: 'center', marginTop: 10 },
    secondaryText: { color: colors.text, fontWeight: '700' },
    link: { alignItems: 'center', marginTop: 18 },
    linkText: { color: colors.primary, fontWeight: '600' },
    biometric: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  });
}
