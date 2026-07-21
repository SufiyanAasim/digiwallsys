import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';

if (Platform.OS === 'web') {
  enableScreens(false);
}

import App from './App';

registerRootComponent(App);
