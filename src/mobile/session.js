import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN = 'digiwallsys.accessToken';
const REFRESH_TOKEN = 'digiwallsys.refreshToken';
const USER = 'digiwallsys.user';
const BIOMETRIC = 'digiwallsys.biometricEnabled';

export async function saveSession(session) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN, session.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN, session.refreshToken),
    AsyncStorage.setItem(USER, JSON.stringify(session.user)),
  ]);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN);
}

export async function getStoredUser() {
  const value = await AsyncStorage.getItem(USER);
  return value ? JSON.parse(value) : null;
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN),
    SecureStore.deleteItemAsync(REFRESH_TOKEN),
    AsyncStorage.removeItem(USER),
    AsyncStorage.setItem(BIOMETRIC, 'false'),
  ]);
}

export async function setBiometricEnabled(enabled) {
  await AsyncStorage.setItem(BIOMETRIC, enabled ? 'true' : 'false');
}

export async function isBiometricEnabled() {
  return (await AsyncStorage.getItem(BIOMETRIC)) === 'true';
}

export async function authenticateBiometric() {
  if (!(await isBiometricEnabled())) return false;
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!compatible || !enrolled) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock digiwallsys',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}
