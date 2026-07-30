import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  changeCurrentPassword,
  getCurrentUser,
  getSecurityAlerts,
  updateCurrentUser,
} from '../api';
import AmbientBackground from '../components/AmbientBackground';
import GradientButton from '../components/GradientButton';
import ThemedSwitch from '../components/ThemedSwitch';
import { useToast } from '../components/ToastProvider';
import { resetToLogin } from '../navigation';
import { clearSession, isBiometricEnabled, setBiometricEnabled } from '../session';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, radii, screenBackground } from '../theme';
import { MotionSection } from '../motion';
import { getErrorMessage, isValidEmail } from '../utils';

const MIN_PASSWORD_LENGTH = 10;

function initialsFor(name) {
  return String(name || 'DW')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'DW';
}

export default function SecurityScreen({ onAccountUpdated }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const emailChanged = email.trim().toLowerCase() !== originalEmail;
  const initials = initialsFor(name);

  useEffect(() => {
    isBiometricEnabled()
      .then(setEnabled)
      .catch((error) => Alert.alert('Security unavailable', getErrorMessage(error)))
      .finally(() => setBusy(false));
  }, []);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await getCurrentUser();
      setName(response.data.name || '');
      setEmail(response.data.email || '');
      setOriginalEmail(String(response.data.email || '').toLowerCase());
      onAccountUpdated?.(response.data);
    } catch (error) {
      showToast('Profile unavailable', getErrorMessage(error), 'error');
    } finally {
      setProfileLoading(false);
    }
  }, [onAccountUpdated, showToast]);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try { setAlerts((await getSecurityAlerts()).data); }
    catch { setAlerts([]); }
    finally { setAlertsLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    loadProfile();
    loadAlerts();
  }, [loadAlerts, loadProfile]));

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

  async function saveProfile() {
    const nextName = name.trim();
    const nextEmail = email.trim().toLowerCase();
    if (nextName.length < 2 || !isValidEmail(nextEmail)) {
      showToast('Check your profile', 'Enter a valid name and email address.', 'error');
      return;
    }
    if (emailChanged && !emailPassword) {
      showToast('Password required', 'Confirm your current password to change email.', 'error');
      return;
    }
    setProfileBusy(true);
    try {
      const response = await updateCurrentUser(nextName, nextEmail, emailPassword);
      setName(response.data.user.name);
      setEmail(response.data.user.email);
      setOriginalEmail(response.data.user.email.toLowerCase());
      setEmailPassword('');
      onAccountUpdated?.(response.data.user);
      showToast('Profile updated', response.data.message);
    } catch (error) {
      showToast('Profile update failed', getErrorMessage(error), 'error');
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword() {
    if (!currentPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      showToast('Check your password', 'Enter the current password and a new password of at least 10 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'Re-enter the same new password in both fields.', 'error');
      return;
    }
    setPasswordBusy(true);
    try {
      const response = await changeCurrentPassword(currentPassword, newPassword);
      await clearSession();
      onAccountUpdated?.(null);
      showToast('Password changed', response.data.message);
      resetToLogin();
    } catch (error) {
      showToast('Password change failed', getErrorMessage(error), 'error');
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Profile & security</Text>

        <MotionSection style={styles.profileCard} delay={50}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={styles.profileCopy}>
            <Text style={styles.heading}>{name || 'Your profile'}</Text>
            <Text style={styles.description}>Your initials update automatically when your display name changes.</Text>
          </View>
        </MotionSection>

        <Text style={styles.sectionTitle}>Account details</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textFaint}
            autoComplete="name"
            editable={!profileLoading && !profileBusy}
            maxLength={120}
          />
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            editable={!profileLoading && !profileBusy}
            maxLength={255}
          />
          {emailChanged && (
            <>
              <Text style={styles.helper}>Changing email requires your password and verification of the new address.</Text>
              <Text style={styles.label}>Current password</Text>
              <TextInput
                style={styles.input}
                value={emailPassword}
                onChangeText={setEmailPassword}
                placeholder="Confirm current password"
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                autoComplete="current-password"
                editable={!profileBusy}
              />
            </>
          )}
          <GradientButton
            label={profileBusy ? 'Saving…' : 'Save profile'}
            onPress={saveProfile}
            disabled={profileLoading || profileBusy}
            accessibilityLabel="Save profile"
          />
        </View>

        <Text style={styles.sectionTitle}>Change password</Text>
        <View style={styles.formCard}>
          <Text style={styles.helper}>Changing your password signs out every device and revokes all saved sessions.</Text>
          <Text style={styles.label}>Current password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            autoComplete="current-password"
            editable={!passwordBusy}
          />
          <Text style={styles.label}>New password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 10 characters"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            autoComplete="new-password"
            editable={!passwordBusy}
          />
          <Text style={styles.label}>Confirm new password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat new password"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            autoComplete="new-password"
            editable={!passwordBusy}
          />
          <GradientButton
            label={passwordBusy ? 'Changing…' : 'Change password'}
            onPress={savePassword}
            disabled={passwordBusy}
            accessibilityLabel="Change password"
          />
        </View>

        <Text style={styles.sectionTitle}>Device & appearance</Text>
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
            <Text style={styles.description}>Switch between the dark and light Aurora Glass theme.</Text>
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
    content: { padding: 24, paddingBottom: 44, gap: 14, ...contentColumn(layout.form) },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceStrong, borderColor: colors.borderStrong, borderWidth: 1, borderRadius: radii.lg, padding: 16 },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: colors.primary, fontWeight: '900', fontSize: 17 },
    profileCopy: { flex: 1 },
    formCard: { backgroundColor: colors.surface, borderColor: colors.glassBorder, borderWidth: 1, borderRadius: radii.lg, padding: 16, gap: 10 },
    label: { color: colors.text, fontSize: 12.5, fontWeight: '700', marginTop: 2 },
    input: { minHeight: 48, backgroundColor: colors.backgroundElevated, borderColor: colors.glassBorder, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: 14, color: colors.text },
    helper: { color: colors.textMuted, fontSize: 12.5, lineHeight: 19 },
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
