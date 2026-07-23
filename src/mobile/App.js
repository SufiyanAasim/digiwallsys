import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';

import AccountRecoveryScreen from './screens/AccountRecoveryScreen';
import AddMoneyScreen from './screens/AddMoneyScreen';
import AdminScreen from './screens/AdminScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import BudgetsScreen from './screens/BudgetsScreen';
import CreditsScreen from './screens/CreditsScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import LogoutScreen from './screens/LogoutScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import PaymentCalendarScreen from './screens/PaymentCalendarScreen';
import PaymentToolsScreen from './screens/PaymentToolsScreen';
import QrPaymentScreen from './screens/QrPaymentScreen';
import SavingsScreen from './screens/SavingsScreen';
import SecurityScreen from './screens/SecurityScreen';
import SendMoneyScreen from './screens/SendMoneyScreen';
import TransactionHistoryScreen from './screens/TransactionHistoryScreen';
import { getCurrentUser } from './api';
import { useAppTheme, ThemeProvider } from './ThemeContext';

import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import Sidebar from './components/web/Sidebar';

const NativeStack = createNativeStackNavigator();
const JSStack = createStackNavigator();
const navigationRef = createNavigationContainerRef();
const PUBLIC_ROUTES = ['Login', 'Account Recovery'];

function AppShell() {
  const isWeb = Platform.OS === 'web';
  const Stack = isWeb ? JSStack : NativeStack;
  const [activeRoute, setActiveRoute] = useState('Login');
  const [user, setUser] = useState(null);
  const { colors, navigationTheme } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const refreshUser = useCallback(() => {
    getCurrentUser().then((response) => setUser(response.data)).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!PUBLIC_ROUTES.includes(activeRoute)) refreshUser();
    else setUser(null);
  }, [activeRoute, refreshUser]);

  const syncActiveRoute = useCallback(() => {
    setActiveRoute(navigationRef.current?.getCurrentRoute()?.name || 'Login');
  }, []);

  const showSidebar = isWeb && !PUBLIC_ROUTES.includes(activeRoute);

  return (
    <View style={styles.webRoot}>
      {showSidebar && (
        <Sidebar
          activeRoute={activeRoute}
          user={user}
          onNavigate={(route) => navigationRef.current?.isReady() && navigationRef.current.navigate(route)}
        />
      )}
      <View style={styles.webContentArea}>
        <View style={[styles.webContentColumn, !showSidebar && styles.fullWidthColumn]}>
          <NavigationContainer
            ref={navigationRef}
            theme={navigationTheme}
            onReady={syncActiveRoute}
            onStateChange={syncActiveRoute}
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
                  ? { cardStyle: { backgroundColor: colors.background }, animationEnabled: false }
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
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Security" component={SecurityScreen} />
              <Stack.Screen name="Admin" component={AdminScreen} />
              <Stack.Screen name="Credits" component={CreditsScreen} />
              <Stack.Screen name="Logout" component={LogoutScreen} />
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
          <AppShell />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    webRoot: { flex: 1, flexDirection: 'row', backgroundColor: colors.background, minHeight: '100%' },
    webContentArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
    webContentColumn: { flex: 1, width: '100%', maxWidth: 860 },
    fullWidthColumn: { maxWidth: undefined },
  });
}
