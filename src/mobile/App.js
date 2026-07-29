import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';

import AccountRecoveryScreen from './screens/AccountRecoveryScreen';
import AddMoneyScreen from './screens/AddMoneyScreen';
import AdminScreen from './screens/AdminScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import BudgetsScreen from './screens/BudgetsScreen';
import CreditsScreen from './screens/CreditsScreen';
import FamilyScreen from './screens/FamilyScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import PaymentCalendarScreen from './screens/PaymentCalendarScreen';
import PaymentToolsScreen from './screens/PaymentToolsScreen';
import QrPaymentScreen from './screens/QrPaymentScreen';
import SavingsScreen from './screens/SavingsScreen';
import SecurityScreen from './screens/SecurityScreen';
import SendMoneyScreen from './screens/SendMoneyScreen';
import TransactionHistoryScreen from './screens/TransactionHistoryScreen';
import WalletsScreen from './screens/WalletsScreen';
import { getCurrentUser } from './api';
import { getRefreshToken } from './session';
import { currentRouteName, navigate, navigationRef, resetToLogin } from './navigation';
import { layout } from './theme';
import { useAppTheme, ThemeProvider } from './ThemeContext';

import { AmbientLayer } from './components/AmbientBackground';
import ErrorBoundary from './components/ErrorBoundary';
import { ConfirmProvider } from './components/ConfirmProvider';
import { ToastProvider } from './components/ToastProvider';
import ScrollbarTheme from './components/web/ScrollbarTheme';
import Sidebar from './components/web/Sidebar';

const NativeStack = createNativeStackNavigator();
const JSStack = createStackNavigator();
const PUBLIC_ROUTES = ['Login', 'Account Recovery'];
// Credits needs a session for nothing -- it's static app/version info -- but
// it isn't in PUBLIC_ROUTES because an authenticated visitor reaching it from
// the sidebar should keep that sidebar, unlike the pre-auth screens above.
// Without this exemption, an unauthenticated visitor clicking "Credits" from
// the public sign-in footer got bounced straight back to Login: refreshUser's
// getCurrentUser() 401s with no session, and the redirect below didn't know
// Credits was supposed to be viewable either way.
const NO_REDIRECT_ROUTES = [...PUBLIC_ROUTES, 'Credits'];

// Without this the address bar stays on "/" no matter which screen is open, so
// nothing can be bookmarked or shared, the browser's Back button does nothing,
// and a refresh always dumps you back on Home. Paths are written out rather
// than derived from the route names, so renaming a screen cannot silently
// change a URL somebody has already saved.
const linking = {
  prefixes: [
    'digiwallsys://',
    ...(Platform.OS === 'web' && typeof window !== 'undefined' ? [window.location.origin] : []),
  ],
  config: {
    screens: {
      Home: '',
      Login: 'login',
      'Account Recovery': 'account-recovery',
      Analytics: 'analytics',
      'Add Money': 'add-money',
      'Send Money': 'send-money',
      Transactions: 'transactions',
      'Payment Tools': 'payment-tools',
      'Payment Calendar': 'payment-calendar',
      'QR Payment': 'qr-payment',
      Savings: 'savings',
      Budgets: 'budgets',
      Wallets: 'wallets',
      Family: 'family',
      Notifications: 'notifications',
      Security: 'security',
      Admin: 'admin',
      Credits: 'credits',
    },
  },
};

