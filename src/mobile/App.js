import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AccountRecoveryScreen from './screens/AccountRecoveryScreen';
import AddMoneyScreen from './screens/AddMoneyScreen';
import AdminScreen from './screens/AdminScreen';
import CreditsScreen from './screens/CreditsScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import LogoutScreen from './screens/LogoutScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import PaymentToolsScreen from './screens/PaymentToolsScreen';
import QrPaymentScreen from './screens/QrPaymentScreen';
import SecurityScreen from './screens/SecurityScreen';
import SendMoneyScreen from './screens/SendMoneyScreen';
import TransactionHistoryScreen from './screens/TransactionHistoryScreen';
import { colors, navigationTheme } from './theme';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primaryDark,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Account Recovery" component={AccountRecoveryScreen} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Add Money" component={AddMoneyScreen} />
        <Stack.Screen name="Send Money" component={SendMoneyScreen} />
        <Stack.Screen name="Transactions" component={TransactionHistoryScreen} />
        <Stack.Screen name="Payment Tools" component={PaymentToolsScreen} />
        <Stack.Screen name="QR Payment" component={QrPaymentScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Security" component={SecurityScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="Credits" component={CreditsScreen} />
        <Stack.Screen name="Logout" component={LogoutScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
