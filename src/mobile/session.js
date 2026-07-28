import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN = 'digiwallsys.accessToken';
const REFRESH_TOKEN = 'digiwallsys.refreshToken';
const USER = 'digiwallsys.user';
const BIOMETRIC = 'digiwallsys.biometricEnabled';
const REMEMBER = 'digiwallsys.remember';

const isWeb = Platform.OS === 'web';

// Web token storage is deliberately split. sessionStorage is emptied when the
// tab closes, so the default is that a browser cannot silently resume someone
// else's wallet later — a reload during the same visit still works, which is
// what the access-token refresh needs. localStorage is used only when the
// person ticks "keep me signed in", making the trade-off theirs to make.
// Native is unaffected: it keeps SecureStore, backed by biometric unlock.
function webStore(remember) {
  return remember ? window.localStorage : window.sessionStorage;
}

async function setStoreItem(key, value, remember) {
  if (isWeb) {
    webStore(remember).setItem(key, value);
    // Never leave the same key behind in the other store, or a stale token
    // could outlive the choice that was just made.
    webStore(!remember).removeItem(key);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getStoreItem(key) {
  if (isWeb) {
    return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteStoreItem(key) {
  if (isWeb) {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

// The choice has to outlive the sign-in call: api.js re-saves on every silent
// token refresh, and without a remembered flag each refresh would quietly move
// the tokens back to sessionStorage and sign the person out at the next launch.
function rememberedChoice() {
  if (!isWeb) return true;
  return window.localStorage.getItem(REMEMBER) === 'true';
}

export async function saveSession(session, { remember } = {}) {
  if (isWeb && remember !== undefined) {
    window.localStorage.setItem(REMEMBER, remember ? 'true' : 'false');
  }
  const persist = remember ?? rememberedChoice();
  await Promise.all([
    setStoreItem(ACCESS_TOKEN, session.accessToken, persist),
    setStoreItem(REFRESH_TOKEN, session.refreshToken, persist),
    AsyncStorage.setItem(USER, JSON.stringify(session.user)),
  ]);
}

export async function getAccessToken() {
  return getStoreItem(ACCESS_TOKEN);
}

export async function getRefreshToken() {
  return getStoreItem(REFRESH_TOKEN);
}

export async function getStoredUser() {
  const value = await AsyncStorage.getItem(USER);
  return value ? JSON.parse(value) : null;
}

export async function clearSession() {
  // Drop the remember flag too: it belongs to the person who just signed out,
  // and leaving it set would apply their choice to whoever signs in next.
  if (isWeb) window.localStorage.removeItem(REMEMBER);
  await Promise.all([
    deleteStoreItem(ACCESS_TOKEN),
    deleteStoreItem(REFRESH_TOKEN),
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