function AppShell() {
  const isWeb = Platform.OS === 'web';
  const Stack = isWeb ? JSStack : NativeStack;
  const [activeRoute, setActiveRoute] = useState('Login');
  const [user, setUser] = useState(null);
  const { colors, navigationTheme } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const refreshUser = useCallback(() => {
    getCurrentUser()
      .then((response) => setUser(response.data))
      .catch(async () => {
        setUser(null);
        // A URL can now name a protected screen directly, so an unauthenticated
        // visitor could land on one and see nothing but failed requests. Send
        // them to sign in instead.
        //
        // The error shape cannot decide this: when there is no refresh token,
        // the interceptor rejects with a plain Error carrying no `response`, so
        // a status check never matches. Ask the store instead — the interceptor
        // clears the session precisely when a refresh genuinely fails, whereas
        // a network blip leaves the tokens in place and must not sign anyone out.
        //
        // Read the route at the moment of deciding, not a value captured when
        // this callback was created (it never changes, since refreshUser has
        // no dependencies) — the person may have already navigated on by the
        // time this async catch runs.
        if (!(await getRefreshToken()) && !NO_REDIRECT_ROUTES.includes(currentRouteName())) {
          resetToLogin();
        }
      });
  }, []);

  useEffect(() => {
    if (!PUBLIC_ROUTES.includes(activeRoute)) refreshUser();
    else setUser(null);
  }, [activeRoute, refreshUser]);

  const syncActiveRoute = useCallback(() => {
    setActiveRoute(currentRouteName());
  }, []);

  // Credits is reachable without signing in (the public sign-in footer links to
  // it), so the authenticated sidebar must not appear there for a visitor with
  // no session: it offered Send money / Wallets / Log out to someone who isn't
  // signed in, and its 248px column pushed the page off-centre and added its own
  // nav scrollbar. Every other non-public route sits behind the redirect guard,
  // so a sidebar is always correct there.
  const showSidebar = isWeb
    && !PUBLIC_ROUTES.includes(activeRoute)
    && (activeRoute !== 'Credits' || !!user);

  return (
    <View style={styles.webRoot}>
      <ScrollbarTheme />
      {showSidebar && (
        <Sidebar activeRoute={activeRoute} user={user} onNavigate={navigate} />
      )}
      <View style={styles.webContentArea}>
        {isWeb && <AmbientLayer />}
        <View style={[styles.webContentColumn, !showSidebar && styles.fullWidthColumn]}>
          <NavigationContainer
            ref={navigationRef}
            theme={navigationTheme}
            linking={linking}
            onReady={syncActiveRoute}
            onStateChange={syncActiveRoute}
            // Without this the browser tab is just the route name ("Home"),
            // which reads as someone else's page in a crowded tab bar.
            documentTitle={{
              formatter: (options, route) =>
                `digiwallsys · ${options?.title ?? route?.name ?? 'Sign in'}`,
            }}
          >
            <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{
                headerShown: !isWeb,
                headerStyle: { backgroundColor: colors.backgroundElevated },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '700', color: colors.text },
                headerShadowVisible: false,
                ...(isWeb
                  // The card must not paint a background: the shell already
                  // paints the page colour and the ambient gradient behind it,
                  // and an opaque card covered the glow entirely. Transitions
                  // are disabled here, so nothing shows through mid-animation.
                  ? { cardStyle: { backgroundColor: 'transparent' }, animationEnabled: false }
                  : { contentStyle: { backgroundColor: colors.background } }),
              }}
            >
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Account Recovery" component={AccountRecoveryScreen} />
              <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Analytics" component={AnalyticsScreen} />
              <Stack.Screen name="Add Money" component={AddMoneyScreen} />
              <Stack.Screen name="Send Money" component={SendMoneyScreen} />
              <Stack.Screen name="Transactions" component={TransactionHistoryScreen} />
              <Stack.Screen name="Payment Tools" component={PaymentToolsScreen} />
              <Stack.Screen name="Payment Calendar" component={PaymentCalendarScreen} />
              <Stack.Screen name="QR Payment" component={QrPaymentScreen} />
              <Stack.Screen name="Savings" component={SavingsScreen} />
              <Stack.Screen name="Budgets" component={BudgetsScreen} />
              <Stack.Screen name="Wallets" component={WalletsScreen} />
              <Stack.Screen name="Family" component={FamilyScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Security" component={SecurityScreen} />
              <Stack.Screen name="Admin" component={AdminScreen} />
              <Stack.Screen name="Credits" component={CreditsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppShell />
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    webRoot: { flex: 1, flexDirection: 'row', backgroundColor: colors.background, minHeight: '100%' },
    webContentArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
    // Desktop-scale content column: wide enough to use a 24" monitor, capped so
    // dashboards stay readable. The ambient gradient fills the side margins so
    // they read as intentional breathing room, never dead black space.
    webContentColumn: { flex: 1, width: '100%', maxWidth: layout.wide },
    // Auth screens have no sidebar, so they run full-bleed and let the screen's
    // own ambient gradient cover the whole viewport. `maxWidth: undefined` does
    // not reliably override the value above once styles are flattened, so this
    // must be an explicit value.
    fullWidthColumn: { maxWidth: '100%' },
  });
}
